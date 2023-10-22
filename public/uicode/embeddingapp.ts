import BaseApp from "./baseapp.js";
import ChatDocument from "./chatdocument.js";
declare const firebase: any;
declare const window: any;

/** Guess app class */
export class EmbeddingApp extends BaseApp {
    show_profile_modal: any = document.querySelector(".show_profile_modal");
    help_show_modal: any = document.querySelector(".help_show_modal");
    sign_out_homepage: any = document.querySelector(".sign_out_homepage");
    upload_embedding_documents_btn: any = document.querySelector(".upload_embedding_documents_btn");
    copy_results_to_clipboard: any = document.querySelector(".copy_results_to_clipboard");
    run_prompt: any = document.querySelector(".run_prompt");
    delete_index: any = document.querySelector(".delete_index");
    results_div: any = document.querySelector(".results_div");
    results_table: any = document.querySelector(".results_table");
    batch_id: any = document.querySelector(".batch_id");
    pinecone_key: any = document.querySelector(".pinecone_key");
    pinecone_environment: any = document.querySelector(".pinecone_environment");
    prompt_area: any = document.querySelector(".prompt_area");
    document_list_file_status: any = document.querySelector(".document_list_file_status");
    document_list_file_name: any = document.querySelector(".document_list_file_name");
    embedding_list_file_dom: any = document.querySelector(".embedding_list_file_dom");
    upload_document_list_button: any = document.querySelector(".upload_document_list_button");
    preview_embedding_documents_list: any = document.querySelector(".preview_embedding_documents_list");
    upsert_results_display_table: any = document.querySelector(".upsert_results_display_table");
    download_csv_results_btn: any = document.querySelector(".download_csv_results_btn");
    download_json_results_btn: any = document.querySelector(".download_json_results_btn");
    fileListToUpload: Array<any> = [];
    upsertFileResults: Array<any> = [];
    embeddingRunning = false;
    vectorQueryRunning = false;
    indexDeleteRunning = false;

