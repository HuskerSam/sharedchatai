import BaseApp from "./baseapp";
import ChatDocument from "./chatdocument";
import SharedWithBackend from "./sharedwithbackend";
import AccountHelper from "./accounthelper";
/*
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import {
    collection,
    getCountFromServer,
} from "firebase/firestore";
*/
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
    add_row_btn: any = document.querySelector(".add_row_btn");
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
    table_filter_radios = document.querySelectorAll(`input[name="table_filter_radio"]`);
    firebase_record_count_status: any = document.querySelector(".firebase_record_count_status");
    fileUpsertListFirestore: any = null;
    embeddingProjects: any = {};
    selectedProjectId = "";
    selectedFilter = "";
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
            title: "",
            field: "rowNumber",
            hozAlign: "center",
            headerSort: false,
        }, {
            title: "id",
            field: "id",
            editor: "input",
            headerSort: false,
            width: 100,
        }, {
            title: "",
            field: "deleteRow",
            headerSort: false,
            formatter: () => {
                return `<i class="material-icons">delete</i>`;
            },
            hozAlign: "center",
        }, {
            title: "url",
            field: "url",
            editor: "textarea",
            width: 250,
            headerSort: false,
        }, {
            title: "",
            field: "parser",
            hozAlign: "center",
            headerSort: false,
            formatter: () => {
                return `<i class="material-icons">start</i>`;
            },
        }, {
            title: "title",
            field: "title",
            editor: "input",
            width: 100,
            headerSort: false,
        }, {
            title: "meta",
            field: "additionalMetaData",
            editor: "textarea",
            width: 150,
            headerSort: false,
        }, {
            title: "options",
            field: "options",
            editor: "textarea",
            width: 100,
            headerSort: false,
        }, {
            title: "prefix",
            field: "prefix",
            editor: "textarea",
            width: 100,
            headerSort: false,
        }, {
            title: "Activity",
            field: "activity",
            hozAlign: "center",
            headerSort: false,
        }, {
            title: "Status",
            width: 100,
            field: "status",
            headerSort: false,
        }, {
            title: "",
            field: "copyJSON",
            headerSort: false,
            formatter: () => {
                return `<i class="material-icons">dataset_linked</i>`;
            },
            hozAlign: "center",
        }, {
            title: "",
            field: "copyText",
            headerSort: false,
            formatter: () => {
                return `<i class="material-icons">content_copy</i>`;
            },
            hozAlign: "center",
        }, {
            title: "text",
            width: 200,
            field: "text",
            editor: "textarea",
            headerSort: false,
        },
    ];

    /** */
    constructor() {
        super();
        this.showLoginModal = true;
        this.profileHelper.noAuthPage = false;

        //init table
        this.csvUploadDocumentsTabulator = new window.Tabulator(".preview_embedding_documents_table", {
            data: [],
            height: "100%",
            layout: "fitDataStretch",
            columns: this.tableColumns,
        });
        this.csvUploadDocumentsTabulator.on("cellClick", async (e: any, cell: any) => {
            const field = cell.getField();
            const data = cell.getRow().getData();
            const rowIndex = Number(data.row);
            if (field === "copyJSON") {
                const responseQuery = await firebase.firestore()
                    ?.doc(`Users/${this.uid}/embedding/${this.selectedProjectId}/responses/${data["responseId"]}`).get();
                const responseData = responseQuery.data();
                const outData: any = Object.assign({}, data);
                outData.upsertResponse = responseData;
                const json = JSON.stringify(outData, null, "\t");
                navigator.clipboard.writeText(json);
                cell.getElement().innerHTML = `<i class="material-icons">check</i>`;
                setTimeout(() => cell.getElement().innerHTML = `<i class="material-icons">content_copy</i>`, 800);
            }
            if (field === "copyText") {
                console.log(rowIndex);
                const responseQuery = await firebase.firestore()
                    ?.doc(`Users/${this.uid}/embedding/${this.selectedProjectId}/responses/${data["responseId"]}`).get();
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
            if (field === "deleteRow") {
                this.deleteTableRow(data.id);
            }
        });
        this.csvUploadDocumentsTabulator.on("cellEdited", async (cell: any) => {
            const field = cell.getField();
            if (this.editableTableFields.indexOf(field) !== -1) {
                const data = cell.getRow().getData();
                this.saveTableRowToFirestore({
                    [field]: data[field],
                }, data.id);
            }
        });
        this.upload_embedding_documents_btn.addEventListener("click", (e: any) => this.upsertTableRowsToPinecone(e));
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

        this.upload_document_list_button.addEventListener("click", (event: any) => {
            this.embedding_list_file_dom.value = "";
            this.embedding_list_file_dom.click();
            event.preventDefault();
        });
        this.embedding_list_file_dom.addEventListener("change", (e: any) => this.uploadUpsertListFile(e));

        this.download_csv_results_btn.addEventListener("click", (e: any) => this.downloadResultsFile(e, true));
        this.download_json_results_btn.addEventListener("click", (e: any) => this.downloadResultsFile(e));
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

        this.add_row_btn.addEventListener("click", (e: any) => this.addEmptyTableRow(e));
        this.updateQueriedDocumentList();

        this.parse_url_parse_button.addEventListener("click", () => this.scrapeSingleURL());
        this.parse_chunks_parse_button.addEventListener("click", () => this.parseText());
        this.updateResultChunksTable();
        this.setTableTheme();

        this.fetch_pinecone_vector_id.addEventListener("click", () => this.fetchPineconeVector());

        this.upsert_documents_list.addEventListener("change", () => this.updateWatchUpsertRows());
        this.add_project_btn.addEventListener("click", () => this.addProject());
        this.remove_project_btn.addEventListener("click", () => this.deleteProject());

        this.table_filter_radios.forEach((btn: any) => btn.addEventListener("input", () => {
            this.updateWatchUpsertRows();
        }));
    }
    /**
     * @param { any } event
     */
    addEmptyTableRow(event: any) {
        if (event) event.preventDefault();
        let rowId = prompt("Project Name:", new Date().toISOString().substring(0, 10));
        if (rowId === null) return;
        rowId = rowId.trim();
        if (!rowId) return;

        const data: any = {
            id: rowId,
            include: true,
            prefix: "",
            text: "",
            url: "",
            options: "",
            title: "",
            pineconeId: "",
            pineconeTitle: "",
            size: "",
            upsertedDate: "",
            vectorCount: "",
            validation: "",
            parser: "",
            errorMessage: "",
            status: "New",
            created: new Date().toISOString(),
        };
        this.saveTableRowToFirestore(data, rowId);
    }
    /**
     * @param { any } projectId
    */
    async addProject(projectId: any = "") {
        if (!projectId) {
            projectId = prompt("Project Name:", new Date().toISOString().substring(0, 10));
            if (projectId === null) return;
            projectId = projectId.trim();
            if (!projectId) return;
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
    /** override event that happens after authentication resolution / or a user profile change */
    authUpdateStatusUI(): void {
        super.authUpdateStatusUI();
        if (this.profile) {
            this.watchProjectList();
            this.initUsageWatch();
        }
    }
    /** */
    copyQueryResultsToClipboard() {
        const jsonStr = JSON.stringify(this.pineconeQueryResults, null, "\t");
        navigator.clipboard.writeText(jsonStr);
    }
    /** */
    async deleteIndex() {
        if (!confirm("Are you sure you want to delete this index?")) return;
        const data = this.scrapeData();
        await this._deleteIndex(data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
        this._fetchIndexStats(data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
    }
    /** delete index
     * @param { string } pineconeIndex grouping key
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
    */
    async _deleteIndex(pineconeIndex: string, pineconeKey: string, pineconeEnvironment: string) {
        if (!firebase.auth().currentUser) {
            alert("login on homepage to use this");
            return;
        }
        if (this.indexDeleteRunning) {
            alert("already running");
            return;
        }

        this.indexDeleteRunning = true;
        const body = {
            pineconeIndex,
            pineconeEnvironment,
            pineconeKey,
        };

        const token = await firebase.auth().currentUser?.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/deleteindex", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: <HeadersInit>{
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const json = await fResult.json();
        console.log("query response", json);

        this.indexDeleteRunning = false;

        if (json.success === false) {
            alert(json.errorMessage);
        }
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
        const pineconeIndex = data.pineconeIndex;
        const pineconeEnvironment = data.pineconeEnvironment;
        const pineconeKey = data.pineconeKey;
        const body = {
            pineconeIndex,
            pineconeEnvironment,
            pineconeKey,
            vectorId: id,
        };
        const token = await firebase.auth().currentUser?.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/deletevector", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: <HeadersInit>{
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
    async deleteProject() {
        if (!this.selectedProjectId) return;
        if (!confirm("Are you sure you want to delete this project?")) return;
        const deleteProjectId = this.selectedProjectId;
        await firebase.firestore().doc(`Users/${this.uid}/embedding/${deleteProjectId}`).delete();

        const loop = true;
        while (loop) {
            const nextChunk = await firebase.firestore()
                .collection(`Users/${this.uid}/embedding/${deleteProjectId}/data`)
                .limit(100)
                .get();

            if (nextChunk.size < 1) return;

            const promises: any[] = [];
            nextChunk.forEach((doc: any) => {
                promises.push(firebase.firestore()
                    .doc(`Users/${this.uid}/embedding/${deleteProjectId}/data/${doc.id}`)
                    .delete());
            });
            await Promise.all(promises);
        }
    }
    /**
     * @param { string } id
     */
    async deleteTableRow(id: string) {
        if (!confirm("Are you sure you want to delete this row?")) return;

        const rowPath = `Users/${this.uid}/embedding/${this.selectedProjectId}/data/${id}`;
        await firebase.firestore().doc(rowPath).delete();
    }
    /**
     * @param { any } event
     * @param { boolean } csv
    */
    downloadResultsFile(event: any, csv = false) {
        if (event) event.preventDefault();
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
    /** */
    async fetchIndexStats() {
        const data = this.scrapeData();
        await this._fetchIndexStats(data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
    }
    /** fetch index stats
     * @param { string } pineconeIndex grouping key
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
    */
    async _fetchIndexStats(pineconeIndex: string, pineconeKey: string, pineconeEnvironment: string) {
        const body = {
            pineconeIndex,
            pineconeEnvironment,
            pineconeKey,
        };
        this.pinecone_index_stats_display.innerHTML = "fetching...";
        this.pinecone_index_name.innerHTML = "fetching...";
        const token = await firebase.auth().currentUser?.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/indexstats", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: <HeadersInit>{
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const json = await fResult.json();

        if (json.success === false) {
            this.pinecone_index_name.innerHTML = json.errorMessage;
            return;
        }

        this.pinecone_index_stats_display.innerHTML = JSON.stringify(json, null, "\t");
        this.pinecone_index_name.innerHTML = pineconeIndex + "<br>" + json.indexDescription.totalRecordCount;
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
        const pineconeIndex = data.pineconeIndex;
        const pineconeEnvironment = data.pineconeEnvironment;
        const pineconeKey = data.pineconeKey;
        const body = {
            pineconeIndex,
            pineconeEnvironment,
            pineconeKey,
            vectorId: id,
        };
        const token = await firebase.auth().currentUser?.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/fetchvector", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: <HeadersInit>{
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
            if (projectSettings) {
                if (projectSettings.pineconeIndex !== undefined) pineconeIndex = projectSettings.pineconeIndex;
                if (projectSettings.pineconeKey !== undefined) pineconeKey = projectSettings.pineconeKey;
                if (projectSettings.pineconeEnvironment !== undefined) pineconeEnvironment = projectSettings.pineconeEnvironment;
                if (projectSettings.pineconePrompt !== undefined) pineconePrompt = projectSettings.pineconePrompt;
                if (projectSettings.pineconeChunkSize !== undefined) pineconeChunkSize = projectSettings.pineconeChunkSize;
            }
        }

        return {
            pineconeIndex,
            pineconeKey,
            pineconeEnvironment,
            pineconePrompt,
            pineconeChunkSize,
        };
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
    async parseText() {
        const threshold = Number(this.parse_url_chunk_tokens.value);
        const fullText = this.parse_url_text_results.value;

        this.resultChunks = await SharedWithBackend.parseBreakTextIntoChunks(threshold, fullText);
        this.updateResultChunksTable();
    }
    /** */
    async queryEmbeddings() {
        const data = this.scrapeData();
        await this._queryEmbeddings(data.pineconePrompt, data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
    }
    /** query matching vector documents
     * @param { string } query
     * @param { string } pineconeIndex grouping key
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
    */
    async _queryEmbeddings(query: string, pineconeIndex: string, pineconeKey: string, pineconeEnvironment: string) {
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
            pineconeIndex,
            pineconeKey,
            pineconeEnvironment,
            topK: 10,
        };

        const token = await firebase.auth().currentUser?.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/processquery", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: <HeadersInit>{
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
    /**
 * @param { string } field
 * @param { any } value
 */
    async saveEmbeddingField(field: string, value: any) {
        if (!this.selectedProjectId) return;
        await firebase.firestore().doc(`Users/${this.uid}/embedding/${this.selectedProjectId}`).set({
            [field]: value,
            updated: new Date().toISOString(),
        }, {
            merge: true,
        });
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
    /**
 * @param { any } updateData
 * @param { string } id
 */
    async saveTableRowToFirestore(updateData: any, id: string) {
        const rowPath = `Users/${this.uid}/embedding/${this.selectedProjectId}/data/${id}`;
        updateData.lastActivity = new Date().toISOString();
        return firebase.firestore().doc(rowPath).set(updateData, {
            merge: true,
        });
    }
    /**
 * @param { any[] } rows
 * @return { Promise<any> }
 */
    async saveUpsertRowsToFirestore(rows: any[]): Promise<any> {
        const promises: any[] = [];
        const errors: any[] = [];
        rows.forEach((row: any, index: number) => {
            if (!row.id || !row.url) {
                errors.push({
                    index,
                    error: "No id or url specified",
                });
            } else {
                const columnsToVerify = ["prefix", "text", "url", "options", "title"];
                columnsToVerify.forEach((key: string) => {
                    if (!row[key]) row[key] = "";
                });
                promises.push(this.saveTableRowToFirestore(row, row.id));
            }
        });
        await Promise.all(promises);

        const success = errors.length === 0;
        return {
            success,
            errors,
        };
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

        const token = await firebase.auth().currentUser?.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/scrapeurl", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: <HeadersInit>{
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
    setTableTheme() {
        if (this.tableThemeLinkDom) this.tableThemeLinkDom.remove();
        this.tableThemeLinkDom = document.createElement("link");
        const theme = this.themeIndex === 0 ? "tabulator_site" : "tabulator_midnight";
        this.tableThemeLinkDom.setAttribute("href", `/css/${theme}.css`);
        this.tableThemeLinkDom.setAttribute("rel", "stylesheet");
        document.body.appendChild(this.tableThemeLinkDom);
    }
    /** override to add set table theme
     * @param { boolean } niteMode true if nite mode
    */
    toggleDayMode(niteMode = false) {
        super.toggleDayMode(niteMode);
        this.setTableTheme();
    }
    /**
     * @param { any } event
     */
    async upsertTableRowsToPinecone(event: any) {
        if (event) event.preventDefault();
        const data = this.scrapeData();
        await this._upsertTableRowsToPinecone(this.selectedProjectId, data.pineconeIndex, data.pineconeKey,
            data.pineconeEnvironment, data.pineconeChunkSize);
        this._fetchIndexStats(data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
    }
    /** scrape URLs for embedding
     * @param { string } projectId
     * @param { string } pineconeIndex grouping key
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
     * @param { number } tokenThreshold
    */
    async _upsertTableRowsToPinecone(projectId: string, pineconeIndex: string, pineconeKey: string,
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
            projectId,
            pineconeIndex,
            pineconeKey,
            pineconeEnvironment,
            tokenThreshold,
        };

        const token = await firebase.auth().currentUser?.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/upsertnextdocuments", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: <HeadersInit>{
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const json = await fResult.json();
        this.embeddingRunning = false;
        if (!json.success) {
            alert("Error: " + json.errorMessage);
            console.log(json);
            this.upsert_result_status_bar.innerHTML = json.errorMessage;
        } else {
            const upsertFileResults = json.fileUploadResults;
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
    }
    /** upload/import CSV file
     * @param { any } event
     */
    async uploadUpsertListFile(event: any) {
        if (event) event.preventDefault();
        let fileName = "";
        if (this.embedding_list_file_dom.files[0]) fileName = this.embedding_list_file_dom.files[0].name;
        this.document_list_file_name.innerHTML = fileName;

        const importData = await ChatDocument.getImportDataFromDomFile(this.embedding_list_file_dom);
        const uploadDate = new Date().toISOString();
        const importedRows: any[] = [];
        let rowsSkipped = 0;
        importData.forEach((item: any, index: number) => {
            if (item.url || item.id) {
                item.created = uploadDate;
                if (!item.id) item.id = encodeURIComponent(item.url);

                const keys = Object.keys(item);
                const metaData: any = {};
                keys.forEach((key: string) => {
                    if (key.substring(0, 5) === "meta_") {
                        const field = key.substring(5);
                        if (field) metaData[field] = item[key];
                        console.log(metaData);
                    }
                });
                item.additionalMetaData = JSON.stringify(metaData, null, "\t");
                if (!item.status) item.status = "New";
                importedRows.push(item);
            } else {
                if (index < importData.length - 1) rowsSkipped++;
            }
        });

        await this.saveUpsertRowsToFirestore(importedRows);
        let alertMessage = importedRows.length + " row(s) imported ";
        if (rowsSkipped) {
            alertMessage += rowsSkipped + " row(s) skipped - a url or id field value is required for a row to be imported";
        }
        alert(alertMessage);
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
                    value = `<i class="material-icons">content_copy</i>`;
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
    async updateWatchUpsertRows() {
        const projectId = this.upsert_documents_list.value;
        const selectedRadio: any = document.body.querySelector(`input[name="table_filter_radio"]:checked`);
        const filterValue = selectedRadio.value;

        if (this.selectedProjectId === projectId && this.selectedFilter === filterValue) return;
        this.selectedProjectId = projectId;
        this.selectedFilter = filterValue;

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

        const rowsPath = `Users/${this.uid}/embedding/${this.selectedProjectId}/data`;
        /*
        const countCollection = collection(firebase.firestore(), rowsPath);
        const countSnapshot = await getCountFromServer(countCollection);
        const rowCount = countSnapshot.data().count;
        this.firebase_record_count_status.innerHTML = rowCount;
*/
        this.saveProfileField("selectedEmbeddingProjectId", this.selectedProjectId);
        this.fileUpsertListFirestore = firebase.firestore()
            .collection(rowsPath)
            .limit(500);
        if (filterValue !== "All") {
            this.fileUpsertListFirestore = this.fileUpsertListFirestore.where("status", "==", filterValue);
        }
        this.fileUpsertListFirestore = this.fileUpsertListFirestore.onSnapshot((snapshot: any) => {
            this.fileListToUpload = [];
            let index = 1;
            snapshot.forEach((doc: any) => {
                const row: any = doc.data();
                row.rowNumber = index++;
                this.fileListToUpload.push(row);
            });

            this.csvUploadDocumentsTabulator.setData(this.fileListToUpload);
        });
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
}
