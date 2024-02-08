export class AIArchiveDemoApp {
    running = false;
    analyze_prompt_button: any = document.body.querySelector(".analyze_prompt_button");
    lookup_verse_response_feed: any = document.body.querySelector(".lookup_verse_response_feed");
    summary_details: any = document.body.querySelector(".summary_details");
    full_augmented_response: any = document.body.querySelector(".full_augmented_response");
    analyze_prompt_textarea: any = document.body.querySelector(".analyze_prompt_textarea");
    lookup_chapter_response_feed: any = document.body.querySelector(".lookup_chapter_response_feed");
    nav_link = document.body.querySelectorAll(".nav-link");
    btn_close = document.body.querySelector(".btn-close") as HTMLButtonElement;
    source_view_button = document.body.querySelector("#source_view_button") as HTMLButtonElement;
    full_augmented_prompt_button = document.body.querySelector("#full_augmented_prompt_button") as HTMLButtonElement;
    augmented_template_button = document.body.querySelector("#augmented_template_button") as HTMLButtonElement;
    full_augmented_response_button = document.body.querySelector("#full_augmented_response_button") as HTMLButtonElement;
    embedding_type_select: any = document.body.querySelector(".embedding_type_select");
    embedding_diagram_img: any = document.body.querySelector(".embedding_diagram_img");
    embedding_diagram_anchor: any = document.body.querySelector(".embedding_diagram_anchor");
    prompt_template_text_area: any = document.body.querySelector(".prompt_template_text_area");
    document_template_text_area: any = document.body.querySelector(".document_template_text_area");
    prompt_template_select_preset: any = document.body.querySelector(".prompt_template_select_preset");
    reset_template_options_button: any = document.body.querySelector(".reset_template_options_button");
    datachunk_source_size_buttons = document.body.querySelectorAll(`[name="datachunk_source_size"]`);
    embed_distinct_chunks_option: any = document.body.querySelector(".embed_distinct_chunks_option");
    embed_sequential_chunks_option: any = document.body.querySelector(".embed_sequential_chunks_option");
    lookupData: any = {};
    semanticResults: any[] = [];
    chunk100APIToken = "8b9e7b73-cad1-44c7-9a3b-07eb6914bc1a";
    chunk100SessionId = "h3gb1s7uxt02";
    chunk100LookupPath = "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/projectLookups%2FHlm0AZ9mUCeWrMF6hI7SueVPbrq1%2Far-arxiv-100v2%2Flookup.json?alt=media";
    chunk100topK = 25;
    chunk100includeK = 15;

    chunk200APIToken = "96b0d708-ec04-4da5-bcf3-783ffc5329eb";
    chunk200SessionId = "x5m51v87x7g8";
    chunk200LookupPath = "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/projectLookups%2FiMY1WwR6NkVnNkLId5bnKT59Np42%2Far-arxiv-200v2%2Flookup.json?alt=media";
    chunk200topK = 25;
    chunk200includeK = 10;

    chunk400APIToken = "8168ca87-2017-49ad-a8f3-bba00683e7de";
    chunk400SessionId = "ppdbgryy52mn";
    chunk400LookupPath = "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/projectLookups%2FHlm0AZ9mUCeWrMF6hI7SueVPbrq1%2Far-arxiv-400v2%2Flookup.json?alt=media";
    chunk400topK = 25;
    chunk400includeK = 5;

    promptUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/message`;
    queryUrl = `https://us-central1-promptplusai.cloudfunctions.net/lobbyApi/session/external/vectorquery`;
    loaded = false;
    lookUpKeys: string[] = [];

    constructor() {
        this.load();
        this.analyze_prompt_button.addEventListener("click", async () => {
            if (this.running) {
                alert("already running");
                return;
            }
            const message = this.analyze_prompt_textarea.value.trim();
            if (!message) {
                alert("please supply a message");
                return [];
            }
            this.analyze_prompt_button.setAttribute("disabled", "");
            this.analyze_prompt_button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span class="visually-hidden">Loading...</span>`;
            this.summary_details.innerHTML = "Compiling Prompt...";
            this.running = true;

            document.body.classList.remove("initial");
            document.body.classList.add("running");
            document.body.classList.remove("complete");

            this.full_augmented_response.innerHTML = "Processing Query...<br><br>";
            this.semanticResults = await this.lookupAIDocumentChunks();
            this.full_augmented_response.innerHTML += "Similar document chunks retrieved...<br><br>";

            this.full_augmented_response.innerHTML = await this.sendPromptToLLM();
            this.full_augmented_response.innerHTML +=
                `<br><div class="d-flex flex-column link-primary" style="white-space:normal;"><a class="response_verse_link p-2" href="see verses">Top Search Results
        </a><a class="response_detail_link p-2" href="see details">Prompt Details</a></div>`;

            const verseLink = this.full_augmented_response.querySelector(".response_verse_link");
            verseLink.addEventListener("click", (e: any) => {
                e.preventDefault();
                (<any>(document.getElementById("source_view_button"))).click();
            });
            const detailLink = this.full_augmented_response.querySelector(".response_detail_link");
            detailLink.addEventListener("click", (e: any) => {
                e.preventDefault();
                (<any>(document.getElementById("full_augmented_prompt_button"))).click();
            });

            this.analyze_prompt_button.removeAttribute("disabled");
            this.analyze_prompt_button.innerHTML = `<span class="material-icons-outlined mt-1">
        send
        </span>`;
            this.running = false;
            document.body.classList.add("complete");
            document.body.classList.remove("running");
        });

        this.prompt_template_select_preset.addEventListener("input", () => this.populatePromptTemplates());
        let templateIndex: any = localStorage.getItem("ai_templateIndex");
        if (templateIndex && templateIndex > 0) {
            this.prompt_template_select_preset.selectedIndex = templateIndex;
            this.populatePromptTemplates(templateIndex);
        } else {
            this.populatePromptTemplates(0);
        }
        let queryIndex: any = localStorage.getItem("ai_queryIndex");
        if (queryIndex && queryIndex > 0) this.embedding_type_select.selectedIndex = queryIndex;

        /*select correct embedding_diagram_img based on saved embedding_type_select value from local storage*/
        if (this.embedding_type_select.selectedIndex === 0) {
            this.embedding_diagram_img.src = "img/rag_basic.png";
            this.embedding_diagram_anchor.href = "img/rag_basic.png";
        }
        if (this.embedding_type_select.selectedIndex === 1) {
            this.embedding_diagram_img.src = "img/rag_stb.png";
            this.embedding_diagram_anchor.href = "img/rag_stb.png";
        }
        /*change embedding_diagram_img when embedding_type_select value is changed*/
        this.embedding_type_select.addEventListener("input", () => {
            if (this.embedding_type_select.selectedIndex === 0) {
                this.embedding_diagram_img.src = "img/rag_basic.png";
                this.embedding_diagram_anchor.href = "img/rag_basic.png";
            }
            if (this.embedding_type_select.selectedIndex === 1) {
                this.embedding_diagram_img.src = "img/rag_stb.png";
                this.embedding_diagram_anchor.href = "img/rag_stb.png";
            }
        });

        this.full_augmented_prompt_button.addEventListener("click", () => {
            this.btn_close.click();
        });
        this.full_augmented_response_button.addEventListener("click", () => {
            this.btn_close.click();
        });
        this.augmented_template_button.addEventListener("click", () => {
            this.btn_close.click();
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
            this.saveLocalStorage();
        });
        this.prompt_template_text_area.addEventListener("input", () => {
            this.saveLocalStorage();
        });
        this.document_template_text_area.addEventListener("input", () => {
            this.saveLocalStorage();
        });
        const lastPrompt = localStorage.getItem("ai_lastPrompt");
        if (lastPrompt) this.analyze_prompt_textarea.value = lastPrompt;
        const promptTemplate = localStorage.getItem("ai_promptTemplate");
        if (promptTemplate) this.prompt_template_text_area.value = promptTemplate;
        const documentTemplate = localStorage.getItem("ai_documentTemplate");
        if (documentTemplate) this.document_template_text_area.value = documentTemplate;

        this.reset_template_options_button.addEventListener("click", () => {
            this.prompt_template_select_preset.selectedIndex = 0;
            this.embedding_type_select.selectedIndex = 0;
            this.populatePromptTemplates();
            this.saveLocalStorage();
        });
        this.analyze_prompt_textarea.focus();
        this.analyze_prompt_textarea.select();

        this.datachunk_source_size_buttons.forEach((btn: any) => btn.addEventListener("input", () => {
            const l: any = document.querySelector(".loading_screen")
            l.style.display = "";
            const m: any = document.querySelector(".tab_main_content");
            m.style.display = "";
            localStorage.setItem("datachunk_source_size", btn.value);
            this.loaded = false;
            this.load();
        }));
        const chunkSize = localStorage.getItem("datachunk_source_size");
        this.datachunk_source_size_buttons.forEach((btn: any) => {
            if (btn.value === chunkSize) btn.checked = true;
        });
        this.updateEmbeddingOptionsDisplay();
    }
    updateEmbeddingOptionsDisplay() {
        let includeK = Number(this[this.dataSourcePrefix() + "includeK"]);
        this.embed_distinct_chunks_option.innerHTML = `Embed ${includeK}  Document Chunks`;
        this.embed_sequential_chunks_option.innerHTML = `Embed 1 Chunk with ${includeK} Additional Contexts`;
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
    dataSourcePrefix(): string {
        let prefix = localStorage.getItem("datachunk_source_size");
        if (prefix) return prefix as string;
        return "chunk100";
    }
    async load() {
        const lookupPath = this[this.dataSourcePrefix() + "LookupPath"];
        const r = await fetch(lookupPath);
        this.lookupData = await r.json();
        this.loaded = true;
        const l: any = document.querySelector(".loading_screen")
        l.style.display = "none";
        const m: any = document.querySelector(".tab_main_content");
        m.style.display = "flex";
        this.lookUpKeys = Object.keys(this.lookupData).sort();
        this.updateEmbeddingOptionsDisplay();
    }
    async lookupAIDocumentChunks(): Promise<any[]> {
        this.lookup_verse_response_feed.innerHTML = "";
        const message = this.analyze_prompt_textarea.value.trim();

        let topK = Number(this[this.dataSourcePrefix() + "topK"]);
        let result = await this.getMatchingVectors(message, topK, this[this.dataSourcePrefix() + "APIToken"], this[this.dataSourcePrefix() + "SessionId"]);
        if (!result.success) {
            console.log("error", result);
            this.full_augmented_response.innerHTML = result.errorMessage;
            return [];
        } else {
            console.log(result);
        }

        let html = '<span class="small text-muted">Most Relevant Chunks...</span><br>';
        result.matches.forEach((match) => {
            const textFrag = this.lookupData[match.id];
            const dstring = match.metadata.published;
            const d = dstring.slice(0, 4) + "-" + dstring.slice(4, 6) + "-" + dstring.slice(6, 8);
            const parts = match.id.split("_");
            const docID = parts[0];
            const chunkIndex = Number(parts[1]);
            const chunkCount = parts[2];
            const block = `<div class="verse_card">
              <a href="${match.metadata.url}" target="_blank">${match.metadata.title}</a> ${chunkIndex}/${chunkCount}<div style="text-align:right">${d}</div><br>
              <div class="verse_card_text">${textFrag}</div>
              </div>`;
            html += block;
        });

        this.lookup_verse_response_feed.innerHTML = html;

        return result.matches;
    }
    async sendPromptToLLM(): Promise<string> {
        this.saveLocalStorage();
        const message = this.analyze_prompt_textarea.value.trim();
        if (!message) {
            return "please supply a message";
        }

        const prompt = this.embedPrompt(message, this.semanticResults);
        const diagram = this.embedding_diagram_img.src;
        this.summary_details.innerHTML = `<a target="_blank" class="embedding_diagram_anchor" href="${diagram}"><img style="width:100px;float:right" class="embedding_diagram_img" src="${diagram}" alt=""></a>
      <label>Full Raw Prompt</label>: <div class="raw_prompt">${prompt}</div><br>`;

        const apiToken = this[this.dataSourcePrefix() + "APIToken"];
        const sessionId = this[this.dataSourcePrefix() + "SessionId"];
        const body = {
            message: prompt,
            apiToken,
            sessionId,
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
        const embedIndex = this.embedding_type_select.selectedIndex;
        const promptTemplate = this.prompt_template_text_area.value;
        const documentTemplate = this.document_template_text_area.value;
        const promptT = (<any>window).Handlebars.compile(promptTemplate);
        const docT = (<any>window).Handlebars.compile(documentTemplate);
        let documentsEmbedText = "";
        if (embedIndex === 0) {
            let includeK = Number(this[this.dataSourcePrefix() + "includeK"]);
            const includes = matches.slice(0, includeK);
            includes.forEach((match: any, index: number) => {
                const merge = Object.assign({}, match.metadata);
                merge.id = match.id;
                merge.matchIndex = index;
                merge.text = this.lookupData[match.id];

                console.log(merge);
                documentsEmbedText += (<any>docT)(merge);
            });
        } else if (embedIndex === 1) {
            const match = matches[0];
            const merge = Object.assign({}, match.metadata);
            merge.id = match.id;
            merge.matchIndex = 0;
            const lookUpIndex = this.lookUpKeys.indexOf(match.id);

            let includeK = Number(this[this.dataSourcePrefix() + "includeK"]);
            let firstIndex = lookUpIndex - Math.floor(includeK / 2);
            let lastIndex = lookUpIndex + Math.ceil(includeK / 2);
            if (firstIndex < 0) firstIndex = 0;
            if (lastIndex > this.lookUpKeys.length - 1) lastIndex = this.lookUpKeys.length - 1;
            const parts = match.id.split("_");
            const docID = parts[0];
            console.log("this is merge object", merge, firstIndex, lastIndex, docID);
            for (let i = firstIndex; i <= lastIndex; i++) {
                const chunkKey = this.lookUpKeys[i];
                if (chunkKey.indexOf(docID) === 0) {
                    merge.text += this.lookupData[chunkKey] + "\n";
                }
            }
            documentsEmbedText += (<any>docT)(merge);
        }

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
        this.saveLocalStorage();
    }

    saveLocalStorage() {
        localStorage.setItem("ai_templateIndex", this.prompt_template_select_preset.selectedIndex);
        localStorage.setItem("ai_queryIndex", this.embedding_type_select.selectedIndex);
        localStorage.setItem("ai_lastPrompt", this.analyze_prompt_textarea.value);
        localStorage.setItem("ai_promptTemplate", this.prompt_template_text_area.value);
        localStorage.setItem("ai_documentTemplate", this.document_template_text_area.value);
    }
}

const promptTemplates = [
    {
        mainPrompt: `You are an AI research assistant. Your job is to answer my prompt based on the context information provided below:
---------------------
{{documents}}
---------------------
Answer the following prompt:
{{prompt}}`,
        documentPrompt: `({{title}}):
  {{text}}
  `,
    },
    {
        mainPrompt: `You are an AI research assistant. Your job is to answer my prompt based on the context information provided below:
---------------------
{{documents}}
---------------------

Answer the following prompt using the provided context only, do not use pre-training; if you cannot answer the question, please state that you cannot answer the question:
Prompt: {{prompt}}`,
        documentPrompt: `({{title}}):
  {{text}}
  `,
    },
];