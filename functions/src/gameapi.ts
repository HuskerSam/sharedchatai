import * as firebaseAdmin from "firebase-admin";
import {
  BaseClass,
} from "./baseclass";
import SessionAPI from "./sessionapi";
import SharedWithBackend from "./../../public/uicode/sharedwithbackend";
import {
  FieldValue,
} from "firebase-admin/firestore";

/** GameAPI for managing game records and base functions for 2D games */
export default class GameAPI {
  /** gets a unique 5 digit game slug
   * @param { any } collection gametype store name
   * @return { string } 5 digit game slug
   */
  static async _getUniqueGameSlug(collection: string): Promise<string> {
    /** get a single random digit
     * @return { string } single digit
     */
    function getDigit() {
      let char = "a";
      const charNum = Math.floor(Math.random() * 35);
      if (charNum < 10) char = charNum.toString();
      else char = String.fromCharCode(charNum - 10 + "a".charCodeAt(0));

      return char;
    }

    let slug = "";
    const numDigits = 12;
    for (let c = 0; c < numDigits; c++) slug += getDigit();

    const gameTest = await firebaseAdmin.firestore().doc(`${collection}/${slug}`).get();
    if (gameTest.data()) {
      return GameAPI._getUniqueGameSlug(collection);
    }

    return slug;
  }
  /** recursive delete collection in batches
   * @param { any } db firestore db instance
   * @param { string } collectionPath path
   * @param { number } batchSize number of documents to delete per recursive call (batch)
   * @return { any } promise that resolves once collection is deleted
   */
  static async deleteCollection(db: any, collectionPath: string, batchSize: number): Promise<any> {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy("__name__").limit(batchSize);

    return new Promise((resolve, reject) => {
      GameAPI.deleteQueryBatch(db, query, resolve).catch(reject);
    });
  }
  /** internal delete query batch call (calls resolve when complete)
   * @param { any } db firestore db instance
   * @param { any } query delete firestore query object
   * @param { function } resolve resolve function for promise
  */
  static async deleteQueryBatch(db: any, query: any, resolve: any) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
      // When there are no documents left, we are done
      resolve();
      return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
      GameAPI.deleteQueryBatch(db, query, resolve);
    });
  }
  /** http endpoint for create game
   * @param { any } req http request object
   * @param { any } res http response object
   */
  static async create(req: any, res: any): Promise<any> {
    const authResults = await BaseClass.validateCredentials(req.headers.token);
    if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

    const uid = authResults.uid;
    const localInstance = BaseClass.newLocalInstance();
    await localInstance.init();
    const userQ = await firebaseAdmin.firestore().doc(`Users/${uid}`).get();
    const profile = userQ.data();
    if (!profile) {
      return BaseClass.respondError(res, "User not found");
    }
    if (authResults.provider_id && authResults.provider_id.toLowerCase() === "anonymous") {
      return BaseClass.respondError(res, "Sessions can't be created while anonymous");
    }

    let label = "";
    if (req.body.label) label = req.body.label;

    let note = "";
    if (req.body.note) note = req.body.note;

    let title = "";
    if (req.body.title) title = req.body.title;

    let systemMessage = "";
    if (req.body.systemMessage) systemMessage = req.body.systemMessage;

    let creditUsageLimit = 1000;
    if (req.body.creditUsageLimit) creditUsageLimit = req.body.creditUsageLimit;

    let firstPrompt = "";
    if (req.body.firstPrompt) firstPrompt = req.body.firstPrompt;

    let includePromptsInContext = true;
    if (req.body.includePromptsInContext !== undefined) includePromptsInContext = req.body.includePromptsInContext;

    const model = req.body.model;
    const modelLock = req.body.model_lock;

    const game: any = {};
    Object.assign(game, BaseClass.defaultChatDocumentOptions());
    Object.assign(game,
      {
        createUser: uid,
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        visibility: "private",
        archived: false,
        totalTokens: 0,
        completionTokens: 0,
        promptTokens: 0,
        creditUsageLimit,
        label,
        note,
        title,
        systemMessage,
        model,
        model_lock: modelLock,
        includePromptsInContext,
      });
    const modelDefaults = SharedWithBackend.getModelMeta(model);
    Object.assign(game, modelDefaults.defaults);

    if (req.body.visibility) game.visibility = req.body.visibility;
    game.publicStatus = GameAPI._publicStatus(game);

    const gameNumber = await GameAPI._getUniqueGameSlug("Games");
    game.gameNumber = gameNumber;

    let displayName = BaseClass.escapeHTML(profile.displayName);
    let displayImage = profile.displayImage;

    if (!displayName) displayName = "New User";
    if (!displayImage) displayImage = "";

    game.members = {
      [uid]: new Date().toISOString(),
    };
    game.memberNames = {
      [uid]: displayName,
    };
    game.memberImages = {
      [uid]: displayImage,
    };
    await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).set(game);

    if (firstPrompt) {
      const mockReq: any = {
        headers: {
          token: req.headers.token,
        },
        body: {
          gameNumber,
          message: firstPrompt,
          includeTickets: [],
          includeInMessage: includePromptsInContext,
        },
      };
      return SessionAPI.submitTicket(mockReq, res);
    }

    return res.status(200).send({
      success: true,
      gameNumber,
    });
  }
  /** http endpoint for delete game
   * @param { any } req http request object
   * @param { any } res http response object
   */
  static async delete(req: any, res: any) {
    const authResults = await BaseClass.validateCredentials(req.headers.token);
    if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

    const uid = authResults.uid;

    const localInstance = BaseClass.newLocalInstance();
    await localInstance.init();

    const gameNumber = req.body.gameNumber;

    const sessionDocumentDataRef = firebaseAdmin.firestore().doc(`Games/${gameNumber}`);
    const sessionDocumentDataQuery = await sessionDocumentDataRef.get();
    const sessionDocumentData = sessionDocumentDataQuery.data();
    let success = false;
    if (sessionDocumentData && sessionDocumentData.createUser === uid) {
      await sessionDocumentDataRef.delete();
      await GameAPI.deleteCollection(firebaseAdmin.firestore(), `Games/${gameNumber}/messages`, 50);
      await GameAPI.deleteCollection(firebaseAdmin.firestore(), `Games/${gameNumber}/tickets`, 50);
      await GameAPI.deleteCollection(firebaseAdmin.firestore(), `Games/${gameNumber}/augmented`, 50);
      await GameAPI.deleteCollection(firebaseAdmin.firestore(), `Games/${gameNumber}/assists`, 50);
      await GameAPI.deleteCollection(firebaseAdmin.firestore(), `Games/${gameNumber}/packets`, 50);
      success = true;
    }

    return res.status(200).send({
      success,
    });
  }
  /** http endpoint for game owner options update
   * @param { any } req http request object
   * @param { any } res http response object
   */
  static async ownerOptions(req: any, res: any) {
    const authResults = await BaseClass.validateCredentials(req.headers.token);
    if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

    const uid = authResults.uid;
    const gameNumber = req.body.gameNumber;

    const localInstance = BaseClass.newLocalInstance();
    await localInstance.init();

    const gameQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).get();
    const sessionDocumentData = gameQuery.data();
    if (!sessionDocumentData) {
      return BaseClass.respondError(res, "Game not found");
    }

    const userQ = await firebaseAdmin.firestore().doc(`Users/${uid}`).get();
    const profile = userQ.data();
    if (!profile) {
      return BaseClass.respondError(res, "User not found");
    }

    if (uid !== sessionDocumentData.createUser) {
      return BaseClass.respondError(res, "Must be owner to set owner options");
    }

    const updatePacket: any = {};
    if (req.body.archived !== undefined) {
      updatePacket.archived = req.body.archived;
      sessionDocumentData.archived = updatePacket.archived;
    }

    if (req.body.creditUsageLimit !== undefined) {
      const creditUsageLimit = BaseClass.getNumberOrDefault(req.body.creditUsageLimit, 0);
      updatePacket.creditUsageLimit = creditUsageLimit;
    }

    if (req.body.label !== undefined) {
      updatePacket.label = req.body.label;
    }
    if (req.body.note !== undefined) {
      updatePacket.note = req.body.note;
    }
    if (req.body.title !== undefined) {
      updatePacket.title = req.body.title;
    }
    if (req.body.model_lock !== undefined) {
      updatePacket.model_lock = req.body.model_lock;
    }
    if (req.body.pineconeKey !== undefined) {
      updatePacket.pineconeKey = req.body.pineconeKey;
    }
    if (req.body.pineconeEnvironment !== undefined) {
      updatePacket.pineconeEnvironment = req.body.pineconeEnvironment;
    }
    if (req.body.pineconeTopK !== undefined) {
      updatePacket.pineconeTopK = req.body.pineconeTopK;
    }
    if (req.body.pineconeIndex !== undefined) {
      updatePacket.pineconeIndex = req.body.pineconeIndex;
    }

    updatePacket.publicStatus = GameAPI._publicStatus(sessionDocumentData);

    await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).set(updatePacket, {
      merge: true,
    });

    return res.status(200).send({
      success: true,
    });
  }
  /** http endpoint for game options update
 * @param { any } req http request object
 * @param { any } res http response object
 */
  static async options(req: any, res: any) {
    const authResults = await BaseClass.validateCredentials(req.headers.token);
    if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

    const uid = authResults.uid;
    const gameNumber = req.body.gameNumber;

    const localInstance = BaseClass.newLocalInstance();
    await localInstance.init();

    const gameQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).get();
    const sessionDocumentData = gameQuery.data();
    if (!sessionDocumentData) {
      return BaseClass.respondError(res, "Game not found");
    }

    const userQ = await firebaseAdmin.firestore().doc(`Users/${uid}`).get();
    const profile = userQ.data();
    if (!profile) {
      return BaseClass.respondError(res, "User not found");
    }

    const fieldsFilter = [
      "model",
      "model_lock",
      "max_tokens",
      "temperature",
      "top_p",
      "top_k",
      "presence_penalty",
      "frequency_penalty",
      "title",
      "systemMessage",
      "includeUserNames",
      "includePromptsInContext",
      "enableEmbedding",
      "promptMainTemplate",
      "promptDocumentTemplate",
    ];
    const updatePacket: any = {};
    fieldsFilter.forEach((field: string) => {
      if (req.body[field] !== undefined) {
        const value = req.body[field];
        if (sessionDocumentData[field] !== value) {
          updatePacket[field] = value;
          sessionDocumentData[field] = value;
        }
      }
    });
    updatePacket.publicStatus = GameAPI._publicStatus(sessionDocumentData);

    await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).set(updatePacket, {
      merge: true,
    });

    return res.status(200).send({
      success: true,
    });
  }
  /** http endpoint for getting embedding/pinecone data
   * @param { any } req http request object
   * @param { any } res http response object
   */
  static async viewOwnerOnlyData(req: any, res: any) {
    const authResults = await BaseClass.validateCredentials(req.headers.token);
    if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

    const uid = authResults.uid;
    const gameNumber = req.body.gameNumber;

    const localInstance = BaseClass.newLocalInstance();
    await localInstance.init();

    const gameQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).get();
    const sessionDocumentData = gameQuery.data();
    if (!sessionDocumentData) {
      return BaseClass.respondError(res, "Game not found");
    }

    const userQ = await firebaseAdmin.firestore().doc(`Users/${uid}`).get();
    const profile = userQ.data();
    if (!profile) {
      return BaseClass.respondError(res, "User not found");
    }
    if (uid !== sessionDocumentData.createUser) {
      return BaseClass.respondError(res, "Must be owner to view owner only information");
    }

    const ownerDataQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}/ownerPrivate/internalPineconeConfiguration`).get();
    let ownerData = ownerDataQuery.data();
    if (!ownerData) ownerData = {};
    return res.status(200).send({
      success: true,
      ownerData,
    });
  }
  /** http endpoint for setting embedding/pinecone data
   * send up a updatePacket in the body to merge
   * @param { any } req http request object
   * @param { any } res http response object
   */
  static async setOwnerOnlyData(req: any, res: any) {
    const authResults = await BaseClass.validateCredentials(req.headers.token);
    if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

    const uid = authResults.uid;
    const gameNumber = req.body.gameNumber;

    const localInstance = BaseClass.newLocalInstance();
    await localInstance.init();

    const gameQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).get();
    const sessionDocumentData = gameQuery.data();
    if (!sessionDocumentData) {
      return BaseClass.respondError(res, "Game not found");
    }

    const userQ = await firebaseAdmin.firestore().doc(`Users/${uid}`).get();
    const profile = userQ.data();
    if (!profile) {
      return BaseClass.respondError(res, "User not found");
    }
    if (uid !== sessionDocumentData.createUser) {
      return BaseClass.respondError(res, "Must be owner to view owner only information");
    }

    const privateUpdatePacket: any = Object.assign({}, req.body.updatePacket);
    const keys = Object.keys(privateUpdatePacket);
    const sessionUpdatePacket: any = {};
    keys.forEach((key: string) => {
      const sessionKey = "hashed_" + key;
      const data = privateUpdatePacket[key].slice(-8);
      sessionUpdatePacket[sessionKey] = SharedWithBackend.hashCode(data);
    });

    await firebaseAdmin.firestore().doc(`Games/${gameNumber}/ownerPrivate/internalPineconeConfiguration`).set(privateUpdatePacket, {
      merge: true,
    });

    await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).set(sessionUpdatePacket, {
      merge: true,
    });

    return res.status(200).send({
      success: true,
    });
  }
  /** http endpoint for join game refreshes user display name, image and member: date
   * @param { any } req http request object
   * @param { any } res http response object
   */
  static async join(req: any, res: any) {
    const authResults = await BaseClass.validateCredentials(req.headers.token);
    if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

    const uid = authResults.uid;
    const gameNumber = req.body.gameNumber;

    const localInstance = BaseClass.newLocalInstance();
    await localInstance.init();

    const gameQuery = await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).get();
    const sessionDocumentData = gameQuery.data();
    if (!sessionDocumentData) {
      return BaseClass.respondError(res, "Game not found");
    }

    const userQ = await firebaseAdmin.firestore().doc(`Users/${uid}`).get();
    const profile = userQ.data();
    if (!profile) {
      return BaseClass.respondError(res, "User not found");
    }

    let displayName = BaseClass.escapeHTML(profile.displayName);
    let displayImage = profile.displayImage;

    if (!displayName) displayName = "New User";
    if (!displayImage) displayImage = "";

    const updatePacket: any = {
      memberNames: {
        [uid]: displayName,
      },
      memberImages: {
        [uid]: displayImage,
      },
    };

    if (!sessionDocumentData.members[uid]) {
      updatePacket.lastActivity = new Date().toISOString();
      updatePacket.members = {
        [uid]: new Date().toISOString(),
      };
    }

    await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).set(updatePacket, {
      merge: true,
    });

    return res.status(200).send({
      success: true,
    });
  }
  /** http endpoint for leave game
   * @param { any } req http request object
   * @param { any } res http response object
   */
  static async leave(req: any, res: any) {
    const authResults = await BaseClass.validateCredentials(req.headers.token);
    if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

    const uid = authResults.uid;
    const gameNumber = req.body.gameNumber;

    const localInstance = BaseClass.newLocalInstance();
    await localInstance.init();

    const sessionDocumentData = await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).get();
    if (!sessionDocumentData.data()) {
      return BaseClass.respondError(res, "Game not found");
    }

    const game: any = sessionDocumentData.data();
    if (uid === game.createUser) return BaseClass.respondError(res, "Owner has to stay in session (delete)");

    const updatePacket: any = {
      members: {
        [uid]: FieldValue.delete(),
      },
    };
    for (let c = 0, l = game.numberOfSeats; c < l; c++) {
      if (game["seat" + c.toString()] === uid) updatePacket["seat" + c.toString()] = null;
    }

    await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).set(updatePacket, {
      merge: true,
    });

    return res.status(200).send({
      success: true,
    });
  }
  /** get public status string sortable string
   * @param { any } game game data
   * @return { string } sortable game type and status string
   */
  static _publicStatus(game: any): string {
    return game.visibility + "Open";
  }
  /** check if any seats are empty
   * @param { any } game game data object
   * @return { boolean } true if available set
   */
  static _emptySeat(game: any): boolean {
    for (let c = 0; c < game.numberOfSeats; c++) {
      if (game["seat" + c.toString()] === null) return true;
    }
    return false;
  }
  /** trigger function for user meta change
   * @param { any } change after trigger change dictionary
   * @param { any } context of trigger call
   */
  static async updateUserMetaData(change: any, context: any) {
    let before = change.before.data();
    const after = change.after.data();
    if (!before) before = {};
    if (!after) return;
    const nameChange = (before.displayName !== after.displayName);
    const imageChange = (before.displayImage !== after.displayImage);

    if (nameChange) {
      await GameAPI._updateMetaNameForUser(context.params.uid);
    }
    if (imageChange) {
      await GameAPI._updateMetaImageForUser(context.params.uid);
    }
  }
  /** update all game records with udpated name for user
   * @param { string } uid user id
   */
  static async _updateMetaNameForUser(uid: string) {
    const freshUser = <any>await firebaseAdmin.firestore().doc(`Users/${uid}`).get();

    let name: string = freshUser.data().displayName;
    if (!name) name = "New User";

    const gamesQuery = await firebaseAdmin.firestore().collection(`Games`)
      .where("members." + uid, ">", "").get();

    const promises: Array<any> = [];
    gamesQuery.docs.forEach((doc) => {
      promises.push(firebaseAdmin.firestore().collection(`Games`).doc(doc.id).set({
        memberNames: {
          [uid]: name,
        },
      }, {
        merge: true,
      }));
    });

    await Promise.all(promises);

    return;
  }
  /** update all game records with udpated image for user
   * @param { string } uid user id
   */
  static async _updateMetaImageForUser(uid: string) {
    const freshUser = <any>await firebaseAdmin.firestore().doc(`Users/${uid}`).get();

    let image: string | null | undefined = freshUser.data().displayImage;
    if (!image) image = "";

    const gamesQuery = await firebaseAdmin.firestore().collection(`Games`)
      .where("members." + uid, ">", "").get();

    const promises: Array<any> = [];
    gamesQuery.docs.forEach((doc) => {
      promises.push(firebaseAdmin.firestore().collection(`Games`).doc(doc.id).set({
        memberImages: {
          [uid]: image,
        },
      }, {
        merge: true,
      }));
    });

    await Promise.all(promises);

    return;
  }
}
