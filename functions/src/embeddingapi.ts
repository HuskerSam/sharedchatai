import * as firebaseAdmin from "firebase-admin";
import {
    BaseClass,
} from "./baseclass";
import SharedWithBackend from "./uicode/sharedwithbackend";
import type {
    Request,
    Response,
} from "express";
import {
    JSDOM,
} from "jsdom";
import fetch from "cross-fetch";
import {
    Pinecone,
} from "@pinecone-database/pinecone";
import PDFParser from "pdf2json";
import mime from "mime-types";
import * as OpenAI from "openai";
import fluentFfmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import ffprobe from "@ffprobe-installer/ffprobe";

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
        const tokenThreshold = req.body.tokenThreshold;

        const pinecone = new Pinecone({
            apiKey: pineconeKey,
            environment: pineconeEnvironment,
        });
        const indexList = await pinecone.listIndexes();
        if (!EmbeddingAPI.testIfIndexExists(indexList, batchId)) {
            try {
                await pinecone.createIndex({
                    name: batchId,
                    dimension: 1536,
                    metric: "cosine",
                    waitUntilReady: true,
                });
            } catch (createError: any) {
                return BaseClass.respondError(res, createError.message, createError);
            }
        }
        const pIndex = pinecone.index(batchId);

        let promises: any = [];
        let fileUploadResults: Array<any> = [];
        for (let c = 0, l = fileList.length; c < l; c++) {
            const fileDesc = fileList[c];
            promises.push(EmbeddingAPI.upsertFileData(fileDesc, batchId, chatGptKey, authResults.uid, pIndex, tokenThreshold));

            if (promises.length >= 40) {
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
    * @param { Request } req http request object
    * @param { Response } res http response object
    */
    static async scrapeURL(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const url = req.body.url;
        const options = req.body.options;
        const chatGptKey = localInstance.privateConfig.chatGPTKey;

        const result = await EmbeddingAPI._processURL(authResults.uid, chatGptKey, url, options);
        return res.status(200).send(result);
    }
    /**
     *
     * @param { any } data bytearray of file
     * @return { any }
     */
    static async getAudioFormat(data: any): Promise<any> {
        fluentFfmpeg.setFfprobePath(ffprobe.path);
        const audioFilePath = "/tmp/temp.mp3";
        await fs.writeFile(audioFilePath, Buffer.from(data));

        return new Promise((res, rej) => {
            fluentFfmpeg.ffprobe("/tmp/temp.mp3", (err: any, probeResult: any) => {
                if (err) rej(err);
                res(probeResult);
            });
        });
    }
    /**
     * @param { string } uid
     * @param { any } data
     * @param { string } filePath
     * @param { string } apiKey chatGPTKey
     * @param { string } model
     * @return { Promise<any> }
     */
    static async getTranscription(uid: string, data: any, filePath: string, apiKey: string, model = "whisper-1"): Promise<any> {
        try {
            const file = await OpenAI.toFile(data, filePath);
            const format = await EmbeddingAPI.getAudioFormat(data);
            const duration = Number(format.format.duration);
            if (isNaN(duration) || duration <= 0) {
                return {
                    success: false,
                    error: new Error("no duration detected for audio file"),
                };
            }
            console.log(format.format.duration);

            const openai = new OpenAI.OpenAI({
                apiKey,
            });

            const result: any = await openai.audio.transcriptions.create({
                file,
                model,
            });

            const modelMeta = SharedWithBackend.getModelMeta(model);
            const encodingTokens = Math.round(duration);
            const encodingCredits = Math.ceil(encodingTokens * modelMeta.input / 60) + 1;
            await BaseClass._updateCreditUsageForUser(uid, "", "", encodingTokens, encodingTokens, 0, encodingCredits);

            result.success = true;
            result.duration = duration;
            result.encodingCredits = encodingCredits;
            result.encodingTokens = encodingTokens;
            console.log(result);
            return result;
        } catch (error) {
            console.log(error);
            return {
                success: false,
                error,
            };
        }
    }
    /**
     * @param { string } options string with options split by || and key=value entries
     * @return { any }
     */
    static _processOptions(options: string): any {
        const opts = options.split("||");
        const optionsMap: any = {};
        opts.forEach((opt: string) => {
            const pieces = opt.trim().split("=");
            const key = pieces[0].trim();
            if (key !== "") {
                let value = "";
                if (pieces[1]) value = pieces[1];
                optionsMap[key] = value;
            }
        });

        return optionsMap;
    }
    /**
     * @param { string } uid
     * @param { string } chatGptKey
    * @param { string } url
    * @param { string } options
    */
    static async _processURL(uid: string, chatGptKey: string, url: string,
        options: string): Promise<any> {
        const fileResponse = await fetch(url);
        let mimeTypeResult: any = fileResponse.headers.get("content-type");

        if (mimeTypeResult !== "application/pdf" &&
            mimeTypeResult !== "application/html" &&
            mimeTypeResult.substring("audio/") !== 0) {
            mimeTypeResult = mime.lookup(url);
        }
        let result = null;
        if (mimeTypeResult && mimeTypeResult === "application/pdf") {
            const pdfResult = await EmbeddingAPI.pdfToText(fileResponse);
            result = {
                success: true,
                html: "",
                text: pdfResult.text,
                title: "",
                mimeType: mimeTypeResult,
            };
        } else if (mimeTypeResult && mimeTypeResult.substring(0, 6) === "audio/") {
            const fileData = await fileResponse.arrayBuffer();
            const transcriptionResult = await EmbeddingAPI.getTranscription(uid, fileData, url, chatGptKey);

            if (transcriptionResult.success) {
                result = transcriptionResult;
                result.html = "";
                result.title = "";
            } else {
                return {
                    success: false,
                    errorMessage: "transcription failed",
                    error: transcriptionResult,
                };
            }
        } else {
            try {
                result = await EmbeddingAPI._scrapeHTMLURL(fileResponse, url, options);
            } catch (error: any) {
                return {
                    success: false,
                    errorMessage: error.message,
                    error,
                };
            }
        }

        return result;
    }
    /**
     * @param { any } fileResponse
     * @param { string } url
     * @param { string } options
     */
    static async _scrapeHTMLURL(fileResponse: any, url: string, options: string): Promise<any> {
        const optionsMap = EmbeddingAPI._processOptions(options);
        let html = await fileResponse.text();
        let text = "";
        let title = "";
        if (html) {
            if (html.length > 1000000) html = html.substring(0, 1000000);
            const dom = new JSDOM(html);
            const document = dom.window.document;

            let htmlElementsSelector = "h1, h2, h3, h4, h5, p";
            if (optionsMap.htmlElementsSelector) htmlElementsSelector = optionsMap.htmlElementsSelector;
            document.querySelectorAll(htmlElementsSelector).forEach((element: any) => {
                const t = element.textContent.trim();
                if (t) text += t + "\n";
            });
            text = text.replace(/^[ \t]+/gm, "")
                .replace(/[ \t]+/g, " ")
                .replace(/\n{2,}/g, "\n")
                .trim();
            text = text.substring(0, 10000000);

            if (!title) title = dom.window.document.title;
        }

        return {
            success: true,
            html,
            text,
            title,
        };
    }
    /**
     * @param { string } prefix
     * @param { any } chunk
     * @param { string } chatGptKey
     * @param { string } uid
     * @param { string } batchId
     * @param { string } id
     * @param { string } title
     * @param { string } url
     * @param { any } pIndex
     * @return { Promise<any> }
     */
    static async upsertChunkToPinecone(prefix: string, chunk: any, chatGptKey: string, uid: string,
        batchId: string, id: string, title: string, url: string, pIndex: any,
        additionalMetaData: any = {}): Promise<any> {
        let text = chunk.text;
        if (prefix) text = prefix.trim() + "\n" + text;

        const embeddingModelResult = await EmbeddingAPI.encodeEmbedding(text, chatGptKey, uid);
        const embedding = embeddingModelResult.vectorResult;
        const encodingTokens = embeddingModelResult.encodingTokens;
        const encodingCredits = embeddingModelResult.encodingCredits;

        const metadata: any = {
            text,
            url,
            title,
            encodingTokens,
            encodingCredits,
        };

        Object.assign(metadata, additionalMetaData);
        const pEmbedding = {
            metadata,
            values: embedding,
            id: id,
        };

        await pIndex.upsert([
            pEmbedding,
        ]);

        return {
            pEmbedding,
            encodingTokens,
            encodingCredits,
        };
    }
    /** error handling wrapper
     * @param { any } fileDesc
     * @param { string } batchId
     * @param { string } chatGptKey
     * @param { string } uid
     * @param { any } pIndex
     * @param { number } tokenThreshold
     * @return { any } success: true - otherwise errorMessage: string is in map
    */
    static async upsertFileData(fileDesc: any, batchId: string, chatGptKey: string, uid: string, pIndex: any,
        tokenThreshold: number) {
        try {
            return await EmbeddingAPI._upsertFileData(fileDesc, batchId, chatGptKey, uid, pIndex, tokenThreshold);
        } catch (error: any) {
            return {
                success: false,
                errorMessage: error.message,
                error,
            };
        }
    }
    /**
     * @param { any } fileDesc
     * @param { string } batchId
     * @param { string } chatGptKey
     * @param { string } uid
     * @param { any } pIndex
     * @param { number } tokenThreshold
     * @return { any } success: true - otherwise errorMessage: string is in map
    */
    static async _upsertFileData(fileDesc: any, batchId: string, chatGptKey: string, uid: string, pIndex: any,
        tokenThreshold: number) {
        let id = fileDesc.id;
        if (id === "") id = encodeURIComponent(fileDesc.url);
        if (id === "") {
            return {
                success: false,
                errorMessage: "id or url required",
            };
        }
        const url = fileDesc.url;
        const options = fileDesc.options;
        let text = fileDesc.text;
        let title = "";
        let html = "";
        if (!text && url !== "") {
            const scrapeResult = await EmbeddingAPI._processURL(uid, chatGptKey, url, options);
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

        const additionalMetaData: any = {};
        const fileDescKeys = Object.keys(fileDesc);
        fileDescKeys.forEach((key: string) => {
            if (key.substring(0, 5).toLocaleLowerCase() === "meta_") {
                additionalMetaData[key.substring(6)] = fileDesc[key];
            }
        });

        const textChunks = await SharedWithBackend.parseBreakTextIntoChunks(tokenThreshold, text);
        const overrideTitle = fileDesc.title.trim();
        if (overrideTitle !== "") title = overrideTitle;
        if (title === "") title = url.substring(0, 100);
        if (title === "") title = text.substring(0, 100);
        const prefix = fileDesc.prefix;
        const textSize = text.length;

        const promises: any = [];
        const chunkCount = textChunks.length;
        const idList: Array<string> = [];
        textChunks.forEach((chunk: any, index: number) => {
            let pId = id;
            if (chunkCount > 1) pId += "_" + (index + 1) + "_" + chunkCount;
            promises.push(EmbeddingAPI.upsertChunkToPinecone(prefix, chunk, chatGptKey, uid, batchId,
                pId, title, url, pIndex, additionalMetaData));
            idList.push(pId);
            console.log(pId);
        });

        let encodingCredits = 0;
        let encodingTokens = 0;
        const upsertResults = await Promise.all(promises);
        upsertResults.forEach((result: any) => {
            encodingTokens += result.encodingTokens;
            encodingCredits += result.encodingCredits;
        });

        await firebaseAdmin.firestore().doc(`Embeddings/${batchId}/html/${id}`)
            .set({
                html,
                text,
                textChunks,
                title,
                textSize,
                encodingTokens,
                encodingCredits,
                idList,
            });

        return {
            success: true,
            id: idList.join(","),
            url,
            text,
            title,
            textSize,
            encodingTokens,
            encodingCredits,
            idList,
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
        let topK = 3;
        if (req.body.topK !== undefined) topK = req.body.topK;

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
            topK,
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

            await BaseClass._updateCreditUsageForUser(uid, "", "", encodingTokens, encodingTokens, 0, encodingCredits);
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
    /**
    * @param { Request } req http request object
    * @param { Response } res http response object
    */
    static async getPineconeIndexStats(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);

        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const batchId = req.body.batchId.toString().trim();
        if (!batchId.trim()) return BaseClass.respondError(res, "Index name required");
        const pineconeKey = req.body.pineconeKey;
        const pineconeEnvironment = req.body.pineconeEnvironment;

        if (batchId === "" || pineconeEnvironment === "" || pineconeKey === "") {
            return BaseClass.respondError(res, "Name, Environment or Key is empty");
        }

        try {
            const pinecone = new Pinecone({
                apiKey: pineconeKey,
                environment: pineconeEnvironment,
            });
            const indexList = await pinecone.listIndexes();
            if (!EmbeddingAPI.testIfIndexExists(indexList, batchId)) {
                return BaseClass.respondError(res, `Index: [${batchId}] not found or not ready`);
            }

            const pIndex = pinecone.index(batchId);
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

        const batchId = req.body.batchId.toString().trim();
        if (!batchId.trim()) BaseClass.respondError(res, "index name required");

        const vectorId = req.body.vectorId.toString().trim();
        const pineconeKey = req.body.pineconeKey;
        const pineconeEnvironment = req.body.pineconeEnvironment;

        try {
            const pinecone = new Pinecone({
                apiKey: pineconeKey,
                environment: pineconeEnvironment,
            });
            const indexList = await pinecone.listIndexes();
            if (!EmbeddingAPI.testIfIndexExists(indexList, batchId)) {
                return BaseClass.respondError(res, `Index: [${batchId}] not found or not ready`);
            }

            const pIndex = pinecone.index(batchId);
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
     * @param { globalThis.Response } resultPDF
     * @return { Promise<any> }
    */
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

        const batchId = req.body.batchId.toString().trim();
        if (!batchId.trim()) BaseClass.respondError(res, "index name required");

        const vectorId = req.body.vectorId.toString().trim();
        const pineconeKey = req.body.pineconeKey;
        const pineconeEnvironment = req.body.pineconeEnvironment;

        try {
            const pinecone = new Pinecone({
                apiKey: pineconeKey,
                environment: pineconeEnvironment,
            });
            const indexList = await pinecone.listIndexes();
            if (!EmbeddingAPI.testIfIndexExists(indexList, batchId)) {
                return BaseClass.respondError(res, `Index: [${batchId}] not found or not ready`);
            }

            const pIndex = pinecone.index(batchId);
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
     * @param { globalThis.Response } resultPDF
     * @return { Promise<any> }
    */
    static async pdfToText(resultPDF: globalThis.Response): Promise<any> {
        const arrayBuffer = await resultPDF.arrayBuffer();
        return new Promise((res: any) => {
            const pdfParser = new PDFParser(this, 1);
            const buff = Buffer.from(arrayBuffer);
            // pdfParser.on("pdfParser_dataError", (errData: any) => console.error(errData.parserError) );
            pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
                const pages = pdfData.Pages;
                let text = "";
                pages.forEach((page: any) => {
                    page.Texts.forEach((blocks: any) => {
                        blocks.R.forEach((run: any) => {
                            text += decodeURIComponent(run.T) + "\n";
                        });
                    });
                });
                res({
                    success: true,
                    text,
                });
            });
            pdfParser.parseBuffer(buff);
        });
    }
}
