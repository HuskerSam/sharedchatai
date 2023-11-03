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
    embedding_query_results_table_wrapper: any = document.querySelector(".embedding_query_results_table_wrapper");
    batch_id: any = document.querySelector(".batch_id");
    pinecone_key: any = document.querySelector(".pinecone_key");
    pinecone_environment: any = document.querySelector(".pinecone_environment");
    prompt_area: any = document.querySelector(".prompt_area");
    document_list_file_status: any = document.querySelector(".document_list_file_status");
    document_list_file_name: any = document.querySelector(".document_list_file_name");
    embedding_list_file_dom: any = document.querySelector(".embedding_list_file_dom");
    upload_document_list_button: any = document.querySelector(".upload_document_list_button");
    download_csv_results_btn: any = document.querySelector(".download_csv_results_btn");
    download_json_results_btn: any = document.querySelector(".download_json_results_btn");
    upsert_result_status_bar: any = document.querySelector(".upsert_result_status_bar");
    save_pineconeoptions_btn: any = document.querySelector(".save_pineconeoptions_btn");
    copy_resultdoclist_to_clipboard: any = document.querySelector(".copy_resultdoclist_to_clipboard");
    results_open_new_window: any = document.querySelector(".results_open_new_window");
    fetch_pinecone_index_stats_btn: any = document.querySelector(".fetch_pinecone_index_stats_btn");
    pinecone_index_stats_display: any = document.querySelector(".pinecone_index_stats_display");
    pinecone_index_count: any = document.querySelector(".pinecone_index_count");
    pinecone_index_name: any = document.querySelector(".pinecone_index_name");
    delete_pinecone_vector_id: any = document.querySelector(".delete_pinecone_vector_id");
    pinecone_id_to_delete: any = document.querySelector(".pinecone_id_to_delete");
    fileUpsertListFirestore: any = null;
    queryDocumentsResultRows: any = [];
    fileListToUpload: Array<any> = [];
    upsertFileResults: Array<any> = [];
    pineconeQueryResults: any = {};
    csvUploadDocumentsTabulator: any = null;
    embeddingRunning = false;
    vectorQueryRunning = false;
    indexDeleteRunning = false;
    primedPrompt = "";
    pineConeInited = false;

    /** */
    constructor() {
        super();
        this.showLoginModal = true;
        this.profileHelper.noAuthPage = false;

        this.csvUploadDocumentsTabulator = new window.Tabulator(".preview_embedding_documents_table", {
            data: [],
            height: "100%",
            layout: "fitColumns",
            columns: [
                {
                    title: "row",
                    field: "row",
                },
                {
                    title: "url",
                    field: "url",
                }, {
                    title: "id",
                    field: "id",
                }, {
                    title: "title",
                    field: "title",
                }, {
                    title: "options",
                    field: "options",
                }, {
                    title: "text",
                    field: "text",
                }, {
                    title: "prefix",
                    field: "prefix",
                }, {
                    title: "uploaded",
                    field: "uploadedDate",
                    formatter: (cell: any) => {
                        return this.showGmailStyleDate(new Date(cell.getValue()));
                    },
                }, {
                    title: "upserted",
                    field: "upsertedDate",
                    formatter: (cell: any) => {
                        return this.showGmailStyleDate(new Date(cell.getValue()));
                    },
                }, {
                    title: "pineconeId",
                    field: "pineconeId",
                }, {
                    title: "Characters",
                    field: "size",
                },, {
                    title: "pineconeTitle",
                    field: "pineconeTitle",
                },
            ],
        });

        this.upload_embedding_documents_btn.addEventListener("click", () => this.embedURLContent());
        this.run_prompt.addEventListener("click", () => this.queryEmbeddings());
        this.delete_index.addEventListener("click", () => this.deleteIndex());
        this.copy_results_to_clipboard.addEventListener("click", () => {
            navigator.clipboard.writeText(this.primedPrompt);
        });

        if (this.show_profile_modal) {
            this.show_profile_modal.addEventListener("click", (event: any) => {
                event.stopPropagation();
                event.preventDefault();

                this.profileHelper.show();
            });
        }

        this.upload_document_list_button.addEventListener("click", () => this.embedding_list_file_dom.click());
        this.embedding_list_file_dom.addEventListener("change", () => this.uploadUpsertListFile());

        this.download_csv_results_btn.addEventListener("click", () => this.downloadResultsFile(true));
        this.download_json_results_btn.addEventListener("click", () => this.downloadResultsFile());
        this.save_pineconeoptions_btn.addEventListener("click", () => {
            const data = this.scrapeData();
            this._fetchIndexStats(data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
        });
        this.copy_resultdoclist_to_clipboard.addEventListener("click", () => this.copyQueryResultsToClipboard());
        this.results_open_new_window.addEventListener("click", () => {
            const wnd = window.open("about:blank", "", "_blank");
            wnd.document.write(`<div style="white-space: pre-wrap">${this.primedPrompt}</div>`);
        });
        this.fetch_pinecone_index_stats_btn.addEventListener("click", () => this.fetchIndexStats());
        this.delete_pinecone_vector_id.addEventListener("click", () => this.deletePineconeVector());

        this.updateQueriedDocumentList();
    }
    /** */
    copyQueryResultsToClipboard() {
        const jsonStr = JSON.stringify(this.pineconeQueryResults, null, "\t");
        navigator.clipboard.writeText(jsonStr);
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
        const pineconeIndex = this.batch_id.value;
        const pineconeKey = this.pinecone_key.value;
        const pineconeEnvironment = this.pinecone_environment.value;
        const pineconePrompt = this.prompt_area.value;

        this.savePineconeOptions({
            pineconeIndex,
            pineconeKey,
            pineconeEnvironment,
            pineconePrompt,
        });
        return {
            urls: "",
            pineconeIndex,
            pineconeKey,
            pineconeEnvironment,
            pineconePrompt,
        };
    }
    /**
     * @return { any }
    */
    getPineconeOptions(): any {
        let pineconeIndex = "";
        let pineconeKey = "";
        let pineconeEnvironment = "";
        let pineconePrompt = "";
        if (this.profile.emb_pineconeIndex !== undefined) pineconeIndex = this.profile.emb_pineconeIndex;
        if (this.profile.emb_pineconeKey !== undefined) pineconeKey = this.profile.emb_pineconeKey;
        if (this.profile.emb_pineconeEnvironment !== undefined) pineconeEnvironment = this.profile.emb_pineconeEnvironment;
        if (this.profile.emb_pineconePrompt !== undefined) pineconePrompt = this.profile.emb_pineconePrompt;

        return {
            pineconeIndex,
            pineconeKey,
            pineconeEnvironment,
            pineconePrompt,
        };
    }
    /**
     * @param { any } options
     */
    async savePineconeOptions(options: any) {
        const profileOptions = this.getPineconeOptions();
        if (options.pineconeIndex !== profileOptions.pineconeIndex ||
            options.pineconeKey !== profileOptions.pineconeKey ||
            options.pineconeEnvironment !== profileOptions.pineconeEnvironment) {
            await Promise.all([
                this.saveProfileField("emb_pineconeIndex", options.pineconeIndex),
                this.saveProfileField("emb_pineconeKey", options.pineconeKey),
                this.saveProfileField("emb_pineconeEnvironment", options.pineconeEnvironment),
            ]);
        }
        if (options.pineconePrompt !== profileOptions.pineconePrompt) {
            await this.saveProfileField("emb_pineconePrompt", options.pineconePrompt);
        }
    }
    /** override event that happens after authentication resolution */
    authUpdateStatusUI(): void {
        super.authUpdateStatusUI();
        if (this.profile && !this.pineConeInited) {
            const options = this.getPineconeOptions();
            this.batch_id.value = options.pineconeIndex;
            this.pinecone_key.value = options.pineconeKey;
            this.pinecone_environment.value = options.pineconeEnvironment;
            this.prompt_area.value = options.pineconePrompt;
            this.pineConeInited = true;
            this.fetchIndexStats();
            this.watchUpsertRows();
        }
    }
    /** */
    async embedURLContent() {
        const data = this.scrapeData();
        await this._embedURLContent(this.fileListToUpload, data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
        this._fetchIndexStats(data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
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
        this.upsertFileResults = [];
        this.upsert_result_status_bar.innerHTML = "processing document list...";
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
        this.applyUpsertResultsToStore();

        this.embeddingRunning = false;
        const count = this.upsertFileResults.length;
        let errors = 0;
        let credits = 0;
        this.upsertFileResults.forEach((result: any) => {
            if (result.errorMessage) errors++;
            else credits += result.encodingCredits;
        });
        this.upsert_result_status_bar.innerHTML = `${count} rows processed, ${errors} errors, ${credits.toFixed(3)} credits`;
    }
    /** */
    async queryEmbeddings() {
        const data = this.scrapeData();
        await this._queryEmbeddings(data.pineconePrompt, data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
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
        this.queryDocumentsResultRows = [];
        this.updateQueriedDocumentList();
        this.primedPrompt = "";

        this.run_prompt.innerHTML = "Processing...";
        this.vectorQueryRunning = true;
        const body = {
            query,
            batchId,
            pineconeKey,
            pineconeEnvironment,
            topK: 10,
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
        this.pineconeQueryResults = json;

        const resultRows = json.queryResponse.matches;
        this.queryDocumentsResultRows = resultRows;
        let primedPrompt = "";
        resultRows.forEach((row: any) => {
            const text = row.metadata.text;
            primedPrompt += "Question: " + query +
                "\n\nAnswer: " + text + "\n\n";
        });
        primedPrompt += "Question: " + query;
        this.primedPrompt = primedPrompt;
        this.updateQueriedDocumentList();

        this.vectorQueryRunning = false;
        this.run_prompt.innerHTML = "Run Query";
    }
    /** */
    updateQueriedDocumentList() {
        let fileContent = "<table class=\"query_result_documents_list\">";
        const keys = ["similarity", "id", "url", "title", "text", "copy", "size", "encodingCredits"];
        fileContent += "<tr>";
        fileContent += `<th>row</th>`;
        keys.forEach((key: string) => fileContent += `<th>${key}</th>`);
        fileContent += "</tr>";

        this.queryDocumentsResultRows.forEach((row: any, index: number) => {
            fileContent += "<tr>";
            fileContent += `<th>${index + 1}</th>`;
            const newRow: any = {};
            keys.forEach((key: string) => {
                let value = row.metadata[key];
                const rawValue = value;
                value = BaseApp.escapeHTML(value);
                if (key === "id") value = row.id;
                if (key === "similarity") value = row.score;
                if (key === "encodingCredits") value = rawValue.toString().substring(0, 6);
                if (key === "size") value = row.metadata.text.length;
                if (key === "url") value = `<a href="${rawValue}" target="_blank">${rawValue}</a>`;
                if (key === "copy") {
                    value = `<button data-index="${index}" class="btn btn-secondary 
                       doc_text_copy_btn"><i class="material-icons">content_copy</i></button>`;
                }
                fileContent += `<td class="table_cell_sizer"><div>${value}</div></td>`;
                newRow[key] = value;
            });
            fileContent += "</tr>";
        });

        fileContent += `</table>`;
        this.embedding_query_results_table_wrapper.innerHTML = fileContent;
        this.embedding_query_results_table_wrapper.querySelectorAll(".doc_text_copy_btn").forEach((btn: any) => {
            btn.addEventListener("click", () => {
                const index = btn.dataset.index;
                const row = this.queryDocumentsResultRows[index];
                navigator.clipboard.writeText(row.metadata.text);
            });
        });
    }
    /** */
    async deleteIndex() {
        const data = this.scrapeData();
        await this._deleteIndex(data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
        this._fetchIndexStats(data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
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
    async fetchIndexStats() {
        const data = this.scrapeData();
        await this._fetchIndexStats(data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
    }
    /** fetch index stats
     * @param { string } batchId grouping key
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
    */
    async _fetchIndexStats(batchId: string, pineconeKey: string, pineconeEnvironment: string) {
        const body = {
            batchId,
            pineconeEnvironment,
            pineconeKey,
        };
        this.pinecone_index_stats_display.innerHTML = "fetching...";
        this.pinecone_index_count.innerHTML = "";
        this.pinecone_index_name.innerHTML = "fetching...";
        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/indexstats", {
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

        if (json.success === false) {
            console.log("pinecone error", json);
            this.pinecone_index_name.innerHTML = json.errorMessage;
            this.pinecone_index_count.innerHTML = "N/A";
            return;
        }

        this.pinecone_index_stats_display.innerHTML = JSON.stringify(json, null, "\t");
        this.pinecone_index_count.innerHTML = json.indexDescription.totalRecordCount;
        this.pinecone_index_name.innerHTML = batchId;
    }
    /** */
    async uploadUpsertListFile() {
        const importData = await ChatDocument.getImportDataFromDomFile(this.embedding_list_file_dom);

        this.fileListToUpload = [];
        const uploadDate = new Date().toISOString();
        importData.forEach((item: any, index: number) => {
            item.row = (index + 1).toString();
            item.uploadedDate = uploadDate;
            const columnsToVerify = ["prefix", "text", "url", "id", "options", "title"];
            columnsToVerify.forEach((key: string) => {
                if (!item[key]) item[key] = "";
            });
            this.fileListToUpload.push(item);
        });

        let fileName = "";
        if (this.embedding_list_file_dom.files[0]) fileName = this.embedding_list_file_dom.files[0].name;
        this.document_list_file_name.innerHTML = fileName;
        await this.saveUpsertRows();
    }
    /** */
    async applyUpsertResultsToStore() {
        const dt = new Date().toISOString();
        this.upsertFileResults.forEach((row: any, index: number) => {
            this.fileListToUpload[index]["pineconeTitle"] = row["title"];
            this.fileListToUpload[index]["pineconeId"] = row["id"];
            this.fileListToUpload[index]["size"] = row["textSize"];
            this.fileListToUpload[index]["upsertedDate"] = dt;
            firebase.firestore().doc(`Users/${this.uid}/embedding/doclist/responses/${index}`).set(row, {
                merge: true,
            });
        });
        console.log(this.fileListToUpload);
        this.saveUpsertRows();
    }
    /** */
    async deletePineconeVector() {
        const id = this.pinecone_id_to_delete.value.trim();
        if (id === "") {
            alert("Please supply a vector id");
            return;
        }

        const data = this.scrapeData();
        const batchId = data.pineconeIndex;
        const pineconeEnvironment = data.pineconeEnvironment;
        const pineconeKey = data.pineconeKey;
        const body = {
            batchId,
            pineconeEnvironment,
            pineconeKey,
            vectorId: id,
        };
        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/deletevector", {
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

        if (json.success === false) {
            console.log("delete error", json);
            alert("error deleting vector refer to console for more");
            return;
        }

        alert(`Vector ${id} deleted (if existed)\n\nPlease wait up to 15 seconds to refresh count`);
        this.fetchIndexStats();
    }
    /** */
    async saveUpsertRows() {
        await firebase.firestore().doc(`Users/${this.uid}/embedding/doclist`).set({
            upsertList: this.fileListToUpload,
        }, {
            merge: true,
        });
    }
    /** */
    async watchUpsertRows() {
        if (this.fileUpsertListFirestore) return;

        this.fileUpsertListFirestore = firebase.firestore().doc(`Users/${this.uid}/embedding/doclist`)
            .onSnapshot((snapshot: any) => {
                let data = snapshot.data()
                if (!data) data = {};
                this.fileListToUpload = data.upsertList;
                if (!this.fileListToUpload) this.fileListToUpload = [];

                this.csvUploadDocumentsTabulator.setData(this.fileListToUpload);
            });
    }
}
