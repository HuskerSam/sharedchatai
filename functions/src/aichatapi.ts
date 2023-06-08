import * as firebaseAdmin from "firebase-admin";
import {
    FieldValue,
} from "firebase-admin/firestore";
import BaseClass from "./baseclass";
import fetch from "node-fetch";
import {
    encode,
} from "gpt-3-encoder";

/** Match game specific turn logic wrapped in a transaction */
export default class ChatAI {
    /** http endpoint for user posting message to table chat
   * @param { any } req http request object
   * @param { any } res http response object
   */
    static async submitTicket(req: any, res: any) {
        const authResults = await BaseClass.validateCredentials(req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        const uid = authResults.uid;
        const gameNumber = req.body.gameNumber;
        const reRunticket: any = req.body.reRunTicket;
        let message = req.body.message;
        if (message) {
            if (message.length > 50000) message = message.substr(0, 50000);
        }

        if (!message && !reRunticket) {
            return BaseClass.respondError(res, "Message is empty and no rerunticket id");
        }
        const includeTickets = req.body.includeTickets;

        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const gameQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).get();
        const gameData = gameQuery.data();
        if (!gameData) {
            return BaseClass.respondError(res, "Game not found");
        }

        const userQ = await firebaseAdmin.firestore().doc(`Users/${gameData.createUser}`).get();
        const ownerProfile = userQ.data();
        if (!ownerProfile) {
            return BaseClass.respondError(res, "User not found");
        }

        /* eslint-disable camelcase */
        const defaults = BaseClass.defaultChatDocumentOptions();
        const max_tokens = BaseClass.getNumberOrDefault(gameData.max_tokens, defaults.max_tokens);
        const isOwner = uid === gameData.createUser;
        // const chatGptKey = ownerProfile.chatGptKey;
        const chatGptKey = localInstance.privateConfig.chatGPTKey;

        const memberImage = gameData.memberImages[uid] ? gameData.memberImages[uid] : "";
        const memberName = gameData.memberNames[uid] ? gameData.memberNames[uid] : "";

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

            await firebaseAdmin.firestore().doc(`Games/${gameNumber}/tickets/${reRunticket}`).set({
                submitted,
                max_tokens,
            }, {
                merge: true,
            });
            await firebaseAdmin.firestore().doc(`Games/${ticket.gameNumber}/assists/${reRunticket}`).delete();
        } else {
            ticket = {
                uid,
                message,
                created: new Date().toISOString(),
                submitted,
                messageType: "user",
                gameNumber,
                isOwner,
                memberName,
                memberImage,
                max_tokens,
                includeInMessage: true,
            };
            const addResult: any = await firebaseAdmin.firestore().collection(`Games/${gameNumber}/tickets`).add(ticket);
            ticketId = addResult.id;
        }

        if (gameData.unsetTitle && message) {
            const titleUpdate = {
                unsetTitle: false,
                title: message.substring(0, 100),
            };
            await firebaseAdmin.firestore().doc(`Games/${ticket.gameNumber}`).set(titleUpdate, {
                merge: true,
            });
        }

