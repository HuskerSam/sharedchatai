import * as functions from "firebase-functions";
import * as firebaseAdmin from "firebase-admin";
import express from "express";
import cors from "cors";
import path from "path";
const gameAPIApp = express();

import GameAPI from "./gameapi";
import ChatAI from "./aichatapi";

gameAPIApp.set("views", path.join(__dirname, "views"));
gameAPIApp.set("view engine", "ejs");

firebaseAdmin.initializeApp();
const runtimeOpts: functions.RuntimeOptions = {
    timeoutSeconds: 300,
    memory: "128MB",
  };

gameAPIApp.use(cors({
    origin: true,
}));

export const lobbyApi = functions.runWith(runtimeOpts).https.onRequest(gameAPIApp);

export const updateDisplayNames = functions.firestore
    .document("Users/{uid}").onWrite(async (change, context) => GameAPI.updateUserMetaData(change, context));

gameAPIApp.post("/games/create", async (req, res) => GameAPI.create(req, res));
gameAPIApp.post("/games/delete", async (req, res) => GameAPI.delete(req, res));
gameAPIApp.post("/games/join", async (req, res) => GameAPI.join(req, res));
gameAPIApp.post("/games/leave", async (req, res) => GameAPI.leave(req, res));
gameAPIApp.post("/games/options", async (req, res) => GameAPI.options(req, res));
gameAPIApp.post("/games/owner/options", async (req, res) => GameAPI.ownerOptions(req, res));

gameAPIApp.post("/aichat/message", async (req, res) => ChatAI.submitTicket(req, res));
gameAPIApp.post("/aichat/message/delete", async (req, res) => ChatAI.deleteTicket(req, res));
gameAPIApp.post("/aichat/message/include", async (req, res) => ChatAI.updateTicketIncludeStatus(req, res));
gameAPIApp.post("/aichat/message/import", async (req, res) => ChatAI.importTicket(req, res));
