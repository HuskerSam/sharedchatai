import BaseApp from "./baseapp.js";
import ChatDocument from "./chatdocument.js";
import SharedWithBackend from "./sharedwithbackend.js";
import AccountHelper from "./accounthelper.js";
declare const firebase: any;
declare const window: any;

/** Embedding upload app class */
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
    chunk_size_default: any = document.querySelector(".chunk_size_default");
    prompt_area: any = document.querySelector(".prompt_area");
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
    pinecone_index_name: any = document.querySelector(".pinecone_index_name");
    delete_pinecone_vector_id: any = document.querySelector(".delete_pinecone_vector_id");
    pinecone_id_to_delete: any = document.querySelector(".pinecone_id_to_delete");
    upsert_embedding_tab_btn: any = document.querySelector("#upsert_embedding_tab_btn");
    delete_selected_row_btn: any = document.querySelector(".delete_selected_row_btn");
    add_row_btn: any = document.querySelector(".add_row_btn");
    selected_rows_display_span: any = document.querySelector(".selected_rows_display_span");
    validate_selected_rows_btn: any = document.querySelector(".validate_selected_rows_btn");
    chunking_results_wrapper: any = document.querySelector(".chunking_results_wrapper");
    parse_url_parse_button: any = document.querySelector(".parse_url_parse_button");
    parse_url_path_input: any = document.querySelector(".parse_url_path_input");
    parse_url_text_results: any = document.querySelector(".parse_url_text_results");
    parse_url_path_options: any = document.querySelector(".parse_url_path_options");
    parse_embedding_tab_btn: any = document.querySelector("#parse_embedding_tab_btn");
    parsed_text_results_h4: any = document.querySelector(".parsed_text_results_h4");
    parse_chunks_parse_button: any = document.querySelector(".parse_chunks_parse_button");
    parse_url_chunk_tokens: any = document.querySelector(".parse_url_chunk_tokens");
    fetch_pinecone_vector_id: any = document.querySelector(".fetch_pinecone_vector_id");
    fetch_vector_results: any = document.querySelector(".fetch_vector_results");
    credits_left: any = document.querySelector(".credits_left");
    upsert_documents_list: any = document.querySelector(".upsert_documents_list");
    add_project_btn: any = document.querySelector(".add_project_btn");
    remove_project_btn: any = document.querySelector(".remove_project_btn");
    fileUpsertListFirestore: any = null;
    embeddingProjects: any = {};
    selectedProjectId = "";
    watchProjectListFirestore: any = null;
    queryDocumentsResultRows: any = [];
    fileListToUpload: Array<any> = [];
    parsedTextChunks: Array<string> = [];
    pineconeQueryResults: any = {};
    csvUploadDocumentsTabulator: any = null;
    embeddingRunning = false;
    usageWatchInited = false;
    vectorQueryRunning = false;
    indexDeleteRunning = false;
    primedPrompt = "";
    tableThemeLinkDom: any = null;
    saveChangesTimer: any = null;
    editableTableFields = ["include", "row", "url", "id", "title", "options", "text", "prefix"];
    resultChunks: Array<any> = [];
    selectedRowCount = 0;
    tableColumns = [
        {
            title: ``,
            field: "include",
            headerHozAlign: "center",
            headerSort: false,
            formatter: (cell: any) => {
                if (cell.getValue()) return `<button class="btn btn-secondary"><span class="check_emoji">❎</span></button>`;
                return `<button class="btn btn-secondary"><span class="check_emoji">⬜</span></button>`;
            },
            cellClick: (ev: any, cell: any) => {
                cell.setValue(!cell.getValue());
                this.updateTableSelectAllIcon();
            },
            headerClick: () => {
                if (this.isAllTableRowsSelected()) {
                    this.fileListToUpload.forEach((row: any) => row.include = false);
                } else {
                    this.fileListToUpload.forEach((row: any) => row.include = true);
                }
                this.saveUpsertRows(true);
            },
            hozAlign: "center",
        }, {
            title: "row",
            field: "row",
            editor: "input",
            hozAlign: "center",
            width: 100,
        },
        {
            title: "url",
            field: "url",
            editor: "textarea",
            width: 250,
        }, {
            title: "id",
            field: "id",
            editor: "input",
            width: 100,
        }, {
            title: "title",
            field: "title",
            editor: "input",
            width: 100,
        }, {
            title: "options",
            field: "options",
            editor: "textarea",
            width: 100,
        }, {
            title: "text",
            field: "text",
            editor: "textarea",
            width: 100,
        }, {
            title: "prefix",
            field: "prefix",
            editor: "textarea",
            width: 100,
        }, {
            title: "Parser",
            field: "parser",
            headerSort: false,
            formatter: () => {
                return `<button class="btn btn-secondary"><i class="material-icons">start</i></button>`;
            },
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
                const d: string = this.showGmailStyleDate(new Date(cell.getValue()));
                if (d === "Invalid Date") return "";
                return d;
            },
        }, {
            title: "vId",
            field: "pineconeId",
            width: 100,
        }, {
            title: "vCount",
            field: "vectorCount",
            width: 90,
            hozAlign: "center",
        }, {
            title: "vTitle",
            field: "pineconeTitle",
            width: 100,
        }, {
            title: "Size",
            field: "size",
        }, {
            title: "Text",
            field: "copyText",
            headerSort: false,
            formatter: () => {
                return `<button class="btn btn-secondary"><i class="material-icons">content_copy</i></button>`;
            },
            hozAlign: "center",
        }, {
            title: "JSON",
            field: "copyJSON",
            headerSort: false,
            formatter: () => {
                return `<button class="btn btn-secondary"><i class="material-icons">content_copy</i></button>`;
            },
            hozAlign: "center",
        }, {
            title: "Error",
            field: "errorMessage",
        },
    ];

    /** */
    constructor() {
        super();
        this.showLoginModal = true;
        this.profileHelper.noAuthPage = false;

        this.csvUploadDocumentsTabulator = new window.Tabulator(".preview_embedding_documents_table", {
            data: [],
            height: "100%",
            columns: this.tableColumns,
        });
        this.csvUploadDocumentsTabulator.on("cellClick", async (e: any, cell: any) => {
            const field = cell.getField();
            const data = cell.getRow().getData();
            const rowIndex = Number(data.row);
            if (field === "copyJSON") {
                const responseQuery = await firebase.firestore()
                    .doc(`Users/${this.uid}/embedding/${this.selectedProjectId}/responses/${data["responseId"]}`).get();
                const responseData = responseQuery.data();
                const outData: any = Object.assign({}, data);
                outData.upsertResponse = responseData;
                const json = JSON.stringify(outData, null, "\t");
                navigator.clipboard.writeText(json);
                cell.getElement().firstChild.innerHTML = `<i class="material-icons">check</i>`;
                setTimeout(() => cell.getElement().firstChild.innerHTML = `<i class="material-icons">content_copy</i>`, 800);
            }
            if (field === "copyText") {
                console.log(rowIndex);
                const responseQuery = await firebase.firestore()
                    .doc(`Users/${this.uid}/embedding/${this.selectedProjectId}/responses/${data["responseId"]}`).get();
                const responseData = responseQuery.data();
                if (!responseData) {
                    alert("No text response to copy");
                    return;
                }
                navigator.clipboard.writeText(responseData.text);
                cell.getElement().firstChild.innerHTML = `<i class="material-icons">check</i>`;
                setTimeout(() => cell.getElement().firstChild.innerHTML = `<i class="material-icons">content_copy</i>`, 800);
            }
            if (field === "parser") {
                this.parse_url_path_input.value = data.url;
                this.parse_url_path_options.value = data.options;
                this.parse_embedding_tab_btn.click();
                this.parse_url_parse_button.click();
            }
        });
        this.csvUploadDocumentsTabulator.on("cellEdited", async (cell: any) => {
            const field = cell.getField();
            if (this.editableTableFields.indexOf(field) !== -1) {
                const data = cell.getRow().getData();
                const rowIndex = Number(data.row);
                if (field === "row") {
                    let newRowIndex = Number(data[field]);
                    if (isNaN(newRowIndex) || newRowIndex < 1) newRowIndex = 1;
                    if (newRowIndex > this.fileListToUpload.length) {
                        newRowIndex = this.fileListToUpload.length;
                    }
                    const oldIndex = cell.getRow().getPosition();
                    const element = this.fileListToUpload[oldIndex - 1];
                    this.fileListToUpload.splice(oldIndex - 1, 1);
                    this.fileListToUpload.splice(newRowIndex - 1, 0, element);
                } else {
                    this.fileListToUpload[rowIndex][field] = data[field];
                }
                this.saveUpsertRows();
            }
        });
        this.upload_embedding_documents_btn.addEventListener("click", () => this.upsertTableRowsToPinecone());
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

        this.upload_document_list_button.addEventListener("click", () => {
            this.embedding_list_file_dom.value = "";
            this.embedding_list_file_dom.click();
        });
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

        this.delete_selected_row_btn.addEventListener("click", () => this.deleteSelectedRows());
        this.add_row_btn.addEventListener("click", () => this.addEmptyTableRow());
        this.updateQueriedDocumentList();

        this.validate_selected_rows_btn.addEventListener("click", () => this.validateSelectedRows());
        this.parse_url_parse_button.addEventListener("click", () => this.scrapeSingleURL());
        this.parse_chunks_parse_button.addEventListener("click", () => this.parseText());
        this.updateResultChunksTable();
        this.setTableTheme();

        this.fetch_pinecone_vector_id.addEventListener("click", () => this.fetchPineconeVector());

        this.upsert_documents_list.addEventListener("change", () => this.updateWatchUpsertRows());
        this.add_project_btn.addEventListener("click", () => this.addProject());
        this.remove_project_btn.addEventListener("click", () => this.deleteProject());
    }
    /** */
    async fetchPineconeVector() {
        this.fetch_vector_results.innerHTML = "fetching...";
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
        const fResult = await fetch(this.basePath + "embeddingApi/fetchvector", {
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
        this.fetch_vector_results.innerHTML = JSON.stringify(json, (k: any, v: any) => {
            if (v instanceof Array && k === "values") return JSON.stringify(v, null, 1).replace(/\n/g, " ");
            return v;
        }, 2);
    }
    /** */
    setTableTheme() {
        if (this.tableThemeLinkDom) this.tableThemeLinkDom.remove();
        this.tableThemeLinkDom = document.createElement("link");
        const theme = this.themeIndex === 0 ? "tabulator_site" : "tabulator_midnight";
        this.tableThemeLinkDom.setAttribute("href", `/css/${theme}.css`);
        this.tableThemeLinkDom.setAttribute("rel", "stylesheet");
        document.body.appendChild(this.tableThemeLinkDom);
    }
    /** */
    async scrapeSingleURL() {
        const url = this.parse_url_path_input.value;
        const options = this.parse_url_path_options.value;
        this.parse_url_parse_button.innerHTML = "Parsing...";
        this.parse_url_text_results.value = "";
        this.parsed_text_results_h4.innerHTML = "Processing...";
        if (!url) {
            alert("URL required");
            return;
        }

        const body = {
            url,
            options,
        };

        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/scrapeurl", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });
        this.parse_url_parse_button.innerHTML = "Parse";
        const result = await fResult.json();
        if (!result.success) {
            this.parsed_text_results_h4.innerHTML = JSON.stringify(result, null, "\t");
        } else {
            const text = result.text;
            this.parse_url_text_results.value = text;
            let statusResult = `Parsed Text Results (${text.length} chars, `;
            if (result.duration) {
                const credits = result.encodingCredits;
                statusResult += `${Math.ceil(result.duration)} seconds, ${credits} credits)`;
            } else {
                const tokens = this.tokenEncode(text);
                statusResult += `${tokens.length} tokens)`;
            }
            this.parsed_text_results_h4.innerHTML = statusResult;
        }
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
        if (!this.fileListToUpload || this.fileListToUpload.length === 0) {
            alert("no results to download");
            return;
        }
        let type = "application/csv";
        let resultText = "";
        let fileName = "";
        if (csv) {
            fileName = "upsertResults.csv";
            resultText = window.Papa.unparse(this.fileListToUpload);
        } else {
            type = "application/json";
            fileName = "upsertResults.json";
            resultText = JSON.stringify(this.fileListToUpload, null, "  ");
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
        const pineconeChunkSize = this.chunk_size_default.value;

        this.savePineconeOptions({
            pineconeIndex,
            pineconeKey,
            pineconeEnvironment,
            pineconePrompt,
            pineconeChunkSize,
        });
        return {
            urls: "",
            pineconeIndex,
            pineconeKey,
            pineconeEnvironment,
            pineconePrompt,
            pineconeChunkSize,
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
        let pineconeChunkSize = "1000";
        // 0c0df79a-cc2c-4efd-9835-fdaeb66df843
        if (this.selectedProjectId) {
            const projectSettings = this.embeddingProjects[this.selectedProjectId];
            if (projectSettings.pineconeIndex !== undefined) pineconeIndex = projectSettings.pineconeIndex;
            if (projectSettings.pineconeKey !== undefined) pineconeKey = projectSettings.pineconeKey;
            if (projectSettings.pineconeEnvironment !== undefined) pineconeEnvironment = projectSettings.pineconeEnvironment;
            if (projectSettings.pineconePrompt !== undefined) pineconePrompt = projectSettings.pineconePrompt;
            if (projectSettings.pineconeChunkSize !== undefined) pineconeChunkSize = projectSettings.pineconeChunkSize;
        }

        return {
            pineconeIndex,
            pineconeKey,
            pineconeEnvironment,
            pineconePrompt,
            pineconeChunkSize,
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
                this.saveEmbeddingField("pineconeIndex", options.pineconeIndex),
                this.saveEmbeddingField("pineconeKey", options.pineconeKey),
                this.saveEmbeddingField("pineconeEnvironment", options.pineconeEnvironment),
            ]);
        }
        if (options.pineconePrompt !== profileOptions.pineconePrompt) {
            await this.saveEmbeddingField("pineconePrompt", options.pineconePrompt);
        }

        if (options.pineconeChunkSize !== profileOptions.pineconeChunkSize) {
            await this.saveEmbeddingField("pineconeChunkSize", options.pineconeChunkSize);
        }
    }
    /** */
    async saveEmbeddingField(field: string, value: any) {
        if (!this.selectedProjectId) return;
        await firebase.firestore().doc(`Users/${this.uid}/embedding/${this.selectedProjectId}`).set({
            [field]: value,
            updated: new Date().toISOString(),
        }, {
            merge: true,
        });
    }
    /** override event that happens after authentication resolution / or a user profile change */
    authUpdateStatusUI(): void {
        super.authUpdateStatusUI();
        if (this.profile) {
            this.watchProjectList();
            this.initUsageWatch();
        }
    }
    /** override to add set table theme
     * @param { boolean } niteMode true if nite mode
    */
    toggleDayMode(niteMode = false) {
        super.toggleDayMode(niteMode);
        this.setTableTheme();
    }
    /** */
    async upsertTableRowsToPinecone() {
        const data = this.scrapeData();
        const selectedRows: Array<any> = [];
        this.fileListToUpload.forEach((row: any) => {
            if (row.include) selectedRows.push(row);
        });
        if (selectedRows.length === 0) {
            alert("no rows selected to upsert");
            return;
        }
        await this._upsertTableRowsToPinecone(selectedRows, data.pineconeIndex, data.pineconeKey,
            data.pineconeEnvironment, data.pineconeChunkSize);
        this._fetchIndexStats(data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
    }
    /** scrape URLs for embedding
     * @param { Array<any> } fileList
     * @param { string } batchId grouping key
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
     * @param { number } tokenThreshold
    */
    async _upsertTableRowsToPinecone(fileList: Array<any>, batchId: string, pineconeKey: string,
        pineconeEnvironment: string, tokenThreshold: number) {
        if (!firebase.auth().currentUser) {
            alert("login on homepage to use this");
            return;
        }
        if (this.embeddingRunning) {
            alert("already running");
            return;
        }
        this.upsert_result_status_bar.innerHTML = "processing document list...";
        this.embeddingRunning = true;
        const body = {
            fileList,
            batchId,
            pineconeKey,
            pineconeEnvironment,
            tokenThreshold,
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
        const upsertFileResults = json.fileUploadResults;
        this.applyUpsertResultsToStore(fileList, upsertFileResults);

        this.embeddingRunning = false;
        const count = upsertFileResults.length;
        let errors = 0;
        let credits = 0;
        let vectorCount = 0;
        upsertFileResults.forEach((result: any) => {
            if (result.errorMessage) errors++;
            else {
                vectorCount += result.idList.length;
                credits += result.encodingCredits;
            }
        });
        this.upsert_result_status_bar.innerHTML = `${count} documents, ${vectorCount} vectors, ${errors} errors, 
            ${credits.toFixed(3)} credits`;
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
            return;
        }

        this.pinecone_index_stats_display.innerHTML = JSON.stringify(json, null, "\t");
        this.pinecone_index_name.innerHTML = batchId + "<br>" + json.indexDescription.totalRecordCount;
    }
    /** */
    async uploadUpsertListFile() {
        const importData = await ChatDocument.getImportDataFromDomFile(this.embedding_list_file_dom);

        const uploadDate = new Date().toISOString();
        importData.forEach((item: any) => {
            item.uploadedDate = uploadDate;
            const columnsToVerify = ["prefix", "text", "url", "id", "options", "title"];
            columnsToVerify.forEach((key: string) => {
                if (!item[key]) item[key] = "";
            });
            item.include = !(item.include === "false"); // catch the exported case otherwise include by default
            this.fileListToUpload.push(item);
        });

        let fileName = "";
        if (this.embedding_list_file_dom.files[0]) fileName = this.embedding_list_file_dom.files[0].name;
        this.document_list_file_name.innerHTML = fileName;
        this.saveUpsertRows(true);
    }
    /**
     * @param { Array<any> } upsertArray
     * @param { Array<any> } upsertResults
    */
    async applyUpsertResultsToStore(upsertArray: Array<any>, upsertResults: Array<any>) {
        const dt = new Date().toISOString();
        const promises: any = [];
        const saveResponse = async (index: number, row: any) => {
            const doc = await firebase.firestore().collection(`Users/${this.uid}/embedding/${this.selectedProjectId}/responses/`).doc();
            await doc.set(row);
            upsertArray[index]["responseId"] = doc.id;
        };

        upsertResults.forEach((row: any, index: number) => {
            if (row["errorMessage"]) {
                upsertArray[index]["errorMessage"] = row["errorMessage"];
                upsertArray[index]["pineconeTitle"] = "";
                upsertArray[index]["pineconeId"] = "";
                upsertArray[index]["size"] = 0;
                upsertArray[index]["upsertedDate"] = dt;
                upsertArray[index]["include"] = false;
                upsertArray[index]["vectorCount"] = 0;
            } else {
                upsertArray[index]["errorMessage"] = "";
                upsertArray[index]["pineconeTitle"] = row["title"];
                upsertArray[index]["pineconeId"] = row["id"];
                upsertArray[index]["size"] = row["textSize"];
                upsertArray[index]["upsertedDate"] = dt;
                upsertArray[index]["include"] = false;
                upsertArray[index]["vectorCount"] = row["idList"].length;
            }
            promises.push(saveResponse(index, row));
        });
        await Promise.all(promises);
        this.saveUpsertRows(true);
    }
    /** */
    async deletePineconeVector() {
        this.fetch_vector_results.innerHTML = "";

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
    /**
     * @param { boolean } saveNow
     */
    async saveUpsertRows(saveNow = false) {
        // this.upsert_embedding_tab_btn.innerHTML = "Saving...";

        if (saveNow) {
            const upsertList: Array<any> = [];
            this.fileListToUpload.forEach((row: any) => {
                const clone = Object.assign({}, row);
                delete clone.copyJSON;
                delete clone.copyText;
                delete clone.parser;
                delete clone.row;
                if (!clone.pineconeId) clone.pineconeId = "";
                if (!clone.pineconeTitle) clone.pineconeTitle = "";
                if (!clone.size) clone.size = "";
                if (!clone.upsertedDate) clone.upsertedDate = "";
                if (!clone.vectorCount) clone.vectorCount = "";
                if (!clone.validation) clone.validation = "";
                if (!clone.parser) clone.parser = "";
                if (!clone.errorMessage) clone.errorMessage = "";
                clone.include = clone.include === true;
                upsertList.push(clone);
            });
            console.log(upsertList);
            await firebase.firestore().doc(`Users/${this.uid}/embedding/${this.selectedProjectId}/data/rows`).set({
                upsertList,
            }, {
                merge: true,
            });
            // this.upsert_embedding_tab_btn.innerHTML = "Upsert";
            return;
        }

        window.clearTimeout(this.saveChangesTimer);
        this.saveChangesTimer = setTimeout(() => {
            this.saveChangesTimer = null;
            this.saveUpsertRows(true);
        }, 1000);
    }
    /** */
    initUsageWatch() {
        if (this.usageWatchInited) return;
        this.usageWatchInited = true;

        AccountHelper.accountInfoUpdate(this, (usageData: any) => {
            const availableBalance = usageData.availableCreditBalance;
            this.credits_left.innerHTML = Math.floor(availableBalance) + "<br><span>Credits</span>";
        });
    }
    /** */
    async addProject(projectId: any = "") {
        if (!projectId) {
            projectId = prompt("Project Name:", new Date().toISOString().substring(0, 10));
            if (projectId === null) return;
        }
        
        this.upsert_documents_list.innerHTML = ``;
        this.profile.selectedEmbeddingProjectId = projectId;
        this.saveProfileField("selectedEmbeddingProjectId", projectId);
        await firebase.firestore().doc(`Users/${this.uid}/embedding/${projectId}`).set({
            projectId,
            updated: new Date().toISOString(),
        }, {
            merge: true,
        });
    }
    /** */
    async deleteProject() {
        if (!this.selectedProjectId) return;
        if (!confirm("Are you sure you want to delete this project?")) return;
        await firebase.firestore().doc(`Users/${this.uid}/embedding/${this.selectedProjectId}/data/rows`).delete();
        await firebase.firestore().doc(`Users/${this.uid}/embedding/${this.selectedProjectId}`).delete();
    }
    /** */
    async watchProjectList() {
        if (this.watchProjectListFirestore) return;
        this.watchProjectListFirestore = firebase.firestore().collection(`Users/${this.uid}/embedding`)
            .onSnapshot((snapshot: any) => {
                let optionsHtml = "";
                const selectedValue = this.upsert_documents_list.selectedValue;
                if (snapshot.size === 0) {
                    optionsHtml += "<option>Default</option>";
                    this.addProject("Default");
                    this.selectedProjectId = "";
                } else {
                    this.embeddingProjects = {};
                    snapshot.forEach((doc: any) => {
                        optionsHtml += `<option value="${doc.id}">${doc.id}</option>`;
                        this.embeddingProjects[doc.id] = doc.data();
                    });
                }
                this.upsert_documents_list.innerHTML = optionsHtml;
                if (!selectedValue) {
                    this.upsert_documents_list.value = this.profile.selectedEmbeddingProjectId;
                } else {
                    this.upsert_documents_list.value = selectedValue;
                }
                if (this.upsert_documents_list.selectedIndex === -1) {
                    this.upsert_documents_list.selectedIndex = 0;
                    this.selectedProjectId = "";
                }

                this.updateWatchUpsertRows();
            });
    }
    /** */
    async updateWatchUpsertRows() {
        const projectId = this.upsert_documents_list.value;
        if (this.selectedProjectId === projectId) return;
        this.selectedProjectId = projectId;
        if (this.fileUpsertListFirestore) this.fileUpsertListFirestore();
        this.fileUpsertListFirestore = null;
        if (!this.selectedProjectId) return;

        const options = this.getPineconeOptions();
        this.batch_id.value = options.pineconeIndex;
        this.pinecone_key.value = options.pineconeKey;
        this.pinecone_environment.value = options.pineconeEnvironment;
        this.prompt_area.value = options.pineconePrompt;
        this.chunk_size_default.value = options.pineconeChunkSize;
        this.fetchIndexStats();
        this.fileListToUpload = [];
        this.csvUploadDocumentsTabulator.setData(this.fileListToUpload);

        this.saveProfileField("selectedEmbeddingProjectId", this.selectedProjectId);
        this.fileUpsertListFirestore = firebase.firestore()
            .doc(`Users/${this.uid}/embedding/${this.selectedProjectId}/data/rows`)
            .onSnapshot((snapshot: any) => {
                let data = snapshot.data();
                if (!data) data = {};
                this.fileListToUpload = data.upsertList;
                if (!this.fileListToUpload) this.fileListToUpload = [];
                this.fileListToUpload.forEach((item: any, index: number) => {
                    item.row = (index).toString();
                });
                this.csvUploadDocumentsTabulator.setData(this.fileListToUpload);
                this.updateTableSelectAllIcon();
                this.selected_rows_display_span.innerHTML = this.selectedRowCount + " / " + this.fileListToUpload.length;
            });
    }
    /**
     * @return { boolean }
     */
    isAllTableRowsSelected(): boolean {
        this.selectedRowCount = 0;
        for (let c = 0, l = this.fileListToUpload.length; c < l; c++) {
            if (this.fileListToUpload[c].include === true) this.selectedRowCount++;
        }
        return (this.selectedRowCount === this.fileListToUpload.length);
    }
    /** */
    updateTableSelectAllIcon() {
        let selectAllIcon = `<span class="check_emoji">❎</span>`;
        if (this.isAllTableRowsSelected()) selectAllIcon = `<span class="check_emoji">⬜</span>`;
        this.csvUploadDocumentsTabulator.columnManager.columns[0].titleElement.innerHTML = selectAllIcon;
    }
    /** */
    deleteSelectedRows() {
        if (!confirm("Delete selected rows?")) return;
        for (let c = 0; c < this.fileListToUpload.length; c++) {
            if (this.fileListToUpload[c].include) {
                this.fileListToUpload.splice(c, 1);
                c--;
            }
        }
        this.saveUpsertRows(true);
    }
    /** */
    addEmptyTableRow() {
        this.fileListToUpload.unshift({
            include: true,
            prefix: "",
            text: "",
            url: "",
            options: "",
            title: "",
            id: "",
            uploadedDate: new Date().toISOString(),
        });
        this.saveUpsertRows(true);
    }
    /** detect duplicate ids, rows without id,text or a url */
    validateSelectedRows() {
        let validationResults = "";
        const selectedIndexes = this.getSelectedTableIndexes();

        if (selectedIndexes.length === 0) {
            validationResults = "No rows selected to validate";
        } else {
            const idStore: Array<string> = [];
            this.fileListToUpload.forEach((row: any) => idStore.push(this.resolveTableRowUpsertId(row)));

            const invalidRows: Array<number> = [];
            selectedIndexes.forEach((selectedIndex: number) => {
                const selectedId = idStore[selectedIndex];
                let validationMessage = "";
                if (selectedId === "") {
                    validationMessage = "No url or id supplied";
                    invalidRows.push(selectedIndex);
                } else {
                    const duplicates: Array<number> = [];
                    idStore.forEach((id: string, index: number) => {
                        if (id === selectedId && index !== selectedIndex) duplicates.push(index);
                    });
                    if (duplicates.length > 0) {
                        let dupRows = "";
                        duplicates.forEach((dupIndex: number) => dupRows += (dupIndex + 1).toString() + ",");
                        validationMessage = "Duplicate rows " + dupRows;
                        invalidRows.push(selectedIndex);
                        console.log(selectedIndex, selectedId);
                    }
                }
                this.fileListToUpload[selectedIndex].validation = validationMessage;
            });

            if (invalidRows.length === 0) {
                validationResults = "Selected rows have unique ids or urls";
            } else {
                let invalidRowsStr = "";
                invalidRows.forEach((dupIndex: number) => invalidRowsStr += (dupIndex + 1).toString() + ",");
                validationResults = "Invalid rows: " + invalidRowsStr;
            }
        }
        this.saveUpsertRows(true);
        this.upsert_result_status_bar.innerHTML = validationResults;
    }
    /**
     * @param { any } row
     * @return { string }
    */
    resolveTableRowUpsertId(row: any): string {
        let id = "";
        if (row.id) id = row.id;
        if (!id && row.url) id = encodeURIComponent(row.url.trim());
        return id;
    }
    /**
     * @return { Array<number> }
     */
    getSelectedTableIndexes(): Array<number> {
        const selected: Array<number> = [];
        for (let c = 0, l = this.fileListToUpload.length; c < l; c++) {
            if (this.fileListToUpload[c].include) selected.push(c);
        }
        return selected;
    }
    /** */
    updateResultChunksTable() {
        let fileContent = "<table class=\"chunked_text_results_table\">";
        const keys = ["text", "tokens", "textSize"];
        fileContent += "<tr>";
        fileContent += `<th>row</th>`;
        keys.forEach((key: string) => fileContent += `<th>${key}</th>`);
        fileContent += "</tr>";

        this.resultChunks.forEach((row: any, index: number) => {
            fileContent += "<tr>";
            fileContent += `<th>${index + 1}</th>`;
            keys.forEach((key: string) => {
                let value = row[key];
                value = BaseApp.escapeHTML(value);

                fileContent += `<td class="table_cell_sizer"><div>${value}</div></td>`;
            });
            fileContent += "</tr>";
        });

        fileContent += `</table>`;

        this.chunking_results_wrapper.innerHTML = fileContent;
    }
    /** */
    async parseText() {
        const threshold = Number(this.parse_url_chunk_tokens.value);
        const fullText = this.parse_url_text_results.value;

        this.resultChunks = await SharedWithBackend.parseBreakTextIntoChunks(threshold, fullText);
        this.updateResultChunksTable();
    }
}
