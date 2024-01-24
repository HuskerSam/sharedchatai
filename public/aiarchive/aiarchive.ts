export class BibleDemoApp {
    running = false;
    analyze_prompt_button: any = document.body.querySelector(".analyze_prompt_button");
    lookup_verse_response_feed: any = document.body.querySelector(".lookup_verse_response_feed");
    summary_details: any = document.body.querySelector(".summary_details");
    full_augmented_response: any = document.body.querySelector(".full_augmented_response");
    analyze_prompt_textarea: any = document.body.querySelector(".analyze_prompt_textarea");
    lookup_chapter_response_feed: any = document.body.querySelector(".lookup_chapter_response_feed");
    nav_link = document.body.querySelectorAll(".nav-link");
    embedding_type_select: any = document.body.querySelector(".embedding_type_select");
    embedding_diagram_img: any = document.body.querySelector(".embedding_diagram_img");
    embedding_diagram_anchor: any = document.body.querySelector(".embedding_diagram_anchor");
    prompt_template_text_area: any = document.body.querySelector(".prompt_template_text_area");
    document_template_text_area: any = document.body.querySelector(".document_template_text_area");
    prompt_template_select_preset: any = document.body.querySelector(".prompt_template_select_preset");
    reset_template_options_button: any = document.body.querySelector(".reset_template_options_button");
    lookupData: any = {};
    semanticResults: any[] = [];
    dataAPIToken = "0dadbeef-575c-432d-ab31-10b2574c6daa";
    sessionId = "nn7wlhoywt3f";
    promptUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/message`;
    queryUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/vectorquery`;
    loaded = false;

    constructor() {
        this.load();
        this.analyze_prompt_button.addEventListener("click", async () => {
            if (this.running) {
                alert("already running");
                return;
            }
            this.analyze_prompt_button.setAttribute("disabled", "");
            this.analyze_prompt_button.innerHTML = `...`;
            this.summary_details.innerHTML = "Compiling Prompt...";
            this.running = true;

            document.body.classList.remove("initial");
            document.body.classList.add("running");
            document.body.classList.remove("complete");

            this.full_augmented_response.innerHTML = "Processing Query...<br><br>";
            this.semanticResults = await this.lookupAIDocumentChunks();
            this.full_augmented_response.innerHTML += "Similar document chunks retrieved...<br><br>";

            this.nav_link.forEach((tab) => {
                tab.classList.remove('disabled');
                tab.setAttribute('aria-disabled', 'false');
            });

            this.full_augmented_response.innerHTML = await this.sendPromptToLLM();
            this.full_augmented_response.innerHTML +=
                `<br><div class="d-flex flex-column link-primary" style="white-space:normal;"><a class="response_verse_link p-2" href="see verses">Top Search Results
        </a><a class="response_detail_link p-2" href="see details">Prompt Details</a></div>`;

            const verseLink = this.full_augmented_response.querySelector(".response_verse_link");
            verseLink.addEventListener("click", (e: any) => {
                e.preventDefault();
                (<any>(document.getElementById("verses_view_button"))).click();
            });
            const detailLink = this.full_augmented_response.querySelector(".response_detail_link");
            detailLink.addEventListener("click", (e: any) => {
                e.preventDefault();
                (<any>(document.getElementById("full_augmented_prompt_button"))).click();
            });

            this.analyze_prompt_button.removeAttribute("disabled");
            this.analyze_prompt_button.innerHTML = `<span class="material-icons-outlined">
        send
        </span>`;
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
        const r = await fetch("https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/projectLookups%2FHlm0AZ9mUCeWrMF6hI7SueVPbrq1%2Faidata_target_starter%2Flookup.json?alt=media");
        this.lookupData = await r.json();
        this.loaded = true;
        alert("ready");
    }
    async lookupAIDocumentChunks(): Promise<any[]> {
        this.lookup_verse_response_feed.innerHTML = "";
        const message = this.analyze_prompt_textarea.value.trim();
        if (!message) {
            alert("please supply a message");
            return [];
        }

        let result = await this.getMatchingVectors(message, 10, this.dataAPIToken, this.sessionId);
        if (!result.success) {
            console.log("error", result);
            this.full_augmented_response.innerHTML = result.errorMessage;
            return [];
        } else {
            console.log(result);
        }

        let html = '<span class="small text-muted">Most Relevant Verses...</span><br>';
        result.matches.forEach((match) => {
            const textFrag = this.lookupData[match.id];
            const dstring = match.metadata.published;
            const d = dstring.slice(0, 4) + "-" + dstring.slice(4, 6) + "-" + dstring.slice(6, 8);
            const block = `<div class="verse_card">
              <a href="${match.metadata.url}" target="_blank">${match.metadata.title}</a> (${match.metadata.chunk_id}) ${d}<br>
              <div class="verse_card_text">${textFrag}</div>
              </div>`;
            html += block;
        });

        this.lookup_verse_response_feed.innerHTML = html;

        return result.matches;
    }
    async sendPromptToLLM(): Promise<string> {
        localStorage.setItem("templateIndex", this.prompt_template_select_preset.selectedIndex);
        localStorage.setItem("queryIndex", this.embedding_type_select.selectedIndex);
        const message = this.analyze_prompt_textarea.value.trim();
        if (!message) {
            return "please supply a message";
        }

        const prompt = this.embedPrompt(message, this.semanticResults);
        const diagram = this.embedding_diagram_img.src;
        this.summary_details.innerHTML = `<a target="_blank" class="embedding_diagram_anchor" href="${diagram}"><img style="width:100px;float:right" class="embedding_diagram_img" src="${diagram}" alt=""></a>
      <label>Granularity Level</label>: ${this.embedding_type_select.selectedIndex < 2 ? "Verse" : "Chapter"}<br>
      <label>Small to Big</label>: ${this.embedding_type_select.selectedIndex === 0 ? "True" : "False"}<br>
      <label>Full Raw Prompt</label>: <div class="raw_prompt">${prompt}</div><br>`;

      console.log(prompt);
        const body = {
            message: prompt,
            apiToken: this.dataAPIToken,
            sessionId: this.sessionId,
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
            return promptResult.errorMessage;
        } else {
            console.log(promptResult);
        }
        if (promptResult.assist.error) {
            return promptResult.assist.error;
        } else {
            return promptResult.assist.assist.choices["0"].message.content;
        }
    }
    embedPrompt(prompt: string, matches: any[]): string {
        const promptTemplate = this.prompt_template_text_area.value;
        const documentTemplate = this.document_template_text_area.value;
        const promptT = (<any>window).Handlebars.compile(promptTemplate);
        const docT = (<any>window).Handlebars.compile(documentTemplate);

        let documentsEmbedText = "";
        matches.forEach((match: any, index: number) => {
            const merge = Object.assign({}, match.metadata);
            merge.id = match.id;
            merge.matchIndex = index;
            console.log(this.lookupData, match.id);
            merge.text = this.lookupData[match.id];

            console.log(merge);
            documentsEmbedText += (<any>docT)(merge);
        });

        const mainMerge = {
            documents: documentsEmbedText,
            prompt,
        };
        return (<any>promptT)(mainMerge);
    }
    populatePromptTemplates(templateIndex: number = -1) {
        if (templateIndex < 0) templateIndex = this.prompt_template_select_preset.selectedIndex;

        this.prompt_template_text_area.value = promptTemplates[templateIndex].mainPrompt;
        this.document_template_text_area.value = promptTemplates[templateIndex].documentPrompt;
    }
}

const promptTemplates = [
    {
        mainPrompt: `For reference, the following AI research papers: {{documents}} 
        
Use reference to answer to the following prompt: 
{{prompt}}`,
        documentPrompt: `({{title}}):
  {{text}}
  `,
    },
];