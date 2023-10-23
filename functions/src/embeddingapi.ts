import * as firebaseAdmin from "firebase-admin";
import BaseClass from "./baseclass";
import SharedWithBackend from "./uicode/sharedwithbackend";
import type {
    Request,
    Response,
} from "express";
import * as cheerio from "cheerio";
import fetch from "cross-fetch";
import {
    Pinecone,
} from "@pinecone-database/pinecone";

/** handle scraping webpages and embedding contents in pinecone */
export default class EmbeddingAPI {
    /**
   * @param { Request } req http request object
   * @param { Response } res http response object
   */
    static async scrapeURLs(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        // const uid = authResults.uid;
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const fileList = req.body.fileList;
        const batchId = req.body.batchId.toString().trim();
        if (!batchId.trim()) BaseClass.respondError(res, "index name required");
        const chatGptKey = localInstance.privateConfig.chatGPTKey;
        const pineconeKey = req.body.pineconeKey;
        const pineconeEnvironment = req.body.pineconeEnvironment;

        const pinecone = new Pinecone({
            apiKey: pineconeKey,
            environment: pineconeEnvironment,
        });
        const indexList = await pinecone.listIndexes();
        if (!EmbeddingAPI.testIfIndexExists(indexList, batchId)) {
            await pinecone.createIndex({
                name: batchId,
                dimension: 1536,
                metric: "cosine",
                waitUntilReady: true,
            });
        }
        const pIndex = pinecone.index(batchId);

        let promises: any = [];
        let fileUploadResults: Array<any> = [];
        for (let c = 0, l = fileList.length; c < l; c++) {
            const fileDesc = fileList[c];
            promises.push(EmbeddingAPI.upsertFileData(fileDesc, batchId, chatGptKey, pIndex));

            if (promises.length >= 20) {
                const uploadResults = await Promise.all(promises);
                fileUploadResults = fileUploadResults.concat(uploadResults);
                promises = [];
            }
        }

        const uploadResults = await Promise.all(promises);
        fileUploadResults = fileUploadResults.concat(uploadResults);
        res.send({
            fileUploadResults,
            success: true,
        });
    }
    /**
     * @param { string } url
     */
    static async _scrapeURL(url: string): Promise<any> {
        const result = await fetch(url);
        const html = await result.text();
        let text = "";
        let title = "";
        if (html) {
            const cheerioQuery = cheerio.load(html);
            cheerioQuery("h1, h2, h3, h4, h5, p").each((index: number, element: any) => {
                const t = cheerioQuery(element).text();
                if (t) text += t + "\n";
            });
            text = text.trim().substring(0, 100000);

            cheerioQuery("title").each((index: number, element: any) => {
                title = cheerioQuery(element).text();
            });
        }

        return {
            html,
            text,
            title,
        };
    }
    /**
     * @param { any } fileDesc
     * @param { string } batchId
     * @param { string } chatGptKey
     * @param { any } pIndex
     * @return { any } success: true - otherwise errorMessage: string is in map
    */
    static async upsertFileData(fileDesc: any, batchId: string, chatGptKey: string, pIndex: any) {
        let id = fileDesc.id;
        if (id === "") id = encodeURIComponent(fileDesc.url);
        if (id === "") {
            return {
                success: false,
                errorMessage: "id or url required",
            };
        }
        const url = fileDesc.url;
        let text = fileDesc.text;
        let title = "";
        let html = "";
        if (!text && url !== "") {
            const scrapeResult = await EmbeddingAPI._scrapeURL(fileDesc.url);
            text = scrapeResult.text;
            if (!text) {
                return {
                    success: false,
                    errorMessage: "url scrape failed to return data",
                };
            }
            title = scrapeResult.title;
            html = scrapeResult.html;
        } else if (!text && !url) {
            return {
                success: false,
                errorMessage: "text or url required",
            };
        }

        const overrideTitle = fileDesc.title.trim();
        if (overrideTitle !== "") title = overrideTitle;
        if (title === "") title = url.substring(0, 100);
        if (title === "") title = text.substring(0, 100);

        let prefixText = fileDesc.prefix.trim();
        if (prefixText !== "") {
            prefixText += "\n";
            text = prefixText + text;
        } 

        const embeddingModelResult = await EmbeddingAPI.encodeEmbedding(text, chatGptKey);
        const embedding = embeddingModelResult.vectorResult;
        const encodingTokens = embeddingModelResult.encodingTokens;
        const encodingCredits = embeddingModelResult.encodingCredits;

        const textSize = text.length;
        await firebaseAdmin.firestore().doc(`Embeddings/${batchId}/html/${id}`)
            .set({
                html,
                text,
                title,
                textSize,
                embedding,
                encodingTokens,
                encodingCredits,
            });

        const pEmbedding = {
            metadata: {
                text,
                url,
                title,
                encodingTokens,
                encodingCredits,
            },
            values: embedding,
            id: id,
        };

        await pIndex.upsert([
            pEmbedding,
        ]);

        return {
            success: true,
            id,
            url,
            text,
            title,
            textSize,
            encodingTokens,
            encodingCredits,
        };
    }
    /**
   * @param { Request } req http request object
   * @param { Response } res http response object
   */
    static async processQuery(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        // const uid = authResults.uid;
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const query = req.body.query.trim();

        if (!query) return BaseClass.respondError(res, "Query prompt required");
        const batchId = req.body.batchId.toString().trim();
        if (!batchId.trim()) BaseClass.respondError(res, "Index name required");
        const chatGptKey = localInstance.privateConfig.chatGPTKey;
        const response = await fetch(`https://api.openai.com/v1/embeddings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + chatGptKey,
            },
            body: JSON.stringify({
                "input": query,
                "model": "text-embedding-ada-002",
            }),
        });
        const json = await response.json();

        const vectorQuery = json["data"][0]["embedding"];
        const pineconeKey = req.body.pineconeKey;
        const pineconeEnvironment = req.body.pineconeEnvironment;
        const pinecone = new Pinecone({
            apiKey: pineconeKey,
            environment: pineconeEnvironment,
        });
        const indexList = await pinecone.listIndexes();
        if (!EmbeddingAPI.testIfIndexExists(indexList, batchId)) {
            return BaseClass.respondError(res, "Index not found or not ready");
        }
        const pIndex = pinecone.index(batchId);

        const opts = {
            topK: 3,
            vector: vectorQuery,
            includeMetadata: true,
        };
        const queryResponse = await pIndex.query(opts);

        res.send({
            success: true,
            queryResponse,
        });
    }
    /**
     * @param { string } data
     * @param { string } chatGptKey
     * @return { Promise<any> }
     */
    static async encodeEmbedding(data: string, chatGptKey: string): Promise<any> {
        let vectorResult = null;
        let success = true;
        let error = null;
        let fullResult: any = {};
        let encodingTokens = 0;
        let encodingCredits = 0;
        try {
            const response = await fetch(`https://api.openai.com/v1/embeddings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + chatGptKey,
                },
                body: JSON.stringify({
                    "input": data,
                    "model": "text-embedding-ada-002",
                }),
            });
            fullResult = await response.json();
            vectorResult = fullResult["data"][0]["embedding"];
            encodingTokens = fullResult.usage.total_tokens;
            const modelMeta = SharedWithBackend.getModelMeta("text-embedding-ada-002");
            encodingCredits = encodingTokens * modelMeta.input;
        } catch (err: any) {
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
     * @param { string } pineconeEnvironment
     * @param { string } pineconeTopK
     * @param { string } pineconeIndex
     * @return { Promise<any> }
     */
    static async queryPineconeDocuments(pineconeVectorData: any, pineconeKey: string, pineconeEnvironment: string,
        pineconeTopK: number, pineconeIndex: string): Promise<any> {
        let queryResponse = null;
        try {
            const pinecone = new Pinecone({
                apiKey: pineconeKey,
                environment: pineconeEnvironment,
            });
            const indexList = await pinecone.listIndexes();
            if (!EmbeddingAPI.testIfIndexExists(indexList, pineconeIndex)) {
                return {
                    success: false,
                    errorMessage: "Pinecone Index not found or not ready",
                };
            }
            const pIndex = pinecone.index(pineconeIndex);

            const opts = {
                topK: pineconeTopK,
                vector: pineconeVectorData,
                includeMetadata: true,
            };
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

        const batchId = req.body.batchId.toString().trim();
        if (!batchId.trim()) BaseClass.respondError(res, "index name required");

        const pineconeKey = req.body.pineconeKey;
        const pineconeEnvironment = req.body.pineconeEnvironment;

        const pinecone = new Pinecone({
            apiKey: pineconeKey,
            environment: pineconeEnvironment,
        });
        const indexList = await pinecone.listIndexes();
        if (!EmbeddingAPI.testIfIndexExists(indexList, batchId)) {
            return BaseClass.respondError(res, "Index not found or not ready");
        }

        await pinecone.deleteIndex(batchId);

        res.send({
            success: true,
        });
    }
    /**
     * @param { Array<any> } indexList
     * @param { string } indexName
     * @return { boolean }
    */
    static testIfIndexExists(indexList: Array<any>, indexName: string): boolean {
        let exists = false;
        indexList.forEach((i: any) => {
            if (i.name === indexName) exists = true;
        });

        return exists;
    }
}
