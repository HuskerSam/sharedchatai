import * as functions from "firebase-functions";
import * as firebaseAdmin from "firebase-admin";
import express from "express";
import cors from "cors";
const gameAPIApp = express();
const embeddingAPIApp = express();
const contentPagesApp = express();

import GameAPI from "./gameapi";
import SessionAPI from "./sessionapi";
import PaymentAPI from "./payapi";
import WebPage from "./webpage";
import EmbeddingAPI from "./embeddingapi";

firebaseAdmin.initializeApp();
const runtimeOpts: functions.RuntimeOptions = {
    timeoutSeconds: 300,
    memory: "512MB",
};
const heavyOpts: functions.RuntimeOptions = {
    timeoutSeconds: 300,
    memory: "1GB",
};
const homeOpts: functions.RuntimeOptions = {
    timeoutSeconds: 60,
    memory: "256MB",
    minInstances: 1,
};

const sitemapOpts: functions.RuntimeOptions = {
    timeoutSeconds: 60,
    memory: "512MB",
};

embeddingAPIApp.use(cors({
    origin: true,
}));
gameAPIApp.use(cors({
    origin: true,
}));
contentPagesApp.use(cors({
    origin: true,
}));

export const contentPage = functions.runWith(homeOpts).https.onRequest(contentPagesApp);
export const mediaPage = functions.runWith(homeOpts).https.onRequest(WebPage.mediaHTML);
export const aboutPage = functions.runWith(homeOpts).https.onRequest(WebPage.aboutHTML);

export const lobbyApi = functions.runWith(runtimeOpts).https.onRequest(gameAPIApp);
export const embeddingApi = functions.runWith(heavyOpts).https.onRequest(embeddingAPIApp);
export const updateDisplayNames = functions.firestore
.document("Users/{uid}").onWrite(async (change, context) => GameAPI.updateUserMetaData(change, context));
export const siteMap = functions.runWith(sitemapOpts).https.onRequest(WebPage.generateSiteXMLMap);

gameAPIApp.post("/games/create", async (req, res) => GameAPI.create(req, res));
gameAPIApp.post("/games/delete", async (req, res) => GameAPI.delete(req, res));
gameAPIApp.post("/games/join", async (req, res) => GameAPI.join(req, res));
gameAPIApp.post("/games/leave", async (req, res) => GameAPI.leave(req, res));
gameAPIApp.post("/games/options", async (req, res) => GameAPI.options(req, res));
gameAPIApp.post("/games/owner/options", async (req, res) => GameAPI.ownerOptions(req, res));
gameAPIApp.post("/games/owner/viewprivate", async (req, res) => GameAPI.viewOwnerOnlyData(req, res));
gameAPIApp.post("/games/owner/updateprivate", async (req, res) => GameAPI.setOwnerOnlyData(req, res));

gameAPIApp.post("/session/message", async (req, res) => SessionAPI.submitTicket(req, res));
gameAPIApp.post("/session/message/delete", async (req, res) => SessionAPI.deleteTicket(req, res));
gameAPIApp.post("/session/message/include", async (req, res) => SessionAPI.updateTicketIncludeStatus(req, res));
gameAPIApp.post("/session/message/import", async (req, res) => SessionAPI.importTicket(req, res));
gameAPIApp.post("/session/message/editresponse", async (req, res) => SessionAPI.editTicketResponse(req, res));
gameAPIApp.post("/session/message/bookmark", async (req, res) => SessionAPI.updateTicketBookmark(req, res));

gameAPIApp.post("/payment/order", async (req, res) => PaymentAPI.getNewOrder(req, res));
gameAPIApp.post("/payment/token", async (req, res) => PaymentAPI.getClientToken(req, res));
gameAPIApp.post("/payment/error", async (req, res) => PaymentAPI.postError(req, res));
gameAPIApp.post("/payment/capture", async (req, res) => PaymentAPI.postPayment(req, res));

embeddingAPIApp.post("/upsertnextdocuments", async (req, res) => EmbeddingAPI.upsertNext(req, res));
embeddingAPIApp.post("/processquery", async (req, res) => EmbeddingAPI.processQuery(req, res));
embeddingAPIApp.post("/deleteindex", async (req, res) => EmbeddingAPI.deleteIndex(req, res));
embeddingAPIApp.post("/indexstats", async (req, res) => EmbeddingAPI.getPineconeIndexStats(req, res));
embeddingAPIApp.post("/deletevector", async (req, res) => EmbeddingAPI.deleteVectorById(req, res));
embeddingAPIApp.post("/fetchvector", async (req, res) => EmbeddingAPI.fetchVectorById(req, res));
embeddingAPIApp.post("/scrapeurl", async (req, res) => EmbeddingAPI.scrapeURL(req, res));
embeddingAPIApp.post("/generatelookup", async (req, res) => EmbeddingAPI.generateLookup(req, res));
embeddingAPIApp.post("/exportjson", async (req, res) => EmbeddingAPI.generateExport(req, res));

gameAPIApp.post("/session/external/message", async (req, res) => SessionAPI.externalMessageRequest(req, res));
gameAPIApp.post("/session/external/vectorquery", async (req, res) => SessionAPI.externalVectorQuery(req, res));

contentPagesApp.get("/*", async (req, res) => WebPage.contentHTML(req, res));

