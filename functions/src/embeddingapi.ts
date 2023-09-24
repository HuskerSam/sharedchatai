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
import {
    v4 as uuidv4,
} from "uuid";

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
        if (!batchId.trim) BaseClass.respondError(res, "index name required");
        const chatGptKey = localInstance.privateConfig.chatGPTKey;
        const pineconeKey = localInstance.privateConfig.pinecone;

        const pinecone = new Pinecone({
            apiKey: pineconeKey,
            environment: "gcp-starter",
        });
        const indexList = await pinecone.listIndexes();
        if (indexList.indexOf({
            name: batchId,
        }) === -1) {
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
            promises.push(EmbeddingAPI.scrapeURLAndSaveHTML(url, batchId, chatGptKey, pIndex));
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

            text = text.substring(0, 30000);
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
                id: uuidv4(),
                metadata: {
                    text,
                },
                values: embedding,
            };

            await pIndex.upsert([
                pEmbedding,
            ]);

            return true;
        }

        return false;
    }
}
