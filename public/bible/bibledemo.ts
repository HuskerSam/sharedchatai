export class BibleDemoApp {
  running = false;
  submit_button: any = document.body.querySelector(".submit_button");
  message_text: any = document.body.querySelector(".message_text");
  response_feed: any = document.body.querySelector(".response_feed");
  augmented_submit_button: any = document.body.querySelector(".augmented_submit_button");
  augmented_chapters_view: any = document.body.querySelector("#augmented_chapters_view");
  augmented_message_text: any = document.body.querySelector(".augmented_message_text");
  full_augmented_prompt: any = document.body.querySelector(".full_augmented_prompt");
  full_augmented_response: any = document.body.querySelector(".full_augmented_response");
  bibleData: any[] = [];
  apiToken = "76acdd7d-609c-4a39-ab89-bc73b0c2c531";
  sessionId = "vkuyk8lg74nq";
  promptUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/message`;
  queryUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/vectorquery`;

  constructor() {
    this.load();
  }

  async getMatchingVectors(message, topK) {
    const body = {
      message,
      apiToken: this.apiToken,
      sessionId: this.sessionId,
      topK,
    }
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
    this.submit_button.addEventListener("click", async () => {
      if (this.running) return;
      this.running = true;
      this.response_feed.innerHTML = "running...";
      const message = this.message_text.value.trim();
      if (!message) {
        alert("please supply a message");
        return;
      }

      let result = await this.getMatchingVectors(message, 10);
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

      this.response_feed.innerHTML = html;

      this.response_feed.querySelectorAll("a").forEach((a => a.addEventListener("click", (e) => {
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
    });

    this.augmented_submit_button.addEventListener("click", async () => {
      if (this.running) return;
      this.running = true;
      this.response_feed.innerHTML = "running...";
      const message = this.augmented_message_text.value.trim();
      if (!message) {
        alert("please supply a message");
        return;
      }

      let result = await this.getMatchingVectors(message, 5);
      this.running = false;
      if (!result.success) {
        console.log("error", result);
        alert(result.errorMessage);
        return;
      } else {
        console.log(result);
      }

      // get first 2 unique (or just 1)
      let matches = [result.matches[0]];
      let cIndex = result.matches[0].metadata.chapterIndex;
      let bIndex = result.matches[0].metadata.bookIndex;
      for (let c = 1, l = result.matches.length; c < l; c++) {
        let match = result.matches[c];
        if (match.metadata.chapterIndex !== cIndex || match.metadata.bookIndex !== bIndex) {
          matches.push(match);
          break;
        }
      }

      let chaptersHTML = "";
      let chaptersText: any[] = [];
      matches.forEach((match) => {
        let chapterDetails = this.getChapter(match.metadata.bookIndex, match.metadata.chapterIndex, match.metadata.verseIndex);

        const block = `<div class="verse_card">
            <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="book">${match.metadata.book}</a>
            <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="chapter"
                      data-chapterindex="${match.metadata.chapterIndex}">${match.metadata.chapterIndex + 1}</a>
            <a href="" data-bookindex="${match.metadata.bookIndex}" data-link="verse"
            data-chapterindex="${match.metadata.chapterIndex}"
            data-verseindex="${match.metadata.verseIndex}">${match.metadata.verseIndex + 1}</a>
              ${(match.score * 100).toFixed()}%
              <br>
              <div>${chapterDetails.html}</div>
            </div>`;
        chaptersHTML += block;
        chaptersText.push(chapterDetails.text);
      });

      this.augmented_chapters_view.innerHTML = chaptersHTML;

      let prompt = `Please respond to the following prompt using these Biblical chapters as guidance:\n`;
      prompt += `Chapter 1 (${matches[0].metadata.title}):\n`;
      prompt += `${chaptersText[0]}\n`;
      if (matches[1]) {
        prompt += `Chapter 2 (${matches[1].metadata.title}):\n`;
        prompt += `${chaptersText[1]}\n`;
      }
      prompt += `Respond to prompt using Biblical language: ${message}`;
      this.full_augmented_prompt.innerHTML = prompt;

      const body = {
        message: prompt,
        apiToken: this.apiToken,
        sessionId: this.sessionId,
      }
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
    });
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
  getChaptersByBook() {
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
}
