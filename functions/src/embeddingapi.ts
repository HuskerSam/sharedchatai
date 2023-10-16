import * as firebaseAdmin from "firebase-admin";
import BaseClass from "./baseclass";
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

        const urls = req.body.urls;
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

        const list = urls.split("\n");
        const promises: any = [];
        list.forEach((url: string) => {
            if (url.trim()) {
                promises.push(EmbeddingAPI.scrapeURLAndSaveHTML(url, batchId, chatGptKey, pIndex));
            }
        });
        await Promise.all(promises);
        res.send({
            success: true,
        });
    }
    /**
     * @param { string } url
     * @param { string } batchId
     * @param { string } chatGptKey
     * @param { any } pIndex
     * @return { boolean } true if url fetched and text saved
    */
    static async scrapeURLAndSaveHTML(url: string, batchId: string, chatGptKey: string, pIndex: any) {
        const result = await fetch(url);
        const html = await result.text();
        const safeUrl = encodeURIComponent(url);

        if (html) {
            const cheerioQuery = cheerio.load(html);
            let text = "";
            let elementCount = 0;
            cheerioQuery("h1, h2, h3, h4, h5, p").each((index, element) => {
                text += cheerioQuery(element).text() + "\n";
                elementCount++;
            });

            text = text.substring(0, 100000);
            if (!text) return false;

            const response = await fetch(`https://api.openai.com/v1/embeddings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + chatGptKey,
                },
                body: JSON.stringify({
                    "input": text,
                    "model": "text-embedding-ada-002",
                }),
            });

            const json = await response.json();
            const embedding = json.data[0].embedding;

            const textSize = text.length;
            await firebaseAdmin.firestore().doc(`Embeddings/${batchId}/html/${safeUrl}`)
                .set({
                    html,
                    text,
                    textSize,
                    elementCount,
                    embedding,
                });

            const pEmbedding = {
                metadata: {
                    text,
                    url,
                },
                values: embedding,
                id: safeUrl,
            };

            await pIndex.upsert([
                pEmbedding,
            ]);

            return true;
        }

        return false;
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
        } catch (err: any) {
            success = false;
            error = err;
        }

        return {
            success,
            fullResult,
            vectorResult,
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
