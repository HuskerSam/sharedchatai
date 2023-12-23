export class BibleDemoApp {
  running = false;
  lookup_chapters_by_verse: any = document.body.querySelector(".lookup_chapters_by_verse");
  lookup_verse_message_text: any = document.body.querySelector(".lookup_verse_message_text");
  lookup_verse_response_feed: any = document.body.querySelector(".lookup_verse_response_feed");
  augmented_chapters_view: any = document.body.querySelector("#augmented_chapters_view");
  augmented_message_text: any = document.body.querySelector(".augmented_message_text");
  full_augmented_prompt: any = document.body.querySelector(".full_augmented_prompt");
  full_augmented_response: any = document.body.querySelector(".full_augmented_response");
  lookup_chapters_button: any = document.body.querySelector(".lookup_chapters_button");
  lookup_chapter_message_text: any = document.body.querySelector(".lookup_chapter_message_text");
  lookup_chapter_response_feed: any = document.body.querySelector(".lookup_chapter_response_feed");
  llm_prompt_response_button: any = document.body.querySelector(".llm_prompt_response_button");
  embedding_type_select: any = document.body.querySelector(".embedding_type_select");
  prompt_template_text_area: any = document.body.querySelector(".prompt_template_text_area");
  document_template_text_area: any = document.body.querySelector(".document_template_text_area");
  prompt_template_select_preset: any = document.body.querySelector(".prompt_template_select_preset");
  bibleData: any[] = [];
  byVerseAPIToken = "76acdd7d-609c-4a39-ab89-bc73b0c2c531";
  byVerseSessionId = "vkuyk8lg74nq";
  byChapterToken = "bcdc6f90-80f8-49bc-94ed-f82b43305af2";
  byChapterSessionId = "07yt1fqvoj9q";
  promptUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/message`;
  queryUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/vectorquery`;

  constructor() {
    this.load();
    this.lookup_chapters_by_verse.addEventListener("click", () => this.lookupChaptersByVerse());
    this.lookup_chapters_button.addEventListener("click", () => this.lookupChapters());
    this.llm_prompt_response_button.addEventListener("click", () => this.sendPromptToLLM());
    this.prompt_template_select_preset.addEventListener("input", () => this.populatePromptTemplates());
    this.populatePromptTemplates(0);
  }
  async getMatchingVectors(message: string, topK: number, apiToken: string, sessionId: string): Promise<any> {
    const body = {
      message,
      apiToken,
      sessionId,
      topK,
    };
    const fetchResults = await fetch(this.queryUrl, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return await fetchResults.json();
  }
  async load() {
    const bibleDataResponse = await fetch("flattenedbible.json");
    this.bibleData = await bibleDataResponse.json();
  }
  async lookupChaptersByVerse() {
    if (this.running) return;
    this.running = true;
    this.lookup_verse_response_feed.innerHTML = "running...";
    const message = this.lookup_verse_message_text.value.trim();
    if (!message) {
      alert("please supply a message");
      return;
    }

    let result = await this.getMatchingVectors(message, 10, this.byVerseAPIToken, this.byVerseSessionId);
    this.running = false;
    if (!result.success) {
      console.log("error", result);
      alert(result.errorMessage);
      return;
    } else {
      console.log(result);
    }

    let html = "";
    result.matches.forEach((match) => {
      const metaData = JSON.stringify(match.metadata, null, "\n");
      const block = `<div class="verse_card">
            <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="book">${match.metadata.book}</a>
            <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="chapter"
                      data-chapterindex="${match.metadata.chapterIndex}">${match.metadata.chapterIndex + 1}</a>
            <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="verse"
            data-chapterindex="${match.metadata.chapterIndex}"
            data-verseindex="${match.metadata.verseIndex}">${match.metadata.verseIndex + 1}</a>
              ${(match.score * 100).toFixed()}%
              <br>
              <div>${match.metadata.text}</div>
            </div>`;
      html += block;
    });

    this.lookup_verse_response_feed.innerHTML = html;

    this.lookup_verse_response_feed.querySelectorAll("a").forEach(((a: any) => a.addEventListener("click", (e: any) => {
      e.preventDefault();
      if (a.dataset.link === "book") {
        const bookIndex = Number(a.dataset.bookindex);
        alert(bookIndex)
      }
      if (a.dataset.link === "chapter") {
        const bookIndex = Number(a.dataset.bookindex);
        const chapterIndex = Number(a.dataset.chapterindex);
        alert(bookIndex + " : " + chapterIndex);
      }
      if (a.dataset.link === "verse") {
        const bookIndex = Number(a.dataset.bookindex);
        const chapterIndex = Number(a.dataset.chapterindex);
        const verseIndex = Number(a.dataset.verseindex);
        alert(bookIndex + " : " + chapterIndex + " : " + verseIndex);
      }
    })));
  }
  async lookupChapters(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.lookup_chapter_response_feed.innerHTML = "running...";
    const message = this.lookup_chapter_message_text.value.trim();
    if (!message) {
      alert("please supply a message");
      return;
    }

    let result = await this.getMatchingVectors(message, 10, this.byChapterToken, this.byChapterSessionId);
    this.running = false;
    if (!result.success) {
      console.log("error", result);
      alert(result.errorMessage);
      return;
    } else {
      console.log(result);
    }

    let html = "";
    result.matches.forEach((match) => {
      const metaData = JSON.stringify(match.metadata, null, "\n");
      const block = `<div class="verse_card">
          <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="book">${match.metadata.book}</a>
          <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="chapter"
                    data-chapterindex="${match.metadata.chapterIndex}">${match.metadata.chapterIndex + 1}</a>
            ${(match.score * 100).toFixed()}%
            <br>
            <div>${match.metadata.text}</div>
          </div>`;
      html += block;
    });

    this.lookup_chapter_response_feed.innerHTML = html;

    this.lookup_chapter_response_feed.querySelectorAll("a").forEach((a => a.addEventListener("click", (e) => {
      e.preventDefault();
      if (a.dataset.link === "book") {
        const bookIndex = Number(a.dataset.bookindex);
        alert(bookIndex)
      }
      if (a.dataset.link === "chapter") {
        const bookIndex = Number(a.dataset.bookindex);
        const chapterIndex = Number(a.dataset.chapterindex);
        alert(bookIndex + " : " + chapterIndex);
      }
    })));
  }
  escapeHTML(str: string): string {
    if (str === undefined || str === null) str = "";
    str = str.toString();
    return str.replace(/[&<>'"]/g,
      (match) => {
        switch (match) {
          case "&": return "&amp;";
          case "<": return "&lt;";
          case ">": return "&gt;";
          case "'": return "&#39;";
          case "\"": return "&quot;";
        }

        return match;
      });
  }
  getChapter(bookIndex: string, chapterIndex: string, verseIndex = -1): any {
    let verses = this.bibleData.filter((verse) => {
      if (verse.bookIndex.toString() === bookIndex &&
        verse.chapterIndex.toString() === chapterIndex)
        return true;
      return false;
    });
    verses = verses.sort((a, b) => {
      if (Number(a.verseIndex) > Number(b.verseIndex)) return 1;
      if (Number(a.verseIndex) < Number(b.verseIndex)) return -1;
      return 0;
    });

    let html = "";
    let text = "";
    verses.forEach((verse) => {
      let selectedClass = verse.verseIndex.toString() === verseIndex.toString() ? " selected" : "";
      html += `<span class="verse_line ${selectedClass}">${verse.verse}</span>&nbsp;`;
      text += verse.verse + "\n";
    });

    return {
      text,
      html,
    };
  }
  getBooks(): any {
    const books = {};
    this.bibleData.forEach((row) => {
      let book = books[row.bookIndex];
      if (!book) {
        book = {};
        books[row.bookIndex] = book;
      }
      let chapter = book[row.chapterIndex];
      if (!chapter) {
        chapter = {};
        book[row.chapterIndex] = chapter;
      }
      chapter[row.verseIndex] = row;
    });
    return books;
  }
  getChaptersByBook(): any[] {
    const books = this.getBooks();
    const bookList = Object.keys(books);
    const rows: any[] = [];
    bookList.forEach(bookIndex => {
      const chapterIndexes = Object.keys(books[bookIndex]);
      chapterIndexes.forEach(chapterIndex => {
        const chapter = this.getChapter(bookIndex, chapterIndex);
        rows.push({
          book: books[bookIndex][chapterIndex]["0"].book,
          bookIndex,
          chapterIndex,
          text: chapter.text,
        })
      });
    });

    return rows;
  }
  getQueryDetails(): any {
    if (this.embedding_type_select.selectedIndex === 0) {
      return {
        topK: 10,
        includeK: 2,
        include: "chapter",
        pineconeDB: "verse",
        apiToken: this.byVerseAPIToken,
        sessionId: this.byVerseSessionId,
      };
    }
    if (this.embedding_type_select.selectedIndex === 1) {
      return {
        topK: 10,
        includeK: 10,
        include: "verse",
        pineconeDB: "verse",
        apiToken: this.byVerseAPIToken,
        sessionId: this.byVerseSessionId,
      };
    }

    return {
      topK: 2,
      includeK: 2,
      include: "chapter",
      pineconeDB: "chapter",
      apiToken: this.byChapterToken,
      sessionId: this.byChapterSessionId,
  };
  }
  async sendPromptToLLM() {
    if (this.running) return;
    this.running = true;
    this.full_augmented_response.innerHTML = "running...";
    const message = this.augmented_message_text.value.trim();
    if (!message) {
      alert("please supply a message");
      return;
    }
    const queryDetails = this.getQueryDetails();

    let result = await this.getMatchingVectors(message, queryDetails.topK, queryDetails.apiToken, queryDetails.sessionId);
    this.running = false;
    if (!result.success) {
      console.log("error", result);
      alert(result.errorMessage);
      return;
    } else {
      console.log(result);
    }

    let matches: any[] = result.matches;
    if (queryDetails.topK !== queryDetails.includeK) {
      matches = [result.matches[0]];
      let cIndex = result.matches[0].metadata.chapterIndex;
      let bIndex = result.matches[0].metadata.bookIndex;
      for (let c = 1, l = result.matches.length; c < l; c++) {
        let match = result.matches[c];
        if (match.metadata.chapterIndex.toString() !== cIndex.toString() || match.metadata.bookIndex.toString() !== bIndex.toString()) {
          matches.push(match);
          if (matches.length >= queryDetails.includeK) break;
        }
      }
    }

    let chaptersHTML = "";
    let chaptersText: any[] = [];
    matches.forEach((match) => {
      let chapterDetails = this.getChapter(match.metadata.bookIndex, match.metadata.chapterIndex, match.metadata.verseIndex);

      const block = `<div class="verse_card">
            <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="book">${match.metadata.book}</a>
            <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="chapter"
                      data-chapterindex="${match.metadata.chapterIndex}">${Number(match.metadata.chapterIndex) + 1}</a>
            <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="verse"
            data-chapterindex="${match.metadata.chapterIndex}"
            data-verseindex="${match.metadata.verseIndex}">${Number(match.metadata.verseIndex) + 1}</a>
              ${(match.score * 100).toFixed()}%
              <br>
              <div>${chapterDetails.html}</div>
            </div>`;
      chaptersHTML += block;
      chaptersText.push(chapterDetails.text);
    });

    this.augmented_chapters_view.innerHTML = chaptersHTML;
    const prompt = this.embedPrompt(message, matches, queryDetails);
    this.full_augmented_prompt.innerHTML = prompt;

    const body = {
      message: prompt,
      apiToken: this.byVerseAPIToken,
      sessionId: this.byVerseSessionId,
    };
    const fetchResults = await fetch(this.promptUrl, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const promptResult = await fetchResults.json();
    if (!promptResult.success) {
      console.log("error", promptResult);
      alert(promptResult.errorMessage);
      return;
    } else {
      console.log(promptResult);
    }
    this.full_augmented_response.innerHTML = this.escapeHTML(promptResult.assist.assist.choices["0"].message.content);

    this.running = false;
  }
  embedPrompt(prompt: string, matches: any[], queryDetails: any): string {
    const promptTemplate = this.prompt_template_text_area.value;
    const documentTemplate = this.document_template_text_area.value;
    const promptT = (<any>window).Handlebars.compile(promptTemplate);
    const docT = (<any>window).Handlebars.compile(documentTemplate);

    let documentsEmbedText = "";
    matches.forEach((match: any, index: number) => {
      const merge = Object.assign({}, match.metadata);
      merge.id = match.id;
      merge.matchIndex = index;
      merge.text = this.getTextForMatch(match, queryDetails);
      console.log(merge);
      documentsEmbedText += (<any>docT)(merge);
    });

    const mainMerge = {
      documents: documentsEmbedText,
      prompt,
    };
    return (<any>promptT)(mainMerge);
  }
  getTextForMatch(match: any, queryDetails: any) {
    if (queryDetails.include === "chapter") {
      return this.getChapter(match.metadata.bookIndex, match.metadata.chapterIndex).text;
    }
    // else return the verse
    return match.metadata.text;
  }
  populatePromptTemplates(templateIndex: number = -1) {
    if (templateIndex < 0) templateIndex = this.prompt_template_select_preset.selectedIndex - 1;
    if (templateIndex < 0) return;

    this.prompt_template_text_area.value = promptTemplates[templateIndex].mainPrompt;
    this.document_template_text_area.value = promptTemplates[templateIndex].documentPrompt;
  }
}

const promptTemplates = [
  {
    mainPrompt: `Please respond to the following prompt using these Biblical chapters as guidance:
{{documents}}

Respond to prompt using Biblical language:
{{prompt}}`,
    documentPrompt: `Chapter ({{title}}):
{{text}}

`,
  },
  {
    mainPrompt: `Please write a new chapter using these Biblical chapters as guidance:
{{documents}}

As primary guidance use:
{{prompt}}`,
    documentPrompt: `{{title}}:
{{text}}

`,
  },
  {
    mainPrompt: `Please spiritual guidance using a Biblical voice using these chapters as reference:
{{documents}}

This is the specific prompt to respond to:
{{prompt}}`,
    documentPrompt: `{{title}}:
{{text}}

`,
  },
  {
    mainPrompt: `Please provide a subject score in a range of 1-10 for political correctness for high school students in the USA for the following documents:
{{documents}}

Please respond with json and only json in this format:
{
  "documentId": "",
  "politicalCorrectnessScore": 0,
}`,
    documentPrompt: `Document Id: {{id}}  Index: {{matchIndex}}  Title: {{title}}:
{{text}}

`,
  },
];