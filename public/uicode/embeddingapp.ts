import BaseApp from "./baseapp";
import ChatDocument from "./chatdocument";
import SharedWithBackend from "./sharedwithbackend";
import AccountHelper from "./accounthelper";
import {
    getAuth,
} from "firebase/auth";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    where,
    limit,
    getDoc,
    getDocs,
    onSnapshot,
    getCountFromServer,
    query,
    orderBy,
    getFirestore,
    startAfter,
    documentId,
} from "firebase/firestore";

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
    table_all_count: any = document.querySelector(".table_all_count");
    table_new_count: any = document.querySelector(".table_new_count");
    table_done_count: any = document.querySelector(".table_done_count");
    table_error_count: any = document.querySelector(".table_error_count");
    upload_embedding_document_batchsize: any = document.querySelector(".upload_embedding_document_batchsize");
    next_table_page_btn: any = document.querySelector(".next_table_page_btn");
    tableQueryFirstRow = 1;
    tableIdSortDirection = "";
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
    editableTableFields = ["url", "title", "options", "text", "prefix", "status", "additionalMetaData"];
    resultChunks: Array<any> = [];
    userPreferencesInited = false;
    first_table_row: any = document.querySelector(".first_table_row");
    tableColumns = [
        {
            title: "",
            field: "rowNumber",
            hozAlign: "center",
            headerSort: false,
        }, {
            title: "",
            field: "deleteRow",
            headerSort: false,
            formatter: () => {
                return `<i class="material-icons">delete</i>`;
            },
            hozAlign: "center",
        }, {
            title: "id",
            field: "id",
            width: 100,
            headerSort: true,
        }, {
            title: "",
            field: "parser",
            hozAlign: "center",
            headerSort: false,
            formatter: () => {
                return `<i class="material-icons">start</i>`;
            },
        }, {
            title: "url",
            field: "url",
            editor: "textarea",
            width: 250,
            headerSort: false,
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
            title: "",
            field: "copyJSON",
            headerSort: false,
            formatter: () => {
                return `<i class="material-icons">download_for_offline</i>`;
            },
            hozAlign: "center",
        }, {
            title: "Activity",
            field: "activity",
            hozAlign: "center",
            headerSort: false,
        }, {
            title: "",
            field: "uploadToCloud",
            headerSort: false,
            formatter: () => {
                return `<i class="material-icons">cloud_upload</i>`;
            },
            hozAlign: "center",
        }, {
            title: "Status",
            width: 100,
            field: "status",
            editor: "list",
            editorParams: {
                values: {
                    "New": "New",
                    "Error": "Error",
                    "Done": "Done",
                },
            },
            headerSort: false,
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

        // init table
        this.csvUploadDocumentsTabulator = new (<any>window).Tabulator(".preview_embedding_documents_table", {
            data: [],
            height: "100%",
            layout: "fitDataStretch",
            columns: this.tableColumns,
        });
        this.csvUploadDocumentsTabulator.on("cellClick", async (e: any, cell: any) => {
            const field = cell.getField();
            const data = cell.getRow().getData();
            if (field === "copyJSON") {
                const docRef = doc(getFirestore(),
                    `Users/${this.uid}/embedding/${this.selectedProjectId}/responses/${data["responseId"]}`);
                const responseQuery = await getDoc(docRef);
                const responseData = responseQuery.data();
                const outData: any = Object.assign({}, data);
                outData.upsertResponse = responseData;
                const json = JSON.stringify(outData, null, "\t");
                navigator.clipboard.writeText(json);
                cell.getElement().innerHTML = `<i class="material-icons">check</i>`;
                setTimeout(() => cell.getElement().innerHTML = `<i class="material-icons">content_copy</i>`, 800);
            }
            if (field === "copyText") {
                const docRef = doc(getFirestore(),
                    `Users/${this.uid}/embedding/${this.selectedProjectId}/responses/${data["responseId"]}`);
                const responseQuery = await getDoc(docRef);

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
                await this.saveTableRowToFirestore({
                    [field]: data[field],
                }, data.id);
                if (field === "status") this.updateRowsCountFromFirestore();
            }
        });
        this.csvUploadDocumentsTabulator.on("headerClick", (e: any, column: any) => {
            //e - the click event object
            //column - column component
            if (column.getField() === "id") {
                this.tableIdSortDirection = this.csvUploadDocumentsTabulator.getSorters()[0].dir;
                this.saveProfileField("embedding_tableIdSortDirection", this.tableIdSortDirection);
                this.updateWatchUpsertRows(true);
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
            (<any>wnd).document.write(`<div style="white-space: pre-wrap">${this.primedPrompt}</div>`);
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
            const selectedRadio: any = document.body.querySelector(`input[name="table_filter_radio"]:checked`);
            const filterValue = selectedRadio.value;

            this.saveProfileField("embeddingPageTableFilterValue", filterValue);
            this.updateWatchUpsertRows();
        }));

        this.first_table_row.addEventListener("input", () => this.updateWatchUpsertRows());
        this.next_table_page_btn.addEventListener("click", () => {
            let nextId = "";
            if (this.fileListToUpload.length > 0) {
                nextId = this.fileListToUpload[this.fileListToUpload.length - 1].id;
            }
            this.first_table_row.value = nextId;
            this.updateWatchUpsertRows();
        });
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
        const docRef = doc(getFirestore(), `Users/${this.uid}/embedding/${projectId}`);
        await setDoc(docRef, {
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
            if (!this.userPreferencesInited) {
                this.userPreferencesInited = true;
                this.table_filter_radios.forEach((radio: any) => {
                    if (radio.value === this.profile.embeddingPageTableFilterValue) radio.click();
                });

                let rowCount = Number(this.profile.upsertEmbeddingRowCount);
                if (isNaN(rowCount)) rowCount = 1;
                this.upload_embedding_document_batchsize.value = rowCount;

                if (this.profile.upsertEmbeddingStartRow)
                    this.first_table_row.value = this.profile.upsertEmbeddingStartRow;

                let sortDir = this.profile.embedding_tableIdSortDirection;
                this.tableIdSortDirection = sortDir;
                if (sortDir !== "asc" && sortDir !== "desc") sortDir = "asc";
                console.log("sortDir", sortDir);
                this.csvUploadDocumentsTabulator.setSort([
                    {
                        column: "id",
                        dir: sortDir,
                    },
                ]);
                this.updateWatchUpsertRows(true);
            }

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
        if (!getAuth().currentUser) {
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

        const token = await getAuth().currentUser?.getIdToken();
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
        const token = await getAuth().currentUser?.getIdToken();
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
        const rowRef = doc(getFirestore(), `Users/${this.uid}/embedding/${deleteProjectId}`);
        await deleteDoc(rowRef);

        const loop = true;
        while (loop) {
            const docsCollection = collection(getFirestore(),
                `Users/${this.uid}/embedding/${deleteProjectId}/data`);
            const docsQuery = query(docsCollection, limit(100));
            const nextChunk = await getDocs(docsQuery);

            if (nextChunk.size < 1) return;

            const promises: any[] = [];
            nextChunk.forEach((doc: any) => {
                const rowRef = doc(getFirestore(),
                    `Users/${this.uid}/embedding/${deleteProjectId}/data/${doc.id}`);
                promises.push(deleteDoc(rowRef));
            });
            await Promise.all(promises);
        }
    }
    /**
     * @param { string } id
     */
    async deleteTableRow(id: string) {
        if (!confirm("Are you sure you want to delete this row?")) return;
        const rowRef = doc(getFirestore(),
            `Users/${this.uid}/embedding/${this.selectedProjectId}/data/${id}`);
        await deleteDoc(rowRef);
        this.updateRowsCountFromFirestore();
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
            resultText = (<any>window).Papa.unparse(this.fileListToUpload);
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
        const token = await getAuth().currentUser?.getIdToken();
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
        const token = await getAuth().currentUser?.getIdToken();
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
        if (!getAuth().currentUser) {
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

        const token = await getAuth().currentUser?.getIdToken();
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
        const docRef = doc(getFirestore(), `Users/${this.uid}/embedding/${this.selectedProjectId}`);
        await setDoc(docRef, {
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
        const docRef = doc(getFirestore(), rowPath);
        return setDoc(docRef, updateData, {
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

        const token = await getAuth().currentUser?.getIdToken();
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
        const rowCount = this.upload_embedding_document_batchsize.value;
        this.saveProfileField("upsertEmbeddingRowCount", rowCount);

        await this._upsertTableRowsToPinecone(this.selectedProjectId, data.pineconeIndex, data.pineconeKey,
            data.pineconeEnvironment, data.pineconeChunkSize, rowCount);
        this._fetchIndexStats(data.pineconeIndex, data.pineconeKey, data.pineconeEnvironment);
        this.updateRowsCountFromFirestore();
    }
    /** scrape URLs for embedding
     * @param { string } projectId
     * @param { string } pineconeIndex grouping key
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
     * @param { number } tokenThreshold
     * @param { number } rowCount
    */
    async _upsertTableRowsToPinecone(projectId: string, pineconeIndex: string, pineconeKey: string,
        pineconeEnvironment: string, tokenThreshold: number, rowCount: number) {
        if (!getAuth().currentUser) {
            alert("login on homepage to use this");
            return;
        }
        if (this.embeddingRunning) {
            alert("already running");
            return;
        }
        this.upsert_result_status_bar.innerHTML = `Upserting next ${rowCount} rows ...`;
        this.embeddingRunning = true;
        const body = {
            projectId,
            pineconeIndex,
            pineconeKey,
            pineconeEnvironment,
            tokenThreshold,
            rowCount,
        };

        const token = await getAuth().currentUser?.getIdToken();
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
        this.updateRowsCountFromFirestore();
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
    async updateRowsCountFromFirestore() {
        const rowsPath = `Users/${this.uid}/embedding/${this.selectedProjectId}/data`;
        this.saveProfileField("selectedEmbeddingProjectId", this.selectedProjectId);
        const docsCollection = collection(getFirestore(), rowsPath);

        const newQuery = query(docsCollection, where("status", "==", "New"));
        const newSnapshot = await getCountFromServer(newQuery);
        const newCount = newSnapshot.data().count;

        const totalRowsSnapshot = await getCountFromServer(query(docsCollection));
        const totalRows = totalRowsSnapshot.data().count;

        const doneQuery = query(docsCollection, where("status", "==", "Done"));
        const doneSnapshot = await getCountFromServer(doneQuery);
        const doneCount = doneSnapshot.data().count;

        const errorQuery = query(docsCollection, where("status", "==", "Error"));
        const errorSnapshot = await getCountFromServer(errorQuery);
        const errorCount = errorSnapshot.data().count;

        this.table_new_count.innerHTML = newCount;
        this.table_all_count.innerHTML = totalRows;
        this.table_done_count.innerHTML = doneCount;
        this.table_error_count.innerHTML = errorCount;
    }
    /**
     * @param { boolean } forceRefresh
     */
    async updateWatchUpsertRows(forceRefresh = false) {
        const projectId = this.upsert_documents_list.value;
        const selectedRadio: any = document.body.querySelector(`input[name="table_filter_radio"]:checked`);
        const filterValue = selectedRadio.value;
        const firstRow = this.first_table_row.value;

        if (this.selectedProjectId === projectId && this.selectedFilter === filterValue
            && this.tableQueryFirstRow === firstRow && forceRefresh === false) return;
        this.selectedFilter = filterValue;
        if (this.tableQueryFirstRow !== firstRow) {
            this.tableQueryFirstRow = firstRow;
            this.saveProfileField("upsertEmbeddingStartRow", firstRow);
        }
        if (this.selectedProjectId !== projectId) {
            this.selectedProjectId = projectId;
            this.saveProfileField("selectedEmbeddingProjectId", this.selectedProjectId);
        }

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

        let sortDir = this.tableIdSortDirection;
        if (sortDir !== "asc" && sortDir !== "desc") sortDir = "asc";
        const rowsPath = `Users/${this.uid}/embedding/${this.selectedProjectId}/data`;
        const docsCollection = collection(getFirestore(), rowsPath);
        let docsQuery = query(docsCollection, limit(5), orderBy(documentId(), <any>sortDir), limit(500));
        if (firstRow) {
            docsQuery = query(docsQuery, startAfter(firstRow));
        }

        if (filterValue !== "All") {
            docsQuery = query(docsQuery, where("status", "==", filterValue));
        }
        this.updateRowsCountFromFirestore();
        this.fileUpsertListFirestore = onSnapshot(docsQuery, (snapshot: any) => {
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
        const collectionRef = collection(getFirestore(),
            `Users/${this.uid}/embedding`);

        this.watchProjectListFirestore = onSnapshot(collectionRef, (snapshot: any) => {
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
