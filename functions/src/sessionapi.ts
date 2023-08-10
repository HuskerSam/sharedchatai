import * as firebaseAdmin from "firebase-admin";
import {
    FieldValue,
} from "firebase-admin/firestore";
import BaseClass from "./baseclass";
import fetch from "node-fetch";
import {
    DiscussServiceClient,
} from "@google-ai/generativelanguage";
import {
    GoogleAuth,
} from "google-auth-library";
import {
    encode,
} from "gpt-3-encoder";

const creditRequestCharge = 1;

/** Match game specific turn logic wrapped in a transaction */
export default class SessionAPI {
    /** http endpoint for user posting message to table chat
   * @param { any } req http request object
   * @param { any } res http response object
   */
    static async submitTicket(req: any, res: any) {
        const authResults = await BaseClass.validateCredentials(req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        const today = new Date().toISOString();
        const yearFrag = today.substring(0, 4);
        const yearMonthFrag = today.substring(0, 7);
        const ymdFrag = today.substring(0, 10);

        const uid = authResults.uid;
        const gameNumber = req.body.gameNumber;
        const reRunticket: any = req.body.reRunTicket;
        let message = req.body.message;
        if (message) {
            if (message.length > 500000) message = message.substr(0, 500000);
        }

        if (!message && !reRunticket) {
            return BaseClass.respondError(res, "Message is empty and no rerunticket id");
        }
        const includeTickets = req.body.includeTickets;

        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const gameQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).get();
        const sessionDocumentData = gameQuery.data();
        if (!sessionDocumentData) {
            return BaseClass.respondError(res, "Game not found");
        }

        const userUsageQuery = await firebaseAdmin.firestore().doc(`Users/${sessionDocumentData.createUser}/internal/tokenUsage`).get();
        let userUsageData: any = userUsageQuery.data();
        if (!userUsageData) userUsageData = {};
        const accountUsageLimit = BaseClass.getNumberOrDefault(userUsageData.currentMonthLimit, 5000);
        let runningTokens: any = userUsageData.runningTokens;
        if (!runningTokens) runningTokens = {};
        const monthlyUsage = BaseClass.getNumberOrDefault(runningTokens["credit_" + yearMonthFrag], 0);

        const userQ = await firebaseAdmin.firestore().doc(`Users/${sessionDocumentData.createUser}`).get();
        const ownerProfile = userQ.data();
        if (!ownerProfile) {
            return BaseClass.respondError(res, "User not found");
        }

        /* eslint-disable camelcase */
        const defaults = BaseClass.defaultChatDocumentOptions();
        const max_tokens = BaseClass.getNumberOrDefault(sessionDocumentData.max_tokens, defaults.max_tokens);
        const chatGptKey = localInstance.privateConfig.chatGPTKey;
        const bardKey = localInstance.privateConfig.googleAIKey;

        const memberImage = sessionDocumentData.memberImages[uid] ? sessionDocumentData.memberImages[uid] : "";
        const memberName = sessionDocumentData.memberNames[uid] ? sessionDocumentData.memberNames[uid] : "";

        let ticketId = "";
        let ticket: any;
        const submitted = new Date().toISOString();
        if (reRunticket) {
            ticketId = reRunticket;
            const ticketQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}/tickets/${reRunticket}`).get();
            ticket = ticketQuery.data();

            if (!ticket) {
                return BaseClass.respondError(res, "Rerun Ticket not found " + reRunticket);
            }

            if (ticket.running) {
                return BaseClass.respondError(res, "Ticket is already running " + reRunticket);
            }

            await firebaseAdmin.firestore().doc(`Games/${gameNumber}/tickets/${reRunticket}`).set({
                uid,
                memberName,
                memberImage,
                submitted,
                max_tokens,
                includeInMessage: true,
                running: true,
            }, {
                merge: true,
            });
            await firebaseAdmin.firestore().doc(`Games/${ticket.gameNumber}/assists/${reRunticket}`).delete();
        } else {
            ticket = {
                createUser: uid,
                uid,
                message,
                created: new Date().toISOString(),
                submitted,
                messageType: "user",
                gameNumber,
                memberName,
                memberImage,
                max_tokens,
                includeInMessage: true,
            };
            const addResult: any = await firebaseAdmin.firestore().collection(`Games/${gameNumber}/tickets`).add(ticket);
            ticketId = addResult.id;
            SessionAPI.increaseTicketCount(gameNumber, 1);
        }

        const sessionPacket: any = {
            lastActivity: new Date().toISOString(),
            lastTicketId: ticketId,
            members: {
                [uid]: new Date().toISOString(),
            },
        };
        if (message && !sessionDocumentData.title) {
            sessionPacket.title = message.substring(0, 300);
        }

        await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).set(sessionPacket, {
            merge: true,
        });

        let usageLimitError = false;
        let usageErrorObject: any = null;
        try {
            if (sessionDocumentData.archived) {
                throw new Error("Submit Blocked: Document is set to archived");
            }

            const usageLimit = BaseClass.getNumberOrDefault(sessionDocumentData.creditUsageLimit, 0);
            const documentUsed = BaseClass.getNumberOrDefault(sessionDocumentData.creditUsage, 0);
            if (usageLimit > 0 && documentUsed >= usageLimit) {
                throw new Error("Submit Blocked: Document Usage Limit Reached");
            }

            if (monthlyUsage > accountUsageLimit) {
                throw new Error("Submit Blocked: Monthly Account Usage Limit Reached");
            }
        } catch (usageTestError) {
            usageLimitError = true;
            usageErrorObject = usageTestError;
        }

        let aiResults: any = {};
        if (usageLimitError) {
            aiResults = {
                aiResponse: {
                    success: false,
                    created: new Date().toISOString(),
                    error: usageErrorObject.message,
                    submitted,
                },
                total_tokens: 0,
                prompt_tokens: 0,
                completion_tokens: 0,
                usage_credits: 0,
            };
        } else {
            const model = sessionDocumentData.model;
            const gptModels = ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4", "gpt-4-32k"];
            const bardModels = ["chat-bison-001"];
            // const anthroModels = ["claude-2", "claude-instant-1"];
            if (gptModels.indexOf(model) !== -1) {
                const packet = await SessionAPI._generateOpenAIPacket(ticket, sessionDocumentData, gameNumber, ticketId, includeTickets);
                aiResults = await SessionAPI._processOpenAIPacket(packet, sessionDocumentData, ticket, ticketId, chatGptKey, submitted);
            } else if (bardModels.indexOf(model) !== -1) {
                const packet = await SessionAPI._generateGAIPacket(ticket, sessionDocumentData, gameNumber, ticketId, includeTickets);
                aiResults = await SessionAPI._processGAIPacket(packet, sessionDocumentData, ticket, ticketId, bardKey, submitted);
            } else {
                return res.status(200).send({
                    success: false,
                    errorMessage: "Model not found",
                });
            }
        }

        const total_tokens = aiResults.total_tokens;
        const prompt_tokens = aiResults.prompt_tokens;
        const completion_tokens = aiResults.completion_tokens;
        const usage_credits = aiResults.usage_credits + creditRequestCharge;
        const aiResponse = aiResults.aiResponse;

        const promises = [
            firebaseAdmin.firestore().doc(`Games/${gameNumber}/assists/${ticketId}`).set(aiResponse),
            firebaseAdmin.firestore().doc(`Games/${gameNumber}/tickets/${ticketId}`).set({
                running: false,
            }, {
                merge: true,
            }),
            firebaseAdmin.firestore().doc(`Games/${gameNumber}`).set({
                lastActivity: new Date().toISOString(),
                // lastMessage: ticketData.message,
                lastTicketId: ticketId,
                // lastResponse,
                totalTokens: FieldValue.increment(total_tokens),
                promptTokens: FieldValue.increment(prompt_tokens),
                completionTokens: FieldValue.increment(completion_tokens),
                creditUsage: FieldValue.increment(usage_credits),
            }, {
                merge: true,
            }),
            firebaseAdmin.firestore().doc(`Users/${sessionDocumentData.createUser}/internal/tokenUsage`).set({
                lastActivity: new Date().toISOString(),
                lastChatDocumentId: gameNumber,
                lastChatTicketId: ticketId,
                totalTokens: FieldValue.increment(total_tokens),
                promptTokens: FieldValue.increment(prompt_tokens),
                completionTokens: FieldValue.increment(completion_tokens),
                creditUsage: FieldValue.increment(usage_credits),
                runningTokens: {
                    ["total_" + yearFrag]: FieldValue.increment(total_tokens),
                    ["total_" + yearMonthFrag]: FieldValue.increment(total_tokens),
                    ["total_" + ymdFrag]: FieldValue.increment(total_tokens),
                    ["prompt_" + yearFrag]: FieldValue.increment(prompt_tokens),
                    ["prompt_" + yearMonthFrag]: FieldValue.increment(prompt_tokens),
                    ["prompt_" + ymdFrag]: FieldValue.increment(prompt_tokens),
                    ["completion_" + yearFrag]: FieldValue.increment(completion_tokens),
                    ["completion_" + yearMonthFrag]: FieldValue.increment(completion_tokens),
                    ["completion_" + ymdFrag]: FieldValue.increment(completion_tokens),
                    ["credit_" + yearFrag]: FieldValue.increment(usage_credits),
                    ["credit_" + yearMonthFrag]: FieldValue.increment(usage_credits),
                    ["credit_" + ymdFrag]: FieldValue.increment(usage_credits),
                },
            }, {
                merge: true,
            }),
        ];
        await Promise.all(promises);


        return res.status(200).send({
            success: true,
            gameNumber,
        });
        /* eslint-enable camelcase */
    }
    /** http endpoint for user posting message to table chat
    * @param { any } req http request object
    * @param { any } res http response object
    */
    static async importTicket(req: any, res: any) {
        const authResults = await BaseClass.validateCredentials(req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        const uid = authResults.uid;
        const gameNumber = req.body.gameNumber;
        const importedTickets: any = req.body.importedTickets;

        for (let c = 0, l = importedTickets.length; c < l; c++) {
            const importTicket = importedTickets[c];
            let prompt = importTicket.prompt;
            if (prompt) {
                if (prompt.length > 50000) prompt = prompt.substr(0, 50000);
            }
            if (!prompt) {
                return BaseClass.respondError(res, "Prompt is empty");
            }
            let completion = "";
            if (importTicket.completion) {
                completion = importTicket.completion;
            }
            const gameQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).get();
            const sessionDocumentData = gameQuery.data();
            if (!sessionDocumentData) {
                return BaseClass.respondError(res, "Document not found");
            }

            const userQ = await firebaseAdmin.firestore().doc(`Users/${sessionDocumentData.createUser}`).get();
            const ownerProfile = userQ.data();
            if (!ownerProfile) {
                return BaseClass.respondError(res, "User not found");
            }

            const memberImage = sessionDocumentData.memberImages[uid] ? sessionDocumentData.memberImages[uid] : "";
            const memberName = sessionDocumentData.memberNames[uid] ? sessionDocumentData.memberNames[uid] : "";

            const createDate = new Date().toISOString();
            const ticket = {
                uid,
                createUser: uid,
                message: prompt,
                created: createDate,
                submitted: createDate,
                messageType: "user",
                gameNumber,
                memberName,
                memberImage,
                includeInMessage: importTicket.selected !== "n",
            };
            const newTicketResult = await firebaseAdmin.firestore().collection(`Games/${gameNumber}/tickets`).add(ticket);
            SessionAPI.increaseTicketCount(gameNumber, 1);

            const assistRecord: any = {
                success: true,
                created: createDate,
                submitted: createDate,
            };
            if (completion) {
                assistRecord.assist = {
                    choices: [
                        {
                            message: {
                                content: completion,
                            },
                        },
                    ],
                    usage: {
                        total_tokens: 0,
                        prompt_tokens: 0,
                        completion_tokens: 0,
                    },
                };
            } else {
                assistRecord.assist = {
                    choices: [
                        {
                            message: {
                                content: "Imported message only not Submitted",
                            },
                        },
                    ],
                    usage: {
                        total_tokens: 0,
                        prompt_tokens: 0,
                        completion_tokens: 0,
                    },
                };
            }

            await firebaseAdmin.firestore().doc(`Games/${gameNumber}/assists/${newTicketResult.id}`).set(assistRecord);
        }

        return res.status(200).send({
            success: true,
        });
    }
    /** generate ai api request including previous messages and store in /games/{gameid}/packets/{ticketid}
     * @param { any } ticket message details
     * @param { any } sessionDocumentData chat document
     * @param { string } gameNumber document id
     * @param { string } ticketId ticketId
     * @param { Array<string> } includeTickets tickets sent to packet
     */
    static async _generateGAIPacket(ticket: any, sessionDocumentData: any, gameNumber: string, ticketId: string,
        includeTickets: Array<string>): Promise<any> {
        const messages: Array<any> = [];
        let context = "";
        if (sessionDocumentData.systemMessage) context = sessionDocumentData.systemMessage;

        const promises: Array<any> = [];
        includeTickets.forEach((includeTicketId) => {
            promises.push(firebaseAdmin.firestore().doc(`Games/${gameNumber}/tickets/${includeTicketId}`).get());
        });
        const assistsPromises: Array<any> = [];
        includeTickets.forEach((includeTicketId: string) => {
            assistsPromises.push(firebaseAdmin.firestore().doc(`Games/${gameNumber}/assists/${includeTicketId}`).get());
        });
        const dataResults: Array<any> = await Promise.all(promises);
        const assistResults: Array<any> = await Promise.all(assistsPromises);
        const assistLookup: any = {};
        assistResults.forEach((assist: any) => {
            assistLookup[assist.id] = assist.data();
        });
        let promptTokens = 0;
        dataResults.forEach((includeTicket: any) => {
            if (ticket.id !== includeTicket.id) {
                if (assistLookup[includeTicket.id] && assistLookup[includeTicket.id].success &&
                    !assistLookup[includeTicket.id].assist.error) {
                    const msg = includeTicket.data().message;
                    const assist = assistLookup[includeTicket.id].assist.choices["0"].message.content;
                    messages.push({
                        role: "user",
                        content: msg,
                    });
                    messages.push({
                        role: "bot",
                        content: assist,
                    });

                    promptTokens += encode(msg).length + encode(assist).length;
                }
            }
        });
        messages.push({
            role: "user",
            content: ticket.message,
            name: ticket.uid,
        });
        promptTokens += encode(ticket.message).length;
        const defaults = BaseClass.defaultChatDocumentOptions();
        const model = sessionDocumentData.model;
        const maxOutputTokens = BaseClass.getNumberOrDefault(sessionDocumentData.max_tokens, defaults.max_tokens);
        const temperature = BaseClass.getNumberOrDefault(sessionDocumentData.temperature, defaults.temperature);
        const topP = BaseClass.getNumberOrDefault(sessionDocumentData.top_p, defaults.top_p);
        const topK = BaseClass.getNumberOrDefault(sessionDocumentData.top_k, defaults.top_k);
        const examples: Array<any> = [];

        const aiRequest: any = {
            model: "models/" + model,
            prompt: {
                context,
                examples,
                messages,
            },
            temperature,
            maxOutputTokens,
            topP,
            topK,
            candidateCount: 1,
        };

        const packet = {
            gameNumber: ticket.gameNumber,
            aiRequest,
            model,
            submitted: ticket.submitted,
            prompt_tokens: promptTokens,
        };
        await firebaseAdmin.firestore().doc(`Games/${ticket.gameNumber}/packets/${ticketId}`).set(packet);

        return packet;
    }
    /** generate ai api request including previous messages and store in /games/{gameid}/packets/{ticketid}
     * @param { any } ticket message details
     * @param { any } sessionDocumentData chat document
     * @param { string } gameNumber document id
     * @param { string } ticketId ticketId
     * @param { Array<string> } includeTickets tickets sent to packet
     */
    static async _generateOpenAIPacket(ticket: any, sessionDocumentData: any, gameNumber: string, ticketId: string,
        includeTickets: Array<string>): Promise<any> {
        const messages: Array<any> = [];
        const uidIndexes = Object.keys(sessionDocumentData.members);
        if (sessionDocumentData.systemMessage) {
            messages.push({
                role: "system",
                content: sessionDocumentData.systemMessage,
            });
        }
        const promises: Array<any> = [];
        includeTickets.forEach((includeTicketId) => {
            promises.push(firebaseAdmin.firestore().doc(`Games/${gameNumber}/tickets/${includeTicketId}`).get());
        });
        const assistsPromises: Array<any> = [];
        includeTickets.forEach((includeTicketId: string) => {
            assistsPromises.push(firebaseAdmin.firestore().doc(`Games/${gameNumber}/assists/${includeTicketId}`).get());
        });
        const dataResults: Array<any> = await Promise.all(promises);
        const assistResults: Array<any> = await Promise.all(assistsPromises);
        const assistLookup: any = {};
        assistResults.forEach((assist: any) => {
            assistLookup[assist.id] = assist.data();
        });
        const includeUsers = sessionDocumentData.includeUserNames === true;
        dataResults.forEach((includeTicket: any) => {
            if (ticket.id !== includeTicket.id) {
                if (assistLookup[includeTicket.id] && assistLookup[includeTicket.id].success &&
                    !assistLookup[includeTicket.id].assist.error) {
                    const message: any = {
                        role: "user",
                        content: includeTicket.data().message,
                    };

                    if (includeUsers) {
                        message.name = uidIndexes.indexOf(includeTicket.data().uid).toString();
                    }
                    messages.push(message);

                    messages.push({
                        role: "assistant",
                        content: assistLookup[includeTicket.id].assist.choices["0"].message.content,
                    });
                }
            }
        });

        const message: any = {
            role: "user",
            content: ticket.message,
        };
        if (includeUsers) message.name = uidIndexes.indexOf(ticket.uid).toString();

        messages.push(message);
        /* eslint-disable camelcase */
        const defaults = BaseClass.defaultChatDocumentOptions();
        const model = sessionDocumentData.model;
        const max_tokens = BaseClass.getNumberOrDefault(sessionDocumentData.max_tokens, defaults.max_tokens);
        const temperature = BaseClass.getNumberOrDefault(sessionDocumentData.temperature, defaults.temperature);
        const top_p = BaseClass.getNumberOrDefault(sessionDocumentData.top_p, defaults.top_p);
        const presence_penalty = BaseClass.getNumberOrDefault(sessionDocumentData.presence_penalty, defaults.presence_penalty);
        const frequency_penalty = BaseClass.getNumberOrDefault(sessionDocumentData.frequency_penalty, defaults.frequency_penalty);

        const aiRequest: any = {
            model,
            max_tokens,
            top_p,
            temperature,
            presence_penalty,
            frequency_penalty,
            messages,
            user: ticket.uid,
        };

        const packet = {
            gameNumber: ticket.gameNumber,
            aiRequest,
            model,
            submitted: ticket.submitted,
        };
        await firebaseAdmin.firestore().doc(`Games/${ticket.gameNumber}/packets/${ticketId}`).set(packet);

        return packet;
        /* eslint-enable camelcase */
    }
    /** promise wrapper submit with timeout detection
     * @param { any } aiRequest request packet
     * @param { string } submitted iso date
     * @param { string } chatGptKey
     * @return { Promise<any> } aiResponse containing assist or error
    */
    static async submitOpenAIRequest(aiRequest: any, submitted: string, chatGptKey: string): Promise<any> {
        return new Promise((res: any) => {
            const startTime = new Date().getTime();
            try {
                const timeoutTest = setTimeout(() => {
                    res({
                        success: false,
                        created: new Date().toISOString(),
                        error: "5 minute response timeout reached",
                        submitted,
                    });
                }, 4.9 * 60 * 1000);
                fetch(`https://api.openai.com/v1/chat/completions`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + chatGptKey,
                    },
                    body: JSON.stringify(aiRequest),
                }).then(async (response: any) => {
                    const assist: any = await response.json();
                    const aiResponse = {
                        success: true,
                        created: new Date().toISOString(),
                        assist,
                        submitted,
                        runTime: new Date().getTime() - startTime,
                    };
                    clearTimeout(timeoutTest);
                    res(aiResponse);
                }).catch((error: any) => {
                    const aiResponse = {
                        success: false,
                        created: new Date().toISOString(),
                        error: error.message,
                        submitted,
                        runTime: new Date().getTime() - startTime,
                    };
                    res(aiResponse);
                });
            } catch (aiRequestError: any) {
                const aiResponse = {
                    success: false,
                    created: new Date().toISOString(),
                    error: aiRequestError.message,
                    submitted,
                    runTime: new Date().getTime() - startTime,
                };
                res(aiResponse);
            }
        });
    }
    /** promise wrapper submit with timeout detection
     * @param { any } packet request packet
     * @param { string } submitted iso date
     * @param { string } bardKey
     * @return { Promise<any> } aiResponse containing assist or error
    */
    static async submitGAIRequest(packet: any, submitted: string, bardKey: string): Promise<any> {
        return new Promise((res: any) => {
            const startTime = new Date().getTime();
            try {
                const timeoutTest = setTimeout(() => {
                    res({
                        success: false,
                        created: new Date().toISOString(),
                        error: "5 minute response timeout reached",
                        submitted,
                    });
                }, 4.9 * 60 * 1000);

                const client = new DiscussServiceClient({
                    authClient: new GoogleAuth().fromAPIKey(bardKey),
                });
                client.generateMessage(packet.aiRequest)
                    .then(async (assist: any) => {
                        const aiResponse: any = {
                            success: true,
                            created: new Date().toISOString(),
                            assist: {
                                bardResponse: assist,
                            },
                            submitted,
                            runTime: new Date().getTime() - startTime,
                        };
                        clearTimeout(timeoutTest);

                        if (assist["0"].candidates.length === 0) {
                            console.log(JSON.stringify(assist));
                            throw new Error("\"Other\" reason for failure - Bard failed - please change your message or try again later.");
                        }
                        const completion = assist["0"].candidates["0"].content;
                        aiResponse.prompt_tokens = packet.prompt_tokens;
                        aiResponse.completion_tokens = encode(completion).length;
                        aiResponse.total_tokens = aiResponse.prompt_tokens + aiResponse.completion_tokens;

                        aiResponse.assist.usage = {
                            prompt_tokens: aiResponse.prompt_tokens,
                            completion_tokens: aiResponse.completion_tokens,
                            total_tokens: aiResponse.total_tokens,
                        };

                        let finishReason = "stop";
                        if (aiResponse.completion_tokens > 950) finishReason = "max_tokens error range";
                        aiResponse.assist.choices = {
                            "0": {
                                message: {
                                    content: completion,
                                },
                                finish_reason: finishReason,
                            },
                        };

                        res(aiResponse);
                    }).catch((error: any) => {
                        console.log("response error", error);
                        const aiResponse = {
                            success: false,
                            created: new Date().toISOString(),
                            error: error.message,
                            submitted,
                            runTime: new Date().getTime() - startTime,
                        };
                        res(aiResponse);
                    });
            } catch (aiRequestError: any) {
                console.log("request error", aiRequestError);
                const aiResponse = {
                    success: false,
                    created: new Date().toISOString(),
                    error: aiRequestError.message,
                    submitted,
                    runTime: new Date().getTime() - startTime,
                };
                res(aiResponse);
            }
        });
    }
    /**
     * @param { string } model model name (gpt-3.5-turbo, etc)
     * @return { any } input and output $ cost per 1k tokens
    */
    static modelCreditMultiplier(model: string): any {
        if (model === "gpt-3.5-turbo") {
            return {
                input: 0.0015,
                output: 0.002,
            };
        }
        if (model === "gpt-3.5-turbo-16k") {
            return {
                input: 0.003,
                output: 0.004,
            };
        }
        if (model === "gpt-4") {
            return {
                input: 0.03,
                output: 0.06,
            };
        }
        if (model === "gpt-4-32k") {
            return {
                input: 0.06,
                output: 0.12,
            };
        }
        if (model === "chat-bison-001") {
            return {
                input: 0.03,
                output: 0.06,
            };
        }
        if (model === "claude-instant-1") {
            return {
                input: 0.00163,
                output: 0.00551,
            };
        }
        if (model === "claude-2") {
            return {
                input: 0.01102,
                output: 0.03268,
            };
        }
        console.log("model not found for billing");

        return {
            input: 0,
            output: 0,
        };
    }
    /** submit ticket to AI engine and store response in /games/{gameid}/assists/{ticketid}
     * @param { any } packet message details
     * @param { any } sessionDocumentData game doc
     * @param { any } ticketData ticket doc
     * @param { string } id document id
     * @param { string } chatGptKey api key from user profile
     * @param { string } submitted submitted date
     * @return { Promise<any> } token usage
     */
    static async _processOpenAIPacket(packet: any, sessionDocumentData: any, ticketData: any,
        id: string, chatGptKey: string, submitted: string): Promise<any> {
        /* eslint-disable camelcase */
        let total_tokens = 0;
        let prompt_tokens = 0;
        let completion_tokens = 0;
        let usage_credits = 0;

        let aiResponse: any = null;
        aiResponse = await SessionAPI.submitOpenAIRequest(packet.aiRequest, submitted, chatGptKey);
        if (aiResponse.assist && aiResponse.assist.usage) {
            total_tokens = BaseClass.getNumberOrDefault(aiResponse.assist.usage.total_tokens, 0);
            prompt_tokens = BaseClass.getNumberOrDefault(aiResponse.assist.usage.prompt_tokens, 0);
            completion_tokens = BaseClass.getNumberOrDefault(aiResponse.assist.usage.completion_tokens, 0);

            const creditFactors = SessionAPI.modelCreditMultiplier(sessionDocumentData.model);
            usage_credits = creditFactors.input * prompt_tokens + creditFactors.output * completion_tokens;
        }

        return {
            aiResponse,
            total_tokens,
            prompt_tokens,
            completion_tokens,
            usage_credits,
        };
        /* eslint-enable camelcase */
    }
    /** submit ticket to AI engine and store response in /games/{gameid}/assists/{ticketid}
     * @param { any } packet message details
     * @param { any } sessionDocumentData game doc
     * @param { any } ticketData ticket doc
     * @param { string } id document id
     * @param { string } bardKey api key from user profile
     * @param { string } submitted submitted date
     * @return { Promise<any> } token usage
     */
    static async _processGAIPacket(packet: any, sessionDocumentData: any, ticketData: any,
        id: string, bardKey: string, submitted: string): Promise<any> {
        /* eslint-disable camelcase */
        let total_tokens = 0;
        let prompt_tokens = 0;
        let completion_tokens = 0;
        let usage_credits = 0;

        /* eslint-disable camelcase */
        let aiResponse: any = null;
        aiResponse = await SessionAPI.submitGAIRequest(packet, submitted, bardKey);
        if (aiResponse.assist) {
            prompt_tokens = aiResponse.prompt_tokens;
            completion_tokens = aiResponse.completion_tokens;
            total_tokens = aiResponse.total_tokens;

            const creditFactors = SessionAPI.modelCreditMultiplier(sessionDocumentData.model);
            usage_credits = creditFactors.input * prompt_tokens + creditFactors.output * completion_tokens;
        }

        return {
            aiResponse,
            total_tokens,
            prompt_tokens,
            completion_tokens,
            usage_credits,
        };
        /* eslint-enable camelcase */
    }
    /** http endpoint for user deleting message from user chat
     * @param { any } req http request object
     * @param { any } res http response object
     */
    static async deleteTicket(req: any, res: any) {
        const authResults = await BaseClass.validateCredentials(req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        const uid = authResults.uid;

        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const gameNumber = req.body.gameNumber;
        const ticketId = req.body.ticketId;

        const sessionDocumentDataRef = firebaseAdmin.firestore().doc(`Games/${gameNumber}`);
        const sessionDocumentDataQuery = await sessionDocumentDataRef.get();
        const sessionDocumentData = sessionDocumentDataQuery.data();

        if (!sessionDocumentData) return BaseClass.respondError(res, "Game not found");

        const isGameOwner = (sessionDocumentData.createUser === uid);

        const messageQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}/tickets/${ticketId}`).get();
        const message: any = messageQuery.data();

        const isOwner = (message.uid === uid);
        if (!isOwner && !isGameOwner) return BaseClass.respondError(res, "Must own game or message to delete");
        SessionAPI.increaseTicketCount(gameNumber, -1);
        await firebaseAdmin.firestore().doc(`Games/${gameNumber}/tickets/${ticketId}`).delete();
        await firebaseAdmin.firestore().doc(`Games/${gameNumber}/assists/${ticketId}`).delete();
        await firebaseAdmin.firestore().doc(`Games/${gameNumber}/packets/${ticketId}`).delete();
        await firebaseAdmin.firestore().doc(`Games/${gameNumber}/reports/${ticketId}`).delete();

        return res.status(200).send({
            success: true,
        });
    }
    /** update state from checkbox state in
     * @param { any } req http request object
     * @param { any } res http response object
    */
    static async updateTicketIncludeStatus(req: any, res: any) {
        const authResults = await BaseClass.validateCredentials(req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const gameNumber = req.body.gameNumber;
        const ticketId = req.body.ticketId;
        const includeInMessage = req.body.include;

        await firebaseAdmin.firestore().doc(`Games/${gameNumber}/tickets/${ticketId}`).set({
            includeInMessage,
        }, {
            merge: true,
        });

        return res.status(200).send({
            success: true,
        });
    }
    /** increase or decrease the ticket
     * @param { string } sessionId
     * @param { number } inc value to adjust ticket count by
    */
    static async increaseTicketCount(sessionId: string, inc: number) {
        await firebaseAdmin.firestore().doc(`Games/${sessionId}`).set({
            lastActivity: new Date().toISOString(),
            totalTickets: FieldValue.increment(inc),
        }, {
            merge: true,
        });
    }
    /** edit ticket response
     * @param { any } req http request object
     * @param { any } res http response object
    */
    static async editTicketResponse(req: any, res: any) {
        const authResults = await BaseClass.validateCredentials(req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        const uid = authResults.uid;
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const sessionId = req.body.sessionId;
        const ticketId = req.body.ticketId;
        const response = req.body.response;
        await firebaseAdmin.firestore().doc(`Games/${sessionId}/assists/${ticketId}`).update({
            assist: {
                choices: [{
                    message: {
                        content: response,
                    },
                    index: 0,
                    finish_reason: "stop",
                    edited: true,
                    uid: uid,
                }],
            },
        });

        return res.status(200).send({
            success: true,
        });
    }
}
