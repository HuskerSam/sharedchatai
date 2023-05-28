import * as firebaseAdmin from "firebase-admin";
import BaseClass from "./baseclass";
import fetch from "node-fetch";

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
        let message = BaseClass.escapeHTML(req.body.message);
        if (message.length > 10000) message = message.substr(0, 10000);
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

        const isOwner = uid === gameData.createUser;
        const chatGptKey = ownerProfile.chatGptKey;

        const memberImage = gameData.memberImages[uid] ? gameData.memberImages[uid] : "";
        const memberName = gameData.memberNames[uid] ? gameData.memberNames[uid] : "";

        const ticket = {
            uid,
            message,
            created: new Date().toISOString(),
            submitted: new Date().toISOString(),
            messageType: "user",
            gameNumber,
            isOwner,
            memberName,
            memberImage,
        };
        console.log(includeTickets);
        const addResult: any = await firebaseAdmin.firestore().collection(`Games/${gameNumber}/tickets`).add(ticket);
        const packet = await this._generatePacket(ticket, gameNumber, addResult.id, includeTickets);
        await this._processTicket(packet, addResult.id, chatGptKey);

        return res.status(200).send({
            success: true,
        });
    }
    /** generate ai api request including previous messages and store in /games/{gameid}/packets/{ticketid}
     * @param { any } ticket message details
     * @param { string } gameNumber document id
     * @param { string } ticketId ticketId
     * @param { Array<string> } includeTickets tickets sent to packet
     */
    static async _generatePacket(ticket: any, gameNumber: string, ticketId: string, includeTickets: Array<string>): Promise<any> {
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
            "role": "user",
            "content": ticket.message,
        });
        const aiRequest = {
            "model": "gpt-3.5-turbo",
            messages,
        };

        const packet = {
            gameNumber: ticket.gameNumber,
            aiRequest,
        };
        await firebaseAdmin.firestore().doc(`Games/${ticket.gameNumber}/packets/${ticketId}`).set(packet);

        return packet;
    }
    /** submit ticket to AI engine and store response in /games/{gameid}/assists/{ticketid}
     * @param { any } packet message details
     * @param { string } id document id
     * @param { string } chatGptKey api key from user profile
     * @return { Promise<void> }
     */
    static async _processTicket(packet: any, id: string, chatGptKey: string): Promise<void> {
        let aiResponse: any = {};
        try {
            const response: any = await fetch(`https://api.openai.com/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + chatGptKey,
                },
                body: JSON.stringify(packet.aiRequest),
            });

            const assist: any = await response.json();
            aiResponse = {
                success: true,
                created: new Date().toISOString(),
                assist,
            };
        } catch (aiRequestError: any) {
            aiResponse = {
                success: false,
                created: new Date().toISOString(),
                error: aiRequestError,
            };
        }
        await firebaseAdmin.firestore().doc(`Games/${packet.gameNumber}/assists/${id}`).set(aiResponse);
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
        return res.status(200).send({
            success: true,
        });
    }
}
