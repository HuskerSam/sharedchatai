import * as firebaseAdmin from "firebase-admin";
import {
    BaseClass,
} from "./baseclass";
import SharedWithBackend from "./../../public/uicode/sharedwithbackend";
import type {
    Request,
    Response,
} from "express";
import fetch from "cross-fetch";
import {
    Pinecone,
} from "@pinecone-database/pinecone";
import ScrapingAPI from "./scraping";

/** handle scraping webpages and embedding contents in pinecone */
export default class EmbeddingAPI {
    /**
   * @param { Request } req http request object
   * @param { Response } res http response object
   */
    static async upsertNext(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);
        const uid = authResults.uid;

        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        try {
            const pineconeIndex = req.body.pineconeIndex.toString().trim();
            if (!pineconeIndex.trim()) BaseClass.respondError(res, "index name required");
            const chatGptKey = localInstance.privateConfig.chatGPTKey;
            const pineconeKey = req.body.pineconeKey;
            const pineconeEnvironment = req.body.pineconeEnvironment;
            const tokenThreshold = req.body.tokenThreshold;
            const includeTextInMeta = req.body.includeTextInMeta === true;
            const projectId = req.body.projectId;
            const chunkingType = req.body.chunkingType;
            const overlap = req.body.overlap;
            const separators = req.body.separators;
            const singleRowId = req.body.singleRowId;
            const serverType = req.body.serverType;
            let rowCount = Number(req.body.rowCount);
            if (isNaN(rowCount)) rowCount = 1;
            if (rowCount < 1) rowCount = 1;
            if (rowCount > 50) rowCount = 50;

            const pinecone = new Pinecone({
                apiKey: pineconeKey,
            });
            const indexList: any = await pinecone.listIndexes();
            if (!EmbeddingAPI.testIfIndexExists(indexList, pineconeIndex)) {
                try {
                    const body: any = {
                        name: pineconeIndex,
                        dimension: 1536,
                        metric: "cosine",
                        waitUntilReady: true,
                        suppressConflicts: true,
                    };
                    if (serverType === "Serverless") {
                        body.spec = {
                            serverless: {
                                "cloud": "aws",
                                "region": pineconeEnvironment,
                            },
                        };
                    } else {
                        body.spec = {
                            pod: {
                                environment: pineconeEnvironment,
                                pods: 1,
                                podType: "p1.x1",
                            },
                        };
                    }

                    await pinecone.createIndex(body);
                } catch (createError: any) {
                    return BaseClass.respondError(res, createError.message, createError);
                }
            }
            const pIndex = pinecone.index(pineconeIndex);

            let fileUploadResults: any = [];
            try {
                const promises: any = [];
                if (singleRowId) {
                    // get the single
                    const singleQuery = await firebaseAdmin.firestore()
                        .doc(`Users/${uid}/embedding/${projectId}/data/${singleRowId}`)
                        .get();
                    let doc = singleQuery.data();
                    if (!doc) doc = {};
                    promises.push(EmbeddingAPI.upsertFileData(projectId, singleRowId, doc, chatGptKey,
                        uid, pIndex, tokenThreshold, includeTextInMeta, chunkingType, overlap, separators));
                } else {
                    // get oldest 50 new
                    const nextQuery = await firebaseAdmin.firestore()
                        .collection(`Users/${uid}/embedding/${projectId}/data`)
                        .where(`status`, "==", "New")
                        .orderBy("status")
                        .limit(rowCount)
                        .get();

                    nextQuery.forEach((doc: any) => {
                        promises.push(EmbeddingAPI.upsertFileData(projectId, doc.id, doc.data(), chatGptKey,
                            uid, pIndex, tokenThreshold, includeTextInMeta, chunkingType, overlap, separators));
                    });
                }
                fileUploadResults = await Promise.all(promises);
            } catch (error: any) {
                return BaseClass.respondError(res, error.message, error);
            }

            const promises: any = [];
            fileUploadResults.forEach((row: any) => {
                const lastActivity = new Date().toISOString();
                const savedRow = JSON.parse(JSON.stringify(row));
                const mergeBlock: any = {
                    lastActivity,
                };
                if (row["scrapeOnly"]) {
                    mergeBlock["errorMessage"] = "";
                    if (savedRow["text"]) mergeBlock["text"] = savedRow["text"];
                    mergeBlock["upsertedDate"] = lastActivity;
                    mergeBlock["include"] = false;
                    mergeBlock["status"] = "Done";
                } else if (row["errorMessage"]) {
                    mergeBlock["errorMessage"] = row["errorMessage"];
                    mergeBlock["pineconeTitle"] = "";
                    mergeBlock["pineconeId"] = "";
                    mergeBlock["size"] = 0;
                    mergeBlock["upsertedDate"] = lastActivity;
                    mergeBlock["include"] = false;
                    mergeBlock["vectorCount"] = 0;
                    mergeBlock["status"] = "Error";
                } else {
                    mergeBlock["errorMessage"] = "";
                    if (savedRow["title"]) mergeBlock["title"] = savedRow["title"];
                    mergeBlock["ids"] = savedRow["ids"];
                    mergeBlock["size"] = savedRow["textSize"];
                    if (savedRow["text"]) mergeBlock["text"] = savedRow["text"];
                    mergeBlock["upsertedDate"] = lastActivity;
                    mergeBlock["include"] = false;
                    mergeBlock["vectorCount"] = row["idList"].length;
                    mergeBlock["status"] = "Done";
                }

                promises.push(
                    firebaseAdmin.firestore().doc(`Users/${uid}/embedding/${projectId}/data/${row.id}`)
                        .set(mergeBlock, {
                            merge: true,
                        }));
            });
            await Promise.all(promises);

            return res.send({
                fileUploadResults,
                success: true,
            });
        } catch (wrapperErr: any) {
            return BaseClass.respondError(res, wrapperErr.message, wrapperErr);
        }
    }
    /**
    * @param { Request } req http request object
    * @param { Response } res http response object
    */
    static async scrapeURL(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(req.headers.token as string);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const url = req.body.url;
        const options = req.body.options;
        const chatGptKey = localInstance.privateConfig.chatGPTKey;

        const result = await ScrapingAPI.processURL(authResults.uid, chatGptKey, url, options);
        return res.status(200).send(result);
    }
    /**
     * @param { any } chunk
     * @param { string } chatGptKey
     * @param { string } uid
     * @param { string } id
     * @param { string } title
     * @param { string } url
     * @param { any } additionalMetaData
     * @param { boolean } includeTextInMeta
     * @return { Promise<any> }
     */
    static async prepChunkForPinecone(chunk: any, chatGptKey: string, uid: string,
        id: string, title: string, url: string, additionalMetaData: any = {}, includeTextInMeta = true): Promise<any> {
        const text = chunk.text;
        const embeddingModelResult = await EmbeddingAPI.encodeEmbedding(text, chatGptKey, uid);
        if (!embeddingModelResult.success) {
            console.log(embeddingModelResult);
            throw new Error("embedding failed");
        }
        const embedding = embeddingModelResult.vectorResult;
        const encodingTokens = embeddingModelResult.encodingTokens;
        const encodingCredits = embeddingModelResult.encodingCredits;

        const metadata: any = {
            url,
            title,
        };

        if (includeTextInMeta) metadata.text = text;
        Object.assign(metadata, additionalMetaData);
        const pEmbedding = {
            metadata,
            values: embedding,
            id: id,
        };

        return {
            pEmbedding,
            encodingTokens,
            encodingCredits,
        };
    }
    /**
     * @param { string } projectId
     * @param { string } rowId
     * @param { any } fileDesc
     * @param { string } chatGptKey
     * @param { string } uid
     * @param { any } pIndex
     * @param { number } tokenThreshold
     * @param { boolean } includeTextInMeta
     * @param { string } chunkingType
     * @param { number } overlap
     * @param { string } separators
     * @return { any } success: true - otherwise errorMessage: string is in map
    */
    static async upsertFileData(projectId: string, rowId: string, fileDesc: any, chatGptKey: string, uid: string, pIndex: any,
        tokenThreshold: number, includeTextInMeta: boolean, chunkingType: string, overlap: number,
        separators: string) {
        try {
            await firebaseAdmin.firestore().doc(`Users/${uid}/embedding/${projectId}/data/${rowId}`)
                .set({
                    status: "Processing",
                }, {
                    merge: true,
                });
            return await EmbeddingAPI._upsertFileData(projectId, fileDesc, chatGptKey, uid,
                pIndex, tokenThreshold, includeTextInMeta, chunkingType, overlap, separators);
        } catch (error: any) {
            return {
                id: fileDesc.id,
                success: false,
                errorMessage: error.message,
                error,
            };
        }
    }
    /**
     * @param { string } projectId
     * @param { any } fileDesc
     * @param { string } chatGptKey
     * @param { string } uid
     * @param { any } pIndex
     * @param { number } tokenThreshold
     * @param { boolean } includeTextInMeta
     * @param { string } chunkingType
     * @param { number } overlap
     * @param { string } separators
     * @return { any } success: true - otherwise errorMessage: string is in map
    */
    static async _upsertFileData(projectId: string, fileDesc: any, chatGptKey: string, uid: string, pIndex: any,
        tokenThreshold: number, includeTextInMeta: boolean, chunkingType: string, overlap: number,
        separators: string) {
        const id = fileDesc.id;
        if (id === "") {
            return {
                id,
                success: false,
                errorMessage: "id or url required",
            };
        }
        const url = fileDesc.url;
        const options = fileDesc.options;
        const optionsMap = ScrapingAPI.processOptions(options);
        let text = fileDesc.text;
        let title = "";
        if (!text && url !== "") {
            const scrapeResult = await ScrapingAPI.processURL(uid, chatGptKey, url, options);
            text = scrapeResult.text;
            if (!text) {
                return {
                    id,
                    success: false,
                    errorMessage: "url scrape failed to return data",
                };
            }
            if (text.length > 900000) {
                return {
                    id,
                    success: false,
                    errorMessage: `scraped text over 900k - ${text.length}`,
                };
            }
            if (optionsMap.scrapeOnly === "1") {
                return {
                    id,
                    scrapeOnly: true,
                    success: true,
                    text,
                    ids: id,
                    url,
                    title,
                    textSize: text.length,
                    encodingTokens: 0,
                    encodingCredits: 0,
                    idList: [id],
                };
            }
            title = scrapeResult.title;
        } else if (!text && !url) {
            return {
                id,
                success: false,
                errorMessage: "text or url required",
            };
        }

        const additionalMetaData: any = {};
        const fileDescKeys = Object.keys(fileDesc);
        fileDescKeys.forEach((key: string) => {
            if (key.substring(0, 5).toLocaleLowerCase() === "meta_") {
                additionalMetaData[key.substring(5)] = fileDesc[key];
            }
            if (key.substring(0, 6).toLocaleLowerCase() === "metan_") {
                const num = Number(fileDesc[key]) || 0;
                additionalMetaData[key.substring(6)] = num;
            }
        });

        const textChunks = await SharedWithBackend.parseBreakTextIntoChunks(tokenThreshold, chunkingType,
            overlap, separators, text);
        const overrideTitle = fileDesc.title.trim();
        if (overrideTitle !== "") title = overrideTitle;
        if (title === "") title = url.substring(0, 100);
        if (title === "") title = text.substring(0, 100);
        const textSize = text.length;

        let promises: any = [];
        const chunkCount = textChunks.length;
        const idList: Array<string> = [];
        const chunkMap: any = {};
        let upsertResults: any[] = [];
        for (let index = 0, l = textChunks.length; index < l; index++) {
            const chunk = textChunks[index];
            let pId = id;
            const paddedIndex = ("0000" + (index + 1)).slice(-5);
            if (chunkCount > 1) pId += "_" + paddedIndex + "_" + chunkCount;
            promises.push(EmbeddingAPI.prepChunkForPinecone(chunk, chatGptKey, uid,
                pId, title, url, additionalMetaData, includeTextInMeta));
            idList.push(pId);
            chunkMap[pId] = chunk.text;
        }
        let encodingCredits = 0;
        let encodingTokens = 0;
        const tempResults: any[] = await Promise.all(promises);
        const embeddings = tempResults.map((chunk: any) => chunk.pEmbedding);

        promises = [];
        let batch: any[] = [];
        for (let c = 0, l = embeddings.length; c < l; c++) {
            const embedding = embeddings[c];
            batch.push(embedding);
            if (batch.length >= 90) {
                await pIndex.upsert(batch);
                batch = [];
            }
        }
        if (batch.length > 0) {
            await pIndex.upsert(batch);
        }

        const bucket = firebaseAdmin.storage().bucket();
        const filePath = `projectLookups/${uid}/${projectId}/byDocument/${fileDesc.id}.json`;
        const file = bucket.file(filePath);

        const storageOptions = {
            resumable: false,
            metadata: {
                contentType: "application/json",
            },
        };
        await file.save(JSON.stringify(chunkMap), storageOptions);
        await file.makePublic();

        upsertResults = upsertResults.concat(tempResults);
        upsertResults.forEach((result: any) => {
            encodingTokens += result.encodingTokens;
            encodingCredits += result.encodingCredits;
        });

        return {
            success: true,
            ids: idList.join(","),
            url,
            text,
            title,
            textSize,
            encodingTokens,
            encodingCredits,
            idList,
            id,
        };
    }
    /**
     * @param { number } ms
     */
    static async sleep(ms: number) {
        return new Promise((resolve: any) => {
            setTimeout(resolve, ms);
        });
    }
    /**
   * @param { Request } req http request object
   * @param { Response } res http response object
   */
    static async processQuery(req: Request, res: Response) {
        try {
            const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
            if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

            // const uid = authResults.uid;
            const localInstance = BaseClass.newLocalInstance();
            await localInstance.init();

            const query = req.body.query.trim();
            let topK = 3;
            if (req.body.topK !== undefined) topK = req.body.topK;

            if (!query) return BaseClass.respondError(res, "Query prompt required");
            const pineconeIndex = req.body.pineconeIndex.toString().trim();
            if (!pineconeIndex.trim()) BaseClass.respondError(res, "Index name required");
            const chatGptKey = localInstance.privateConfig.chatGPTKey;
            const response = await fetch(`https://api.openai.com/v1/embeddings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + chatGptKey,
                },
                body: JSON.stringify({
                    "input": query,
                    "model": "text-embedding-3-small",
                }),
            });
            const json = await response.json();
            const vectorQuery = json["data"][0]["embedding"];
            const pineconeKey = req.body.pineconeKey;
            const pinecone = new Pinecone({
                apiKey: pineconeKey,
            });
            const indexList: any = await pinecone.listIndexes();
            if (!EmbeddingAPI.testIfIndexExists(indexList, pineconeIndex)) {
                return BaseClass.respondError(res, "Index not found or not ready");
            }
            const pIndex = pinecone.index(pineconeIndex);

            const opts = {
                topK,
                vector: vectorQuery,
                includeMetadata: true,
            };
            const queryResponse = await pIndex.query(opts);

            return res.send({
                success: true,
                queryResponse,
            });
        } catch (err: any) {
            return BaseClass.respondError(res, err.message, err);
        }
    }
    /**
     * @param { string } data
     * @param { string } chatGptKey
     * @param { string } uid for billing
     * @return { Promise<any> }
     */
    static async encodeEmbedding(data: string, chatGptKey: string, uid: string): Promise<any> {
        let vectorResult = null;
        let success = true;
        let error = null;
        let fullResult: any = {};
        let encodingTokens = 0;
        let encodingCredits = 0;
        /** */
        async function tryEmbed() {
            try {
                const response = await fetch(`https://api.openai.com/v1/embeddings`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + chatGptKey,
                    },
                    body: JSON.stringify({
                        "input": data,
                        "model": "text-embedding-3-small",
                        "dimensions": 1536,
                    }),
                });
                return await response.json();
            } catch (error: any) {
                return {
                    error,
                };
            }
        }
        try {
            fullResult = await tryEmbed();
            if (fullResult.error) {
                fullResult = await tryEmbed();
            }
            if (fullResult.error) {
                fullResult = await tryEmbed();
            }
            if (fullResult.error) {
                console.log("third try", fullResult);
                fullResult = await tryEmbed();
            }
            vectorResult = fullResult["data"][0]["embedding"];
            encodingTokens = fullResult.usage.total_tokens;
            const modelMeta = SharedWithBackend.getModelMeta("text-embedding-3-small");
            encodingCredits = encodingTokens * modelMeta.input + 0.5;

            await BaseClass._updateCreditUsageForUser(uid, "", "", encodingTokens, encodingTokens, 0, encodingCredits);
        } catch (err: any) {
            console.log("encode embedding error " + data, err);
            success = false;
            error = err;
        }

        return {
            success,
            fullResult,
            vectorResult,
            encodingTokens,
            encodingCredits,
            error,
        };
    }
    /**
     * @param { any } pineconeVectorData
     * @param { string } pineconeKey
     * @param { string } pineconeTopK
     * @param { string } pineconeIndex
     * @param { any } filter
     * @return { Promise<any> }
     */
    static async queryPineconeDocuments(pineconeVectorData: any, pineconeKey: string,
        pineconeTopK: number, pineconeIndex: string, filter: any): Promise<any> {
        let queryResponse = null;
        try {
            const pinecone = new Pinecone({
                apiKey: pineconeKey,
            });
            const indexList: any = await pinecone.listIndexes();
            if (!EmbeddingAPI.testIfIndexExists(indexList, pineconeIndex)) {
                return {
                    success: false,
                    errorMessage: "Pinecone Index not found or not ready",
                };
            }
            const pIndex = pinecone.index(pineconeIndex);

            const opts: any = {
                topK: pineconeTopK,
                vector: pineconeVectorData,
                includeMetadata: true,
            };
            if (filter) {
                opts.filter = filter;
            }
            queryResponse = await pIndex.query(opts);
        } catch (e: any) {
            return {
                success: false,
                error: e,
                errorMessage: e.message,
            };
        }

        return {
            success: true,
            queryResponse,
        };
    }
    /**
    * @param { Request } req http request object
    * @param { Response } res http response object
    */
    static async deleteIndex(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        // const uid = authResults.uid;
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const pineconeIndex = req.body.pineconeIndex.toString().trim();
        if (!pineconeIndex.trim()) BaseClass.respondError(res, "index name required");

        const pineconeKey = req.body.pineconeKey;

        const pinecone = new Pinecone({
            apiKey: pineconeKey,
        });
        const indexList: any = await pinecone.listIndexes();
        if (!EmbeddingAPI.testIfIndexExists(indexList, pineconeIndex)) {
            return BaseClass.respondError(res, "Index not found or not ready");
        }

        await pinecone.deleteIndex(pineconeIndex);

        res.send({
            success: true,
        });
    }
    /**
     * @param { any } indexList
     * @param { string } indexName
     * @return { boolean }
    */
    static testIfIndexExists(indexList: any, indexName: string): boolean {
        let exists = false;
        indexList.indexes.forEach((i: any) => {
            if (i.name === indexName) exists = true;
        });

        return exists;
    }
    /**
    * @param { Request } req http request object
    * @param { Response } res http response object
    */
    static async getPineconeIndexStats(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const pineconeIndex = req.body.pineconeIndex.toString().trim();
        if (!pineconeIndex.trim()) return BaseClass.respondError(res, "Index name required");
        const pineconeKey = req.body.pineconeKey;

        if (pineconeIndex === "" || pineconeKey === "") {
            return BaseClass.respondError(res, "Name, Environment or Key is empty");
        }

        try {
            const pinecone = new Pinecone({
                apiKey: pineconeKey,
            });
            const indexList: any = await pinecone.listIndexes();
            if (!EmbeddingAPI.testIfIndexExists(indexList, pineconeIndex)) {
                return BaseClass.respondError(res, `Index: [${pineconeIndex}] not found or not ready`);
            }

            const pIndex = pinecone.index(pineconeIndex);
            const indexDescription: any = await pIndex.describeIndexStats();

            res.send({
                indexDescription,
                success: true,
            });
        } catch (error: any) {
            console.log("pinecone unhandled error", error);
            console.log(error);
            return BaseClass.respondError(res, error.message, error);
        }
    }
    /**
    * @param { Request } req http request object
    * @param { Response } res http response object
    */
    static async deleteVectorById(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        // const uid = authResults.uid;
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const pineconeIndex = req.body.pineconeIndex.toString().trim();
        if (!pineconeIndex.trim()) BaseClass.respondError(res, "index name required");

        const vectorId = req.body.vectorId.toString().trim();
        const pineconeKey = req.body.pineconeKey;

        try {
            const pinecone = new Pinecone({
                apiKey: pineconeKey,
            });
            const indexList: any = await pinecone.listIndexes();
            if (!EmbeddingAPI.testIfIndexExists(indexList, pineconeIndex)) {
                return BaseClass.respondError(res, `Index: [${pineconeIndex}] not found or not ready`);
            }

            const pIndex = pinecone.index(pineconeIndex);
            await pIndex.deleteOne(vectorId);

            res.send({
                success: true,
            });
        } catch (error: any) {
            console.log("pinecone unhandled error", error);
            console.log(error);
            return BaseClass.respondError(res, error.message, error);
        }
    }
    /**
     * @param { Request } req http request object
     * @param { Response } res http response object
     */
    static async fetchVectorById(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        // const uid = authResults.uid;
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const pineconeIndex = req.body.pineconeIndex.toString().trim();
        if (!pineconeIndex.trim()) BaseClass.respondError(res, "index name required");

        const vectorId = req.body.vectorId.toString().trim();
        const pineconeKey = req.body.pineconeKey;

        try {
            const pinecone = new Pinecone({
                apiKey: pineconeKey,
            });
            const indexList: any = await pinecone.listIndexes();
            if (!EmbeddingAPI.testIfIndexExists(indexList, pineconeIndex)) {
                return BaseClass.respondError(res, `Index: [${pineconeIndex}] not found or not ready`);
            }

            const pIndex = pinecone.index(pineconeIndex);
            const opts = {
                id: vectorId,
                includeMetadata: true,
                includeValues: true,
                topK: 1,
            };
            const queryResponse = await pIndex.query(opts);

            res.send({
                response: queryResponse,
                success: true,
            });
        } catch (error: any) {
            console.log("pinecone unhandled error", error);
            console.log(error);
            return BaseClass.respondError(res, error.message, error);
        }
    }
    /**
     * @param { Request } req http request object
     * @param { Response } res http response object
     */
    static async generateExport(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);
        const uid = authResults.uid;

        const projectId = req.body.projectId;
        const exportMap: any = {};
        let docsSnapshot = await firebaseAdmin.firestore().collection(`Users/${uid}/embedding/${projectId}/data`).limit(100).get();
        while (docsSnapshot.size > 0) {
            docsSnapshot.forEach((doc: FirebaseFirestore.DocumentSnapshot) => {
                exportMap[doc.id] = doc.data();
            });

            const lastVisible = docsSnapshot.docs[docsSnapshot.docs.length - 1];
            docsSnapshot = await firebaseAdmin.firestore().collection(`Users/${uid}/embedding/${projectId}/data`)
                .startAfter(lastVisible)
                .limit(100)
                .get();
        }
        const bucket = firebaseAdmin.storage().bucket();
        const options = {
            resumable: false,
            metadata: {
                contentType: "application/json",
            },
        };

        const filePath = `projectExports/${uid}/${projectId}/export.json`;
        const file = bucket.file(filePath);
        const jsonString = JSON.stringify(exportMap);
        await file.save(jsonString, options);
        await file.makePublic();
        const encodedPath = encodeURIComponent(filePath);
        const publicPath = `https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/${encodedPath}?alt=media`;

        return res.send({
            success: true,
            filePath,
            publicPath,
            projectId,
        });
    }
}
