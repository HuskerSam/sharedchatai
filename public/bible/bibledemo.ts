export class BibleDemoApp {
  running = false;
  analyze_prompt_button: any = document.body.querySelector(".analyze_prompt_button");
  lookup_verse_response_feed: any = document.body.querySelector(".lookup_verse_response_feed");
  summary_details: any = document.body.querySelector(".summary_details");
  full_augmented_response: any = document.body.querySelector(".full_augmented_response");
  analyze_prompt_textarea: any = document.body.querySelector(".analyze_prompt_textarea");
  lookup_chapter_response_feed: any = document.body.querySelector(".lookup_chapter_response_feed");
  embedding_type_select: any = document.body.querySelector(".embedding_type_select");
  embedding_diagram_img: any = document.body.querySelector(".embedding_diagram_img");
  embedding_diagram_anchor: any = document.body.querySelector(".embedding_diagram_anchor");
  prompt_template_text_area: any = document.body.querySelector(".prompt_template_text_area");
  document_template_text_area: any = document.body.querySelector(".document_template_text_area");
  prompt_template_select_preset: any = document.body.querySelector(".prompt_template_select_preset");
  reset_template_options_button: any = document.body.querySelector(".reset_template_options_button");
  bibleData: any[] = [];
  byVerseAPIToken = "9b2b6dcc-900d-4051-9947-a42830853d86";
  byVerseSessionId = "lh3a4fui9n7j";
  byChapterToken = "f4c8053f-fce6-40ae-a289-70c0a652dd54";
  byChapterSessionId = "86t9gu1ho3di";
  promptUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/message`;
  queryUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/vectorquery`;

  constructor() {
    this.load();
    this.analyze_prompt_button.addEventListener("click", async () => {
      if (this.running) {
        alert("already running");
        return;
      }
      this.analyze_prompt_button.setAttribute("disabled", "");
      this.analyze_prompt_button.innerHTML = "Retrieving results...";
      this.summary_details.innerHTML = "Loading...";
      this.running = true;
      document.body.classList.remove("initial");
      document.body.classList.add("running");
      document.body.classList.remove("complete");
      await Promise.all([
        this.lookupChaptersByVerse(),
        this.lookupChapters(),
        this.sendPromptToLLM(),
      ]);
      this.analyze_prompt_button.removeAttribute("disabled");
      this.analyze_prompt_button.innerHTML = "Bible Lookup";
      this.running = false;
      document.body.classList.add("complete");
      document.body.classList.remove("running");
    });
    this.prompt_template_select_preset.addEventListener("input", () => this.populatePromptTemplates());
    let templateIndex: any = localStorage.getItem("templateIndex");
    if (templateIndex && templateIndex > 0) this.prompt_template_select_preset.selectedIndex = templateIndex;
    let queryIndex: any = localStorage.getItem("queryIndex");
    if (queryIndex && queryIndex > 0) this.embedding_type_select.selectedIndex = queryIndex;

    /*select correct embedding_diagram_img based on saved embedding_type_select value from local storage*/
    if (this.embedding_type_select.selectedIndex === 0) {
      this.embedding_diagram_img.src = "img/ragChapterVerses.png";
      this.embedding_diagram_anchor.href = "img/ragChapterVerses.png";
    }
    if (this.embedding_type_select.selectedIndex === 1) {
      this.embedding_diagram_img.src = "img/ragVerses.png";
      this.embedding_diagram_anchor.href = "img/ragVerses.png";
    } if (this.embedding_type_select.selectedIndex === 2) {
      this.embedding_diagram_img.src = "img/ragChapters.png";
      this.embedding_diagram_anchor.href = "img/ragChapters.png";
    }
    /*change embedding_diagram_img when embedding_type_select value is changed*/
    this.embedding_type_select.addEventListener("input", () => {
      if (this.embedding_type_select.selectedIndex === 0) {
        this.embedding_diagram_img.src = "img/ragChapterVerses.png";
        this.embedding_diagram_anchor.href = "img/ragChapterVerses.png";
      }
      if (this.embedding_type_select.selectedIndex === 1) {
        this.embedding_diagram_img.src = "img/ragVerses.png";
        this.embedding_diagram_anchor.href = "img/ragVerses.png";
      } if (this.embedding_type_select.selectedIndex === 2) {
        this.embedding_diagram_img.src = "img/ragChapters.png";
        this.embedding_diagram_anchor.href = "img/ragChapters.png";
      }
    }); 

    this.populatePromptTemplates(0);
    this.analyze_prompt_textarea.addEventListener("keydown", (e: any) => {
      if (e.key === "Enter" && e.shiftKey === false) {
        e.preventDefault();
        e.stopPropagation();
        this.analyze_prompt_button.click();
      }
    });
    this.analyze_prompt_textarea.addEventListener("input", () => {
      localStorage.setItem("lastPrompt", this.analyze_prompt_textarea.value);
    });
    this.prompt_template_text_area.addEventListener("input", () => {
      localStorage.setItem("promptTemplate", this.prompt_template_text_area.value);
    });
    this.document_template_text_area.addEventListener("input", () => {
      localStorage.setItem("documentTemplate", this.document_template_text_area.value);
    });
    const lastPrompt = localStorage.getItem("lastPrompt");
    if (lastPrompt) this.analyze_prompt_textarea.value = lastPrompt;
    const promptTemplate = localStorage.getItem("promptTemplate");
    if (promptTemplate) this.prompt_template_text_area.value = promptTemplate;
    const documentTemplate = localStorage.getItem("documentTemplate");
    if (documentTemplate) this.document_template_text_area.value = documentTemplate;
    
    this.reset_template_options_button.addEventListener("click", () => {
      this.prompt_template_select_preset.selectedIndex = 0;
      this.embedding_type_select.selectedIndex = 0;
      this.populatePromptTemplates();
      localStorage.setItem("promptTemplate", this.prompt_template_text_area.value);
      localStorage.setItem("documentTemplate", this.document_template_text_area.value);
    });
    this.analyze_prompt_textarea.focus();
    this.analyze_prompt_textarea.select();
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
    this.lookup_verse_response_feed.innerHTML = "";
    const message = this.analyze_prompt_textarea.value.trim();
    if (!message) {
      alert("please supply a message");
      return;
    }

    let result = await this.getMatchingVectors(message, 10, this.byVerseAPIToken, this.byVerseSessionId);
    if (!result.success) {
      console.log("error", result);
      this.full_augmented_response.innerHTML = result.errorMessage;
      return;
    } else {
      console.log(result);
    }

    let html = "Most Relevant Verses...<br>";
    result.matches.forEach((match) => {
      const metaData = JSON.stringify(match.metadata, null, "\n");

      const block = `<div class="verse_card">
            <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="book">${match.metadata.book}</a>
            <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="chapter"
                      data-chapterindex="${match.metadata.chapterIndex}">${Number(match.metadata.chapterIndex) + 1}</a>
            <span class="fw-bold" href="" data-bookindex="${match.metadata.bookIndex}" data-link="verse"
            data-chapterindex="${match.metadata.chapterIndex}"
            data-verseindex="${match.metadata.verseIndex}">${Number(match.metadata.verseIndex) + 1}</span>
            <span style="float: right;">Match: ${(match.score * 100).toFixed()}%</span>
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
    this.lookup_chapter_response_feed.innerHTML = "";
    const message = this.analyze_prompt_textarea.value.trim();
    if (!message) {
      alert("please supply a message");
      return;
    }

    let result = await this.getMatchingVectors(message, 5, this.byChapterToken, this.byChapterSessionId);
    if (!result.success) {
      console.log("error", result);
      this.full_augmented_response.innerHTML = result.errorMessage;
      return;
    } else {
      console.log(result);
    }

    let html = "Most Relevant Chapters...<br>";
    result.matches.forEach((match) => {
      const metaData = JSON.stringify(match.metadata, null, "\n");
      const block = `<div class="verse_card">
          <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="book">${match.metadata.book}</a>
          <span class="fw-bold" href="" data-bookindex="${match.metadata.bookIndex}" data-link="chapter"
                    data-chapterindex="${match.metadata.chapterIndex}">${Number(match.metadata.chapterIndex) + 1}</span>
          <span style="float: right;">Match: ${(match.score * 100).toFixed()}%</span>
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
        alert(bookIndex);
      }
      if (a.dataset.link === "chapter") {
        const bookIndex = Number(a.dataset.bookindex);
        const chapterIndex = Number(a.dataset.chapterindex);
        alert(bookIndex + " : " + chapterIndex);
      }
    })));
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
    localStorage.setItem("templateIndex", this.prompt_template_select_preset.selectedIndex);
    localStorage.setItem("queryIndex", this.embedding_type_select.selectedIndex);

    this.full_augmented_response.innerHTML = "Processing Query...";
    const message = this.analyze_prompt_textarea.value.trim();
    if (!message) {
      alert("please supply a message");
      return;
    }
    const queryDetails = this.getQueryDetails();

    let result = await this.getMatchingVectors(message, queryDetails.topK, queryDetails.apiToken, queryDetails.sessionId);

    if (!result.success) {
      console.log("error", result);
      this.full_augmented_response.innerHTML = result.errorMessage;
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

    

    
    const prompt = this.embedPrompt(message, matches, queryDetails);
    const diagram = this.embedding_diagram_img.src;
    this.summary_details.innerHTML = `<a target="_blank" class="embedding_diagram_anchor" href="${diagram}"><img style="width:100px;float:right" class="embedding_diagram_img" src="${diagram}" alt=""></a>
    <label>Granularity Level</label>: ${this.embedding_type_select.selectedIndex < 2 ? "Verse" : "Chapter"}<br>
    <label>Small to Big</label>: ${this.embedding_type_select.selectedIndex === 0 ? "True" : "False"}<br>
    <label>Top K</label>: ${queryDetails.topK}<br>
    <label>Include K</label>: ${queryDetails.includeK}<br>
    <label>Full Raw Prompt</label>: <div class="raw_prompt">${prompt}</div><br>`;
   

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
      this.full_augmented_response.innerHTML = result.errorMessage;
      return;
    } else {
      console.log(promptResult);
    }
    if (promptResult.assist.error) {
      this.full_augmented_response.innerHTML = promptResult.assist.error;
    } else {
      this.full_augmented_response.innerHTML = promptResult.assist.assist.choices["0"].message.content;
    }
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
    if (templateIndex < 0) templateIndex = this.prompt_template_select_preset.selectedIndex;

    this.prompt_template_text_area.value = promptTemplates[templateIndex].mainPrompt;
    this.document_template_text_area.value = promptTemplates[templateIndex].documentPrompt;
  }
}

const promptTemplates = [
  {
    mainPrompt: `Respond to the following prompt using these Biblical chapters as guidance:
{{documents}}
Respond to prompt using Biblical language:
{{prompt}}`,
    documentPrompt: `Chapter ({{title}}):
{{text}}

`,
  },
  {
    mainPrompt: `Write a new chapter using these Biblical chapters as guidance:
{{documents}}
As primary guidance use:
{{prompt}}`,
    documentPrompt: `{{title}}:
{{text}}

`,
  },
  {
    mainPrompt: `Provide spiritual guidance using a Biblical voice using these chapters as reference:
{{documents}}
This is the specific prompt to respond to:
{{prompt}}`,
    documentPrompt: `{{title}}:
{{text}}

`,
  },
  {
    mainPrompt: `Provide a subject score in a range of 1-10 for political correctness for high school students in the USA for the following documents:
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