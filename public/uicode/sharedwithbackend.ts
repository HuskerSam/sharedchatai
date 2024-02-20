import {
  encode,
} from "gpt-tokenizer";
import mediaContent from "./mediacontent.json";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const newsList = mediaContent;
const models: any = {
  "gpt-3.5-turbo": {
    "active": 1,
    "type": "gpt",
    "input": 0.0015,
    "output": 0.002,
    "contextualLimit": 4096,
    "defaultCompletion": 500,
    "completionMax": 2048,
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "gpt-3.5-turbo-16k": {
    "active": 1,
    "type": "gpt",
    "input": 0.003,
    "output": 0.004,
    "contextualLimit": 16394,
    "defaultCompletion": 2000,
    "completionMax": 4000,
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "gpt-4": {
    "active": 1,
    "type": "gpt",
    "input": 0.03,
    "output": 0.06,
    "contextualLimit": 8192,
    "defaultCompletion": 1000,
    "completionMax": 4000,
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "gpt-4-32k": {
    "active": 0,
    "type": "gpt",
    "input": 0.06,
    "output": 0.12,
    "contextualLimit": 32768,
    "defaultCompletion": 4000,
    "completionMax": 8000,
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "chat-bison-001": {
    "active": 1,
    "type": "bard",
    "input": 0.015,
    "output": 0.03,
    "contextualLimit": 8192,
    "defaultCompletion": 1000,
    "completionMax": 3000,
    "completionMin": 20,
    "temperature": 0.2,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "claude-instant-1": {
    "active": 0,
    "type": "anthro",
    "input": 0.00163,
    "output": 0.00551,
    "contextualLimit": "",
    "defaultCompletion": "",
    "completionMax": "",
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "claude-2": {
    "active": 0,
    "type": "anthro",
    "input": 0.01102,
    "output": 0.03268,
    "contextualLimit": "",
    "defaultCompletion": "",
    "completionMax": "",
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "text-embedding-ada-002": {
    "active": 0,
    "type": "gpt",
    "input": 0.0001,
    "output": 0.0001,
    "contextualLimit": 4096,
    "defaultCompletion": 500,
    "completionMax": 2048,
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "text-embedding-3-small": {
    "active": 0,
    "type": "gpt",
    "input": 0.00002,
    "output": 0.00002,
    "contextualLimit": 4096,
    "defaultCompletion": 500,
    "completionMax": 2048,
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "whisper-1": {
    "active": 0,
    "type": "gpt",
    "input": 0.0006,
    "output": 0.0001,
    "contextualLimit": 4096,
    "defaultCompletion": 500,
    "completionMax": 2048,
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
};

/** static functions for UI and api calls  */
export default class SharedWithBackend {
  /** */
  static get defaultPromptMainTemplate() {
    return `Please respond to the prompt below using the following chapters as guidance:
{{documents}}
Respond to this prompt:
{{prompt}}`;
  }
  /** */
  static get defaultPromptDocumentTemplate() {
    return `Chapter ({{title}}):
 {{text}}`;
  }
  /** min and max returned in multiples of 20
   * @param { string } name model name
   * @return { any } returns model meta (contextualLimit, completionMax, completionMin)
  */
  static getModelMeta(name = ""): any {
    const modelFound: any = models[name];
    if (!modelFound) {
      console.log("MODEL NOT FOUND", name);
      return null;
    }
    const defaults = {
      max_tokens: modelFound.defaultCompletion,
      temperature: modelFound.temperature,
      top_p: modelFound.top_p,
      top_k: modelFound.top_k,
      presence_penalty: modelFound.presence_penalty,
      frequency_penalty: modelFound.frequency_penalty,
    };
    return {
      contextualLimit: modelFound.contextualLimit,
      completionMax: modelFound.completionMax,
      completionMin: modelFound.completionMin,
      defaultCompletion: modelFound.defaultCompletion,
      type: modelFound.type,
      input: modelFound.input,
      output: modelFound.output,
      defaults,
    };
  }
  /**
   * @return { any }
  */
  static getModels(): any {
    return models;
  }
  /**
 * @return { any }
*/
  static getNews(): any {
    return newsList;
  }
  /**
 * Shuffles array in place. ES6 version
 * @param { any[] } a items An array containing the items.
 * @return { any[] }
 */
  static shuffle(a: any[]): any[] {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** get content list template
* @return { string } html footer
*/
  static getFlyerListTemplate(): string {
    let items = "";
    SharedWithBackend.shuffle(newsList).forEach((item: any) => {
      if (item.disabled) return;
      items += `<li class="news_group_item hover_yellow"><a class="d-flex flex-column" href="${item.link}">
                <div class="d-flex flex-column" style="flex:1">
                  <div style="flex:1;text-align:center;display:flex;">
                    <img src="${item.image}" alt="${item.title}" style="align-self:center;">
                  </div>
                  <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1"><span class="title">${item.title}</span><i class="material-icons"
                      style="margin-left: 4px;position:relative;top: 4px;font-size:0.9em;">open_in_new</i></h5>
                    <small class="date">${item.date}</small>
                  </div>
                  <div class="caption">${item.description}</div>
                </div>
              </a></li>`;
    });
    return items;
  }
  /**
 * @return { string } html for table rows
 */
  static generateCreditPricingRows(): string {
    const models = SharedWithBackend.getModels();
    let html = "";
    html += `<tr>
          <th>Model</th>
          <th>1:1</th>
          <th>2:1</th>
          <th>3:1</th>
          <th>4:1</th>
          <th>5:1</th>
      </tr>`;
    const modelNames = Object.keys(models);
    modelNames.forEach((model: string) => {
      // prices are per 1k tokens, credits are 1k per $
      const ratio1 = 1 / ((models[model].input + models[model].output) / 2);
      const ratio2 = 1 / ((models[model].input * 2 + models[model].output) / 3);
      const ratio3 = 1 / ((models[model].input * 3 + models[model].output) / 4);
      const ratio4 = 1 / ((models[model].input * 4 + models[model].output) / 5);
      const ratio5 = 1 / ((models[model].input * 5 + models[model].output) / 6);

      html += `<tr>
              <td>${model}</td>
              <td>${SharedWithBackend.numberWithCommas(ratio1)}</td>
              <td>${SharedWithBackend.numberWithCommas(ratio2)}</td>
              <td>${SharedWithBackend.numberWithCommas(ratio3)}</td>
              <td>${SharedWithBackend.numberWithCommas(ratio4)}</td>
              <td>${SharedWithBackend.numberWithCommas(ratio5)}</td>
              </tr>`;
    });

    return html;
  }
  /**
*
* @param { number } x incoming number
* @param { number } decimalDigits number of decimals (toFixed()) -1 for ignore
* @return { string } number with commas
*/
  static numberWithCommas(x: number, decimalDigits = 0): string {
    if (isNaN(Number(x))) x = 0;
    const xString = (decimalDigits !== -1) ? x.toFixed(decimalDigits) : x.toString();
    return xString.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  /**
 * @param { number } threshold
 * @param { string } chunkingType
 * @param { number } overlap
 * @param { string } separators
 * @param { string } fullText
 * @return { Promise<Array<any>> }
 */
  static async parseBreakTextIntoChunks(threshold: number, chunkingType: string,
    overlap: number, separators: string, fullText: string): Promise<Array<any>> {
    if (chunkingType === "sizetextsplitter") {
      try {
        return SharedWithBackend.sizeTextIntoChunks(threshold, fullText);
      } catch (err: any) {
        const cleanString = SharedWithBackend.cleanString(fullText);
        return SharedWithBackend.sizeTextIntoChunks(threshold, cleanString);
      }
    }
    if (chunkingType === "sentence") {
      return SharedWithBackend.sentenceTextIntoChunks(fullText, threshold, overlap);
    }
    if (chunkingType === "recursivetextsplitter") {
      let sepArray: string[] = ["\n\n", "\n", " ", ""];
      try {
        sepArray = JSON.parse(separators);
      } catch (err: any) {
        console.log("failed to parse separators", err);
      }
      return SharedWithBackend.recursiveSplitTextIntoChunks(fullText, threshold, overlap, sepArray);
    } else { // "none"
      return [{
        text: fullText,
        textSize: fullText.length,
      }];
    }
  }
  /**
 * @param { string } text
 * @return { string}
 */
  static cleanString(text: string): string {
    if (!text) text = "";
    return text.replace(/[^a-z0-9\s]/gi, "");
  }
  /**
 * @param { string } fullText
 * @param { number } chunkSize
 * @param { number } chunkOverlap
 * @param { string[] } separators
 * @return { Promise<Array<any>> }
 */
  static async recursiveSplitTextIntoChunks(fullText: string, chunkSize: number, chunkOverlap: number,
    separators: string[]): Promise<Array<any>> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators,
      lengthFunction: (text) => {
        try {
          return encode(text).length
        } catch (err: any) {
          const cleanString = SharedWithBackend.cleanString(text);
          const encodingLength = encode(cleanString).length;
          return encodingLength;
        }
      },
    });
    const chunks = await splitter.splitText(fullText);
    const resultChunks: Array<any> = [];
    chunks.forEach((chunk: string) => {
      resultChunks.push({
        text: chunk,
        textSize: chunk.length,
      });
    });

    return resultChunks;
  }
  /**
   * @param { number } sentenceWindow
   * @param { string } fullText
   * @return { Promise<Array<any>> }
   */
  static async sentenceTextIntoChunks(fullText: string, sentenceCount: number, sentenceOverlap: number): Promise<Array<any>> {
    const rawLines = fullText.split(".");
    const lines: string[] = [];
    const chunks: string[] = [];

    rawLines.forEach((line: string) => {
      const l = line.replaceAll("\n", " ").trim();
      if (l) lines.push(l);
    });
    let lineCounter = 0;
    let chunkText = "";
    lines.forEach((line: string, index: number) => {
      if (chunkText) chunkText += ". "
      chunkText += line + ". ";
      lineCounter++;
      if (lineCounter >= sentenceCount) {
        // add seceding overlap
        const lastIndexOverlap = Math.min(lines.length - 1, index + sentenceOverlap);
        for (let c = index + 1; c <= lastIndexOverlap; c++) {
          const overlapText = lines[c];
          chunkText += overlapText + ". ";
        }
        if (chunkText.trim()) chunks.push(chunkText.trim());

        // console.log("chunkText", chunkText);
        // add preceding overlap
        chunkText = "";
        lineCounter = 0;
        const firstIndexOverlap = Math.max(0, index - sentenceOverlap);
        for (let c = firstIndexOverlap; c < index; c++) {
          const overlapText = lines[c];
          chunkText += overlapText + ". ";
        }
      }
    });

    const resultChunks: Array<any> = [];
    chunks.forEach((chunk: string) => {
      resultChunks.push({
        text: chunk,
        textSize: chunk.length,
      });
    });

    return resultChunks;
  }
  /**
   * @param { number } threshold
   * @param { string } fullText
   * @return { Promise<Array<any>> }
   */
  static async sizeTextIntoChunks(threshold: number, fullText: string): Promise<Array<any>> {
    if (isNaN(threshold)) threshold = 0;
    if (threshold > 1000000 || threshold <= 0) {
      threshold = 1000000;
    }
    const lines = fullText.split("\n");
    const chunks = [""];
    lines.forEach((line: string) => {
      const lineTokens = encode(line);
      let linePieces = [line];
      if (lineTokens.length > threshold) {
        linePieces = [""];
        const words = line.split(" ");
        words.forEach((word: string) => {
          const currentPiece = linePieces[linePieces.length - 1];
          const newPiece = currentPiece + " " + word;
          const pieceTokens = encode(newPiece);
          if (pieceTokens.length > threshold) {
            linePieces.push(word);
          } else {
            linePieces[linePieces.length - 1] = newPiece;
          }
        });
      }
      linePieces.forEach((piece: string) => {
        const currentChunk = chunks[chunks.length - 1];
        const newChunk = currentChunk + "\n" + piece;
        const chunkTokens = encode(newChunk);
        if (currentChunk === "") {
          chunks[chunks.length - 1] = piece;
        } else if (chunkTokens.length > threshold) {
          chunks.push(piece);
        } else {
          chunks[chunks.length - 1] = newChunk;
        }
      });
    });

    const resultChunks: Array<any> = [];
    chunks.forEach((chunk: string) => {
      const tokens = encode(chunk);
      resultChunks.push({
        text: chunk,
        tokens: tokens.length,
        rawTokens: tokens,
        textSize: chunk.length,
      });
    });

    return resultChunks;
  }
  /**
 * Returns a hash code from a string
  * @param  {string} str The string to hash.
  * @return {number}    A 32bit integer
  */
  static hashCode(str: string): number {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
