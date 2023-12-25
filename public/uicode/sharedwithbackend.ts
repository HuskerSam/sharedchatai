import {
  encode,
} from "gpt-tokenizer";
import mediaContent from "./mediacontent.json";

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
  /** get content list template
* @return { string } html footer
*/
  static getFlyerListTemplate(): string {
    let items = "";
    newsList.forEach((item: any) => {
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
   * @param { string } fullText
   * @return { Promise<Array<any>> }
   */
  static async parseBreakTextIntoChunks(threshold: number, fullText: string): Promise<Array<any>> {
    const encode = await SharedWithBackend.tokenEncodeFunction();
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
  /** */
  static async tokenEncodeFunction(): Promise<any> {
    return encode;
  }
}