    /** */
    constructor() {
        super();
        this.showLoginModal = true;
        this.profileHelper.noAuthPage = false;

        this.upload_embedding_documents_btn.addEventListener("click", () => this.embedURLContent());
        this.run_prompt.addEventListener("click", () => this.queryEmbeddings());
        this.delete_index.addEventListener("click", () => this.deleteIndex());
        this.copy_results_to_clipboard.addEventListener("click", () => {
            const data = this.results_div.innerHTML;
            navigator.clipboard.writeText(data);
        });

        if (this.show_profile_modal) {
            this.show_profile_modal.addEventListener("click", (event: any) => {
                event.stopPropagation();
                event.preventDefault();

                this.profileHelper.show();
            });
        }

        this.upload_document_list_button.addEventListener("click", () => this.embedding_list_file_dom.click());
        this.embedding_list_file_dom.addEventListener("change", () => this.updateParsedEmbeddingListFileStatus());
        this.updateParsedEmbeddingListFileStatus();
        this.updateUpsertResultsTable();

        this.download_csv_results_btn.addEventListener("click", () => this.downloadResultsFile(true));
        this.download_json_results_btn.addEventListener("click", () => this.downloadResultsFile());
    }
    /**
     * @param { boolean } csv
    */
    downloadResultsFile(csv = false) {
        if (!this.upsertFileResults || this.upsertFileResults.length === 0) {
            alert("no results to download");
            return;
        }
        let type = "application/csv";
        let resultText = "";
        let fileName = "";
        if (csv) {
            fileName = "upsertResults.csv";
            resultText = window.Papa.unparse(this.upsertFileResults);
        } else {
            type = "application/json";
            fileName = "upsertResults.json";
            resultText = JSON.stringify(this.upsertFileResults, null, "  ");
        }

        const file = new File([resultText], fileName, {
            type,
        });

        const link = document.createElement("a");
        const url = URL.createObjectURL(file);

        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
    /**
     * @return { any }
    */
    scrapeData(): any {
        const batchId = this.batch_id.value;
        const pineconeKey = this.pinecone_key.value;
        const pineconeEnvironment = this.pinecone_environment.value;
        const prompt = this.prompt_area.value;

        return {
            urls: "",
            batchId,
            pineconeKey,
            pineconeEnvironment,
            prompt,
        };
    }
    /** override event that happens after authentication resolution */
    authUpdateStatusUI(): void {
        super.authUpdateStatusUI();
        /*
        if (this.profile) {
        }
        */
    }
    /** */
    async embedURLContent() {
        const data = this.scrapeData();
        await this._embedURLContent(this.fileListToUpload, data.batchId, data.pineconeKey, data.pineconeEnvironment);
    }
    /** scrape URLs for embedding
     * @param { Array<any> } fileList
     * @param { string } batchId grouping key
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
    */
    async _embedURLContent(fileList: Array<any>, batchId: string, pineconeKey: string, pineconeEnvironment: string) {
        if (!firebase.auth().currentUser) {
            alert("login on homepage to use this");
            return;
        }
        if (this.embeddingRunning) {
            alert("already running");
            return;
        }

        this.upload_embedding_documents_btn.innerHTML = "Embedding...";
        this.embeddingRunning = true;
        const body = {
            fileList,
            batchId,
            pineconeKey,
            pineconeEnvironment,
        };

        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/scrapeurls", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const json = await fResult.json();
        this.upsertFileResults = json.fileUploadResults;
        this.updateUpsertResultsTable();

        this.embeddingRunning = false;
        this.upload_embedding_documents_btn.innerHTML = "Upsert Documents";
    }
    /** */
    async queryEmbeddings() {
        const data = this.scrapeData();
        await this._queryEmbeddings(data.prompt, data.batchId, data.pineconeKey, data.pineconeEnvironment);
    }
    /** query matching vector documents
     * @param { string } query
     * @param { string } batchId grouping key
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
    */
    async _queryEmbeddings(query: string, batchId: string, pineconeKey: string, pineconeEnvironment: string) {
        if (!firebase.auth().currentUser) {
            alert("login on homepage to use this");
            return;
        }
        if (this.vectorQueryRunning) {
            alert("already running");
            return;
        }

        this.results_table.innerHTML = "";
        this.results_div.innerHTML = "";

        this.run_prompt.innerHTML = "Processing...";
        this.vectorQueryRunning = true;
        const body = {
            query,
            batchId,
            pineconeKey,
            pineconeEnvironment,
        };

        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/processquery", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const json = await fResult.json();
        console.log("query response", json);

        const resultRows = json.queryResponse.matches;
        let tableRowsHtml = "<tr><th>URL</th><th>Text</th></tr>";
        let primedPrompt = "";
        resultRows.forEach((row: any) => {
            const text = row.metadata.text;
            const url = row.metadata.url;
            tableRowsHtml += `<tr><td>${url}</td><td>${text}</td></tr>`;
            primedPrompt += "Question: " + query +
                "\n\nAnswer: " + text + "\n\n";
        });
        primedPrompt += "Question: " + query;
        this.results_table.innerHTML = tableRowsHtml;
        this.results_div.innerHTML = primedPrompt;

        this.vectorQueryRunning = false;
        this.run_prompt.innerHTML = "Run Query";
    }
    /** */
    async deleteIndex() {
        const data = this.scrapeData();
        await this._deleteIndex(data.batchId, data.pineconeKey, data.pineconeEnvironment);
    }
    /** delete index
     * @param { string } batchId grouping key
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
    */
    async _deleteIndex(batchId: string, pineconeKey: string, pineconeEnvironment: string) {
        if (!firebase.auth().currentUser) {
            alert("login on homepage to use this");
            return;
        }
        if (this.indexDeleteRunning) {
            alert("already running");
            return;
        }

        this.delete_index.innerHTML = "Deleting...";
        this.indexDeleteRunning = true;
        const body = {
            batchId,
            pineconeEnvironment,
            pineconeKey,
        };

        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/deleteindex", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const json = await fResult.json();
        console.log("query response", json);

        this.indexDeleteRunning = false;
        this.delete_index.innerHTML = "Delete Batch (Pinecone Index)";

        if (json.success === false) {
            alert(json.errorMessage);
        }
    }
    /** */
    async updateParsedEmbeddingListFileStatus(): Promise<Array<any>> {
        const importData = await ChatDocument.getImportDataFromDomFile(this.embedding_list_file_dom);
        let contentCount = "";
        contentCount = importData.length + " rows";
        let fileContent = "<table class=\"file_preview_table\">";
        const keys = ["exclude", "url", "id", "title", "options", "text", "prefix"];
        fileContent += "<tr>";
        fileContent += `<th>row</th>`;
        keys.forEach((key: string) => fileContent += `<th>${key}</th>`);
        fileContent += "</tr>";

        this.fileListToUpload = [];
        importData.forEach((row: any, index: number) => {
          fileContent += "<tr>";
          fileContent += `<th>${index + 1}</th>`;
          const newRow: any = {};
          keys.forEach((key: string) => {
            let value = row[key];
            if (value === undefined) value = "";
            fileContent += `<td>${BaseApp.escapeHTML(value)}</td>`;
            newRow[key] = value;
          });
          fileContent += "</tr>";
          this.fileListToUpload.push(newRow);
        });

        fileContent += `</table>`;

        this.preview_embedding_documents_list.innerHTML = fileContent;

        this.document_list_file_status.innerHTML = contentCount;
        let fileName = "";
        if (this.embedding_list_file_dom.files[0]) fileName = this.embedding_list_file_dom.files[0].name;
        this.document_list_file_name.innerHTML = fileName;
        return importData;
      }
    /** */
    async updateUpsertResultsTable() {
        let fileContent = "<table class=\"file_preview_table\">";
        const keys = ["id", "url", "title", "textSize", "errorMessage"];
        fileContent += "<tr>";
        fileContent += `<th>row</th>`;
        keys.forEach((key: string) => fileContent += `<th>${key}</th>`);
        fileContent += "</tr>";

        this.upsertFileResults.forEach((row: any, index: number) => {
          fileContent += "<tr>";
          fileContent += `<th>${index + 1}</th>`;
          const newRow: any = {};
          keys.forEach((key: string) => {
            let value = row[key];
            if (value === undefined) value = "";
            fileContent += `<td>${BaseApp.escapeHTML(value)}</td>`;
            newRow[key] = value;
          });
          fileContent += "</tr>";
        });

        fileContent += `</table>`;

        this.upsert_results_display_table.innerHTML = fileContent;
      }
}
