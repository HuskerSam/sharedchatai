import * as firebaseAdmin from "firebase-admin";
import BaseClass from "./baseclass";
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
    const numDigits = 8;
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

    let label = "";
    if (req.body.label) label = req.body.label;

    let note = "";
    if (req.body.note) note = req.body.note;

    let title = "";
    if (req.body.title) title = req.body.title;

    let tokenUsageLimit = 0;
    if (req.body.tokenUsageLimit) tokenUsageLimit = req.body.tokenUsageLimit;

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
        tokenUsageLimit,
        label,
        note,
        title,
      });
console.log(game);
    if (req.body.visibility) game.visibility = req.body.visibility;
    game.publicStatus = GameAPI._publicStatus(game);

    const gameNumber = await GameAPI._getUniqueGameSlug("Games");
    game.gameNumber = gameNumber;

    let displayName = BaseClass.escapeHTML(profile.displayName);
    let displayImage = profile.displayImage;

    if (!displayName) displayName = "Anonymous";
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

    return res.status(200).send({
      success: true,
      game,
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

    const gameDataRef = firebaseAdmin.firestore().doc(`Games/${gameNumber}`);
    const gameDataQuery = await gameDataRef.get();
    const gameData = gameDataQuery.data();
    let success = false;
    if (gameData && gameData.createUser === uid) {
      await gameDataRef.delete();
      await GameAPI.deleteCollection(firebaseAdmin.firestore(), `Games/${gameNumber}/messages`, 50);
      await GameAPI.deleteCollection(firebaseAdmin.firestore(), `Games/${gameNumber}/tickets`, 50);
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
    const gameData = gameQuery.data();
    if (!gameData) {
      return BaseClass.respondError(res, "Game not found");
    }

    const userQ = await firebaseAdmin.firestore().doc(`Users/${uid}`).get();
    const profile = userQ.data();
    if (!profile) {
      return BaseClass.respondError(res, "User not found");
    }

    if (uid !== gameData.createUser) {
      return BaseClass.respondError(res, "Must be owner to set owner options");
    }

    const updatePacket: any = {};
    if (req.body.archived) {
      const archived = (req.body.archived === "1");
      updatePacket.archived = archived;
      gameData.archived = archived;
    }

    if (req.body.tokenUsageLimit) {
      const tokenUsageLimit = BaseClass.getNumberOrDefault(req.body.tokenUsageLimit, 0);
      updatePacket.tokenUsageLimit = tokenUsageLimit;
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
    updatePacket.publicStatus = GameAPI._publicStatus(gameData);

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
    const gameData = gameQuery.data();
    if (!gameData) {
      return BaseClass.respondError(res, "Game not found");
    }

    const userQ = await firebaseAdmin.firestore().doc(`Users/${uid}`).get();
    const profile = userQ.data();
    if (!profile) {
      return BaseClass.respondError(res, "User not found");
    }

    const fieldsFilter = [
      "model",
      "max_tokens",
      "temperature",
      "top_p",
      "n",
      "presence_penalty",
      "frequency_penalty",
      "logit_bias",
      "stop",
      "title",
    ];
    const updatePacket: any = {};
    fieldsFilter.forEach((field: string) => {
      if (req.body[field]) {
        const value = req.body[field];
        if (gameData[field] !== value) {
          updatePacket[field] = value;
          gameData[field] = value;
        }
      }
    });

    updatePacket.publicStatus = GameAPI._publicStatus(gameData);

    await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).set(updatePacket, {
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
    const gameData = gameQuery.data();
    if (!gameData) {
      return BaseClass.respondError(res, "Game not found");
    }

    const userQ = await firebaseAdmin.firestore().doc(`Users/${uid}`).get();
    const profile = userQ.data();
    if (!profile) {
      return BaseClass.respondError(res, "User not found");
    }

    let displayName = BaseClass.escapeHTML(profile.displayName);
    let displayImage = profile.displayImage;

    if (!displayName) displayName = "Anonymous";
    if (!displayImage) displayImage = "";

    const updatePacket: any = {
      memberNames: {
        [uid]: displayName,
      },
      memberImages: {
        [uid]: displayImage,
      },
    };

    if (!gameData.members[uid]) {
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

    const gameData = await firebaseAdmin.firestore().doc(`Games/${gameNumber}`).get();
    if (!gameData.data()) {
      return BaseClass.respondError(res, "Game not found");
    }

    const game: any = gameData.data();
    if (uid === game.createUser) return BaseClass.respondError(res, "Owner has to stay in game");

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
    if (!name) name = "Anonymous";

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
    if (!image) image = "/images/defaultprofile.png";

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