        await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).set({
            lastActivity: new Date().toISOString(),
            lastTicketId: ticketId,
            members: {
                [uid]: new Date().toISOString(),
            },
        }, {
            merge: true,
        });

        const packet = await this._generatePacket(ticket, gameData, gameNumber, ticketId, includeTickets);
        await this._processTicket(packet, gameData, ticket, ticketId, chatGptKey, submitted);

        return res.status(200).send({
            success: true,
        });
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
            const gameData = gameQuery.data();
            if (!gameData) {
                return BaseClass.respondError(res, "Document not found");
            }

            const userQ = await firebaseAdmin.firestore().doc(`Users/${gameData.createUser}`).get();
            const ownerProfile = userQ.data();
            if (!ownerProfile) {
                return BaseClass.respondError(res, "User not found");
            }

            console.log(importTicket);

            const isOwner = uid === gameData.createUser;

            const memberImage = gameData.memberImages[uid] ? gameData.memberImages[uid] : "";
            const memberName = gameData.memberNames[uid] ? gameData.memberNames[uid] : "";

            const createDate = new Date().toISOString();
            const ticket = {
                uid,
                message: prompt,
                created: createDate,
                submitted: createDate,
                messageType: "user",
                gameNumber,
                isOwner,
                memberName,
                memberImage,
                includeInMessage: importTicket.selected !== "n",
            };
            const newTicketResult = await firebaseAdmin.firestore().collection(`Games/${gameNumber}/tickets`).add(ticket);

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
     * @param { any } gameData chat document
     * @param { string } gameNumber document id
     * @param { string } ticketId ticketId
     * @param { Array<string> } includeTickets tickets sent to packet
     */
    static async _generatePacket(ticket: any, gameData: any, gameNumber: string, ticketId: string,
        includeTickets: Array<string>): Promise<any> {
        const messages: Array<any> = [];
        // const gameQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).get();
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
        dataResults.forEach((includeTicket: any) => {
            if (ticket.id !== includeTicket.id) {
                messages.push({
                    role: "user",
                    content: includeTicket.data().message,
                });

                if (assistLookup[includeTicket.id] && assistLookup[includeTicket.id].success &&
                    !assistLookup[includeTicket.id].assist.error) {
                    messages.push({
                        role: "assistant",
                        content: assistLookup[includeTicket.id].assist.choices["0"].message.content,
                    });
                }
            }
        });
        messages.push({
            role: "user",
            content: ticket.message,
        });
        /* eslint-disable camelcase */
        const defaults = BaseClass.defaultChatDocumentOptions();
        const model = gameData.model;
        const max_tokens = BaseClass.getNumberOrDefault(gameData.max_tokens, defaults.max_tokens);
        const temperature = BaseClass.getNumberOrDefault(gameData.model, defaults.temperature);
        const top_p = BaseClass.getNumberOrDefault(gameData.top_p, defaults.top_p);
        const presence_penalty = BaseClass.getNumberOrDefault(gameData.presence_penalty, defaults.presence_penalty);
        const frequency_penalty = BaseClass.getNumberOrDefault(gameData.frequency_penalty, defaults.frequency_penalty);

        let logit_bias_text = gameData.logit_bias;
        if (!logit_bias_text) logit_bias_text = "";
        let includeBias = false;
        const bias_lines = logit_bias_text.replaceAll("\n", "").split(",");
        const logit_bias: any = {};
        bias_lines.forEach((line: string) => {
            includeBias = true;
            const parts = line.split(":");
            let numberTerm = parts[1];
            if (numberTerm) numberTerm = numberTerm.trim();
            const value = BaseClass.getNumberOrDefault(numberTerm, 0);
            const term = parts[0].trim();
            if (term.length > 0) {
                const tokens = encode(" " + term);

                tokens.forEach((token: number) => {
                    logit_bias[token] = value;
                });
            }
        });

        const aiRequest: any = {
            model,
            max_tokens,
            presence_penalty,
            frequency_penalty,
            messages,
        };
        if (includeBias) aiRequest.logit_bias = logit_bias;
        if (top_p * 1.0 !== 1.0) aiRequest.top_p = 1;
        if (temperature * 1.0 !== 1.0) aiRequest.temperature = 1;

        const packet = {
            gameNumber: ticket.gameNumber,
            aiRequest,
        };
        await firebaseAdmin.firestore().doc(`Games/${ticket.gameNumber}/packets/${ticketId}`).set(packet);

        return packet;
    }
    /** promise wrapper submit with timeout detection
     * @param { any } aiRequest request packet
     * @param { string } submitted iso date
     * @param { string } chatGptKey
     * @return { Promise<any> } aiResponse containing assist or error
    */
    static async submitOpenAIRequest(aiRequest: any, submitted: string, chatGptKey: string): Promise<any> {
        return new Promise((res: any) => {
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
                    };
                    clearTimeout(timeoutTest);
                    res(aiResponse);
                });
            } catch (aiRequestError: any) {
                const aiResponse = {
                    success: false,
                    created: new Date().toISOString(),
                    error: aiRequestError.message,
                    submitted,
                };
                res(aiResponse);
            }
        });
    }
    /** submit ticket to AI engine and store response in /games/{gameid}/assists/{ticketid}
     * @param { any } packet message details
     * @param { any } gameData game doc
     * @param { any } ticketData ticket doc
     * @param { string } id document id
     * @param { string } chatGptKey api key from user profile
     * @param { string } submitted submitted date
     * @return { Promise<void> }
     */
    static async _processTicket(packet: any, gameData: any, ticketData: any,
        id: string, chatGptKey: string, submitted: string): Promise<void> {
        let total_tokens = 0;
        let prompt_tokens = 0;
        let completion_tokens = 0;


        if (gameData.archived) {
            throw new Error("Submit Blocked: Document is set to archived");
        }

        const usageLimit = BaseClass.getNumberOrDefault(gameData.tokenUsageLimit, 0);
        const documentUsed = BaseClass.getNumberOrDefault(gameData.totalTokens, 0);
        if (usageLimit > 0 && documentUsed >= usageLimit) {
            throw new Error("Submit Blocked: Document Usage Limit Reached");
        }

        const aiResponse = await ChatAI.submitOpenAIRequest(packet.aiRequest, submitted, chatGptKey);

        if (aiResponse.assist && aiResponse.assist.usage) {
            total_tokens = BaseClass.getNumberOrDefault(aiResponse.assist.usage.total_tokens, 0);
            prompt_tokens = BaseClass.getNumberOrDefault(aiResponse.assist.usage.prompt_tokens, 0);
            completion_tokens = BaseClass.getNumberOrDefault(aiResponse.assist.usage.completion_tokens, 0);
        }

        const today = new Date().toISOString();
        const yearFrag = today.substring(0, 4);
        const yearMonthFrag = today.substring(0, 7);
        const ymdFrag = today.substring(0, 10);

        const promises = [
            firebaseAdmin.firestore().doc(`Games/${packet.gameNumber}/assists/${id}`).set(aiResponse),
            firebaseAdmin.firestore().doc(`Games/${packet.gameNumber}`).set({
                lastActivity: new Date().toISOString(),
                // lastMessage: ticketData.message,
                lastTicketId: id,
                // lastResponse,
                totalTokens: FieldValue.increment(total_tokens),
                promptTokens: FieldValue.increment(prompt_tokens),
                completionTokens: FieldValue.increment(completion_tokens),
            }, {
                merge: true,
            }),
            firebaseAdmin.firestore().doc(`Users/${gameData.createUser}/internal/tokenUsage`).set({
                lastActivity: new Date().toISOString(),
                lastMessage: ticketData.message,
                lastChatDocumentId: packet.gameNumber,
                lastChatTicketId: id,
                totalTokens: FieldValue.increment(total_tokens),
                promptTokens: FieldValue.increment(prompt_tokens),
                completionTokens: FieldValue.increment(completion_tokens),
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
                },
            }, {
                merge: true,
            }),
        ];
        await Promise.all(promises);
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

        const gameDataRef = firebaseAdmin.firestore().doc(`Games/${gameNumber}`);
        const gameDataQuery = await gameDataRef.get();
        const gameData = gameDataQuery.data();

        if (!gameData) return BaseClass.respondError(res, "Game not found");

        const isGameOwner = (gameData.createUser === uid);

        const messageQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}/tickets/${ticketId}`).get();
        const message: any = messageQuery.data();

        const isOwner = (message.uid === uid);
        if (!isOwner && !isGameOwner) return BaseClass.respondError(res, "Must own game or message to delete");

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
}
