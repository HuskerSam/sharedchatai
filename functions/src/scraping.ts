import {
    BaseClass,
} from "./baseclass";
import SharedWithBackend from "./../../public/uicode/sharedwithbackend";
import {
    JSDOM,
} from "jsdom";
import fetch from "cross-fetch";
import PDFParser from "pdf2json";
import mime from "mime-types";
import fluentFfmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import ffprobe from "@ffprobe-installer/ffprobe";
import * as OpenAI from "openai";

/** handle scraping webpages and embedding contents in pinecone */
export default class ScrapingAPI {
    /**
     * @param { string } uid
     * @param { string } chatGptKey
     * @param { string } url
     * @param { string } options
    */
    static async processURL(uid: string, chatGptKey: string, url: string,
        options: string): Promise<any> {
        const optionsMap = SharedWithBackend.processOptions(options);
        const fileResponse = await fetch(url);
        let mimeTypeResult: any = fileResponse.headers.get("content-type");

        if (mimeTypeResult !== "application/pdf" &&
            mimeTypeResult !== "application/html" &&
            mimeTypeResult.substring("audio/") !== 0) {
            mimeTypeResult = mime.lookup(url);
        }
        let result = null;
        if (optionsMap.urlScrape) {
            try {
                result = await ScrapingAPI.scrapeHTMLforURLs(fileResponse, url, options);
            } catch (error: any) {
                return {
                    success: false,
                    errorMessage: error.message,
                    error,
                };
            }
        } else if (mimeTypeResult && mimeTypeResult === "application/pdf") {
            const pdfResult = await ScrapingAPI.pdfToText(fileResponse);
            result = {
                success: true,
                html: "",
                text: pdfResult.text,
                title: "",
                mimeType: mimeTypeResult,
            };
        } else if (mimeTypeResult && mimeTypeResult.substring(0, 6) === "audio/") {
            const fileData = await fileResponse.arrayBuffer();
            const transcriptionResult = await ScrapingAPI.getTranscription(uid, fileData, url, chatGptKey);

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
                result = await ScrapingAPI.scrapeHTMLURL(fileResponse, url, options);
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
    static async scrapeHTMLURL(fileResponse: any, url: string, options: string): Promise<any> {
        const optionsMap = SharedWithBackend.processOptions(options);
        let html = await fileResponse.text();
        let text = "";
        let title = "";
        if (html) {
            if (html.length > 10000000) html = html.substring(0, 10000000);
            const dom = new JSDOM(html);
            const document = dom.window.document;

            let htmlElementsSelector = optionsMap.htmlElementsSelector;
            if (!htmlElementsSelector || htmlElementsSelector === "innerText") {
                htmlElementsSelector = "body";
            }
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
     * @param { any } fileResponse
     * @param { string } url
     * @param { string } options
     */
    static async scrapeHTMLforURLs(fileResponse: any, url: string, options: string): Promise<any> {
        let html = await fileResponse.text();
        let text = "";
        let title = "";
        if (html) {
            if (html.length > 10000000) html = html.substring(0, 10000000);
            const dom = new JSDOM(html);
            const document = dom.window.document;
            const optionsMap = SharedWithBackend.processOptions(options);
            let htmlElementsSelector = optionsMap.htmlElementsSelector;
            if (!htmlElementsSelector) {
                htmlElementsSelector = "a";
            }
            document.querySelectorAll(htmlElementsSelector).forEach((element: any) => {
                const t = element.getAttribute("href");
                if (t) text += t + "\n";
            });
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
                            text += decodeURIComponent(run.T) + " ";
                        });
                        text += "\n";
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
            const format = await ScrapingAPI.getAudioFormat(data);
            const duration = Number(format.format.duration);
            if (isNaN(duration) || duration <= 0) {
                return {
                    success: false,
                    error: new Error("no duration detected for audio file"),
                };
            }

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
}
