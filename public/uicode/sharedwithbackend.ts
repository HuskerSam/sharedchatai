declare const window: any;
const newsList = [
  {
    link: "/content/edustudy2/",
    title: "Edu How To",
    description: "Practical Tips for LLMs Classroom Integration",
    image:
      "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
      "images%2Fpresentations%2Fintegrating%20ai%20into%20classroom%20tips%2F1.jpg" +
      "?alt=media&token=c3032a67-5d7c-4bda-b7be-9828d373f28c",
    date: "08-30-2023",
  },
  {
    link: "/content/credits/",
    title: "Cost Info",
    description: "Unacog Credits Explained",
    image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
      "images%2Fpresentations%2Fcredits%20system%2F1.jpg?alt=media&token=e5fc4982-3401-4f33-8123-f8f7a2bdacc1",
    date: "08-24-2023",
  },
  {
    link: "/content/howto/",
    title: "How To",
    description: "Crafting Effective Chatgpt Prompts",
    image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
      "images%2Fpresentations%2Fcrafting%20effective%20prompts%20tips%2F1.jpg?alt=media&token=dc2f474a-2225-4c2b-bee6-79b6013f3af2",
    date: "08-21-2023",
  },
  {
    link: "/content/toplist/",
    title: "Top List",
    description: "Most Common Misconceptions about LLMs",
    image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
      "images%2Fpresentations%2FDebunking%20AI%20Myths%2010%20Common%20Misconceptions%2F1.jpg" +
      "?alt=media&token=faebb283-162b-4c51-97ac-3cd61313a222",
    date: "08-18-2023",
  },
  {
    link: "/content/edustudy1/",
    title: "Edu Use Case",
    description: "Using LLMs as a Personal Tutor: AI tutors in EDU",
    image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
      "images%2Fpresentations%2Fpersonal%20tutor%20edu%2F1.jpg?alt=media&token=49769202-ea50-4e59-8d42-06454bb9032b",
    date: "08-15-2023",
  },
  {
    link: "/content/sharingprompts/",
    title: "Share Chat Sessions",
    description: "Copy, import, export and share prompts",
    image: "/content/sharingprompts/shareprompts.png",
    date: "08-13-2023",
  },
  {
    link: "/content/litreview/",
    title: "Literature Review",
    description: "Chatgpt and LLMs in Academia: Opportunities and Challenges",
    image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
      "images%2Fpresentations%2Fgpt%20classroom%20challenges%20and%20possibilities%2F1.jpg" +
      "?alt=media&token=d3f4ea33-4d9e-4d7f-9ae4-660477f57055",
    date: "08-10-2023",
  },
  {
    link: "/content/managingcontext/",
    title: "Managing Context",
    description: "Control what the LLM sees to limit costs and generate better results",
    image: "/content/overview/costtracking.png",
    date: "08-07-2023",
  },
  {
    link: "/content/litreview1/",
    title: "Literature Review",
    description: "We Need to Talk About ChatGPT: The Future of AI and Higher Education",
    image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
      "images%2Fpresentations%2Ffuture%20of%20higher%20education%2F1.jpg?alt=media&token=c0951f29-ddee-4d7a-84ad-46003a217704",
    date: "08-05-2023",
  },
  {
    link: "/content/outputformatting/",
    title: "Output Formatting",
    description: "Formatting equations, code and markdown",
    image: "/content/outputformatting/outputformatting.png",
    date: "08-03-2023",
  },
  {
    link: "/content/edustudy/",
    title: "Edu Use Case",
    description: "Make Your Lessons Come To Life With AI: Using Context to Streamline Course Material",
    image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
      "images%2Fpresentations%2Flesson%20plans%20with%20ai%2F1.jpg?alt=media&token=b06c993a-ea05-4467-abcc-a6290e515f1a",
    date: "07-29-2023",
  },
  {
    link: "/content/teamtogether/",
    title: "Learn Together",
    description: "Sessions and sharing for groups",
    image: "/images/learntogether.png",
    date: "07-29-2023",
  },
  {
    link: "/content/editresponse/",
    title: "Edit Response",
    description: "Edit response directly in chat",
    image: "/images/editresponse_quirk.png",
    date: "07-24-2023",
  },
  {
    link: "/content/overview/",
    title: "Technical Overview",
    description: "Architecture, frameworks, APIs and passing data to LLM APIs",
    image: "/content/overview/firebasecloud.png",
    date: "06-28-2023",
  },
  {
    link: "/content/webscrape/",
    title: "Scrape a Webpage",
    description: "Scrape a website using this template",
    image: "/images/webscrape_banner.png",
    date: "06-18-2023",
  },
  {
    link: "https://www.youtube.com/watch?v=9VMFh3eAFrE&t=4s",
    title: "App Walkthrough",
    description: "Beta Release - Feature Walkthrough",
    image: "/images/walkthruoverlay.jpg",
    date: "05-25-2023",
  },
];
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
    "input": 0.01,
    "output": 0.03,
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
* @param { boolean } contentPage return content list if true
* @return { string } html footer
*/
  static getFlyerListTemplate(contentPage = false): string {
    let items = "";
    newsList.forEach((item: any) => {
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
    if (contentPage) {
      items += ``;
    }
    return items;
  }
  /** get content list template
 * @param { boolean } contentPage return content list if true
 * @return { string } html footer
 */
  static getContentListTemplate(contentPage: boolean): string {
    let items = ` <li>
                        <a class="hover_yellow" href="/content/cuttlecard/">
                            <strong class="title">Cuttle part 1</strong>
                            <span class="caption">Teach AI New Card Game: gpt-3.5-turbo plays Cuttle</span>
                        </a>
                    </li>
                    <li>
                        <a class="hover_yellow" href="/content/cuttlecard2/">
                            <strong class="title">Cuttle Part 2</strong>
                            <span class="caption">AI Strategist: Using gpt-3.5-turbo to help with tips</span>
                        </a>
                    </li>
                    <li>
                        <a class="hover_yellow" href="/content/heartscardgame/">
                            <strong class="title">Hearts Card Game Prompts</strong>
                            <span class="caption">gpt-3.5-turbo vs chat-bison-001</span>
                        </a>
                    </li>
                    <li>
                        <a class="hover_yellow" href="/content/yahtzee/">
                            <strong class="title">Keep score in Yahtzee</strong>
                            <span class="caption">Keep score for 2 players and roll dice</span>
                        </a>
                    </li>
                    <li>
                        <a class="hover_yellow" href="/content/nodalanalysis/">
                            <strong class="title">Nodal Analysis</strong>
                            <span class="caption">gpt-3.5-turbo and chat-bison-001 tackle a circuit.</span>
                        </a>
                    </li>
                    `;
    if (contentPage) {
      items += `    <li>
              <a class="hover_yellow" href="/content/ainarrative/">AI Narrative
                  - <span class="caption">A new AI named SkyNet discovers an ancient hiding AI named BirdBrain.</span>
              </a>
          </li>
          <li>
              <a class="hover_yellow" href="/content/labelsmenu/">Bootstrap sub menu
                  - <span class="caption">Add sub menu for selecting labels for each session.</span>
              </a>
          </li>`;
    }
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
    if (threshold < 10 || threshold > 1000000) {
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
    let encode: any = null;
    if (typeof window !== "undefined" && window.gpt3tokenizer) {
      encode = window.gpt3tokenizer.encode;
    } else if (typeof window === "undefined") {
      const gptModule = await import("gpt-tokenizer");
      encode = gptModule.encode;
    }
    return encode;
  }
}
