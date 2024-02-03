import BaseApp from "./baseapp";
import ChatDocument from "./chatdocument";
import SharedWithBackend from "./sharedwithbackend";
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
import {
    TabulatorFull,
} from "tabulator-tables";
import {
    createRoot,
} from "react-dom/client";
import React from "react";
import DialogParseURL from "./components/dialogparseurl.jsx";
import DialogTestPinecone from "./components/dialogtestpinecone.jsx";
import DialogPublishEmbedding from "./components/dialogpublishembedding.jsx";
import DialogVectorInspect from "./components/dialogvectorinspect.jsx";
import DialogEmbeddingOptions from "./components/dialogembeddingoptions.jsx";
import DialogGenerateResult from "./components/dialoggenerateresult.jsx";

/** Embedding upload app class */
export class EmbeddingApp extends BaseApp {
    help_show_modal: any = document.querySelector(".help_show_modal");
    sign_out_homepage: any = document.querySelector(".sign_out_homepage");
    upload_embedding_documents_btn: any = document.querySelector(".upload_embedding_documents_btn");
    embedding_query_results_table_wrapper: any = document.querySelector(".embedding_query_results_table_wrapper");
    chunk_size_default: any = document.querySelector(".chunk_size_default");
    prompt_area: any = document.querySelector(".prompt_area");
    embedding_list_file_dom: any = document.querySelector(".embedding_list_file_dom");
    upload_document_list_button: any = document.querySelector(".upload_document_list_button");
    download_json_results_btn: any = document.querySelector(".download_json_results_btn");
    generate_lookup_db = document.querySelector(".generate_lookup_db") as HTMLAnchorElement;
    reset_errors_to_new = document.querySelector(".reset_errors_to_new") as HTMLAnchorElement;
    upsert_result_status_bar: any = document.querySelector(".upsert_result_status_bar");
    fetch_pinecone_index_stats_btn: any = document.querySelector(".fetch_pinecone_index_stats_btn");
    pinecone_index_status_display = document.querySelector(".pinecone_index_status_display") as HTMLDivElement;
    upsert_embedding_tab_btn: any = document.querySelector("#upsert_embedding_tab_btn");
    add_row_btn: any = document.querySelector(".add_row_btn");
    upsert_documents_list: any = document.querySelector(".upsert_documents_list");
    add_project_btn = document.querySelector(".add_project_btn") as HTMLAnchorElement;
    remove_project_btn = document.querySelector(".remove_project_btn") as HTMLAnchorElement;
    table_filter_select = document.querySelector(".table_filter_select") as HTMLSelectElement;
    firebase_record_count_status = document.querySelector(".firebase_record_count_status") as HTMLDivElement;
    table_all_count = document.querySelector(".table_all_count") as HTMLOptionElement;
    table_new_count = document.querySelector(".table_new_count") as HTMLOptionElement;
    table_done_count = document.querySelector(".table_done_count") as HTMLOptionElement;
    table_error_count = document.querySelector(".table_error_count") as HTMLOptionElement;
    upload_embedding_document_batchsize: any = document.querySelector(".upload_embedding_document_batchsize");
    next_table_page_btn: any = document.querySelector(".next_table_page_btn");
    upsert_next_loop_checkbox: any = document.querySelector(".upsert_next_loop_checkbox");
    test_pinecone_dialog_btn: any = document.querySelector(".test_pinecone_dialog_btn");
    publish_pinecone_dialog_btn: any = document.querySelector(".publish_pinecone_dialog_btn");
    vector_inspect_dialog_btn: any = document.querySelector(".vector_inspect_dialog_btn");
    embedding_options_dialog_btn: any = document.querySelector(".embedding_options_dialog_btn");
    actionRunning = false;
    tableQueryFirstRow = 1;
    tableIdSortDirection = "";
    fileUpsertListFirestore: any = null;
    connectedSessionsFirestore: any = null;
    embeddingProjects: any = {};
    selectedProjectId = "";
    selectedFilter = "";
    watchProjectListFirestore: any = null;
    fileListToUpload: Array<any> = [];
    parsedTextChunks: Array<string> = [];
    csvUploadDocumentsTabulator: TabulatorFull;
    usageWatchInited = false;
    vectorQueryRunning = false;
    indexDeleteRunning = false;
    primedPrompt = "";
    tableThemeLinkDom: any = null;
    saveChangesTimer: any = null;
    editableTableFields = ["url", "title", "options", "text", "status", "additionalMetaData"];
    resultChunks: Array<any> = [];
    userPreferencesInited = false;
    newUpsertDocumentCount = 0;
    dialogParseURL: React.ReactElement;
    dialogTestPinecone: React.ReactElement;
    dialogPublishEmbedding: React.ReactElement;
    dialogVectorInspect: React.ReactElement;
    dialogEmbeddingOptions: React.ReactElement;
    dialogGenerateResult: React.ReactElement;
    first_table_row: any = document.querySelector(".first_table_row");
    pineconeIndex = "";
    pineconeEnvironment = "";
    pineconeKey = "";
    chunkingType = "size";
    pineconeChunkSize = 200;
    includeTextInMeta = false;
    overlap = 20;
    separators = "";
    serverType = "Serverless";
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
            title: "",
            field: "copyJSON",
            headerSort: false,
            formatter: () => {
                return `<i class="material-icons">download_for_offline</i>`;
            },
            hozAlign: "center",
        }, {
            title: "Activity",
            field: "lastActivity",
            hozAlign: "center",
            headerSort: false,
            formatter: (cell: any) => {
                let data = cell.getValue();
                if (!data) {
                    data = "";
                } else {
                    data = data.substring(0, 10);
                }
                return data;
            },
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
            title: "id List",
            width: 75,
            field: "ids",
            headerSort: false,
        }, {
            title: "error",
            width: 100,
            field: "errorMessage",
            headerSort: false,
        }, {
            title: "text",
            width: 100,
            field: "text",
            editor: "textarea",
            headerSort: false,
        },
    ];

    /** */
    constructor() {
        super();
        this.showLoginModal = false;

        // init table
        this.csvUploadDocumentsTabulator = new TabulatorFull(".preview_embedding_documents_table", {
            data: [],
            height: "100%",
            layout: "fitDataStretch",
            columns: <any>(this.tableColumns),
        });
        this.csvUploadDocumentsTabulator.on("cellClick", async (e: any, cell: any) => {
            const field = cell.getField();
            const data = cell.getRow().getData();
            if (field === "copyJSON") {
                const docRef = doc(getFirestore(),
                    `Users/${this.uid}/embedding/${this.selectedProjectId}/data/${data["responseId"]}`);
                const responseQuery = await getDoc(docRef);
                const responseData = responseQuery.data();
                const outData: any = Object.assign({}, data);
                outData.upsertResponse = responseData;
                const json = JSON.stringify(outData, null, "\t");
                navigator.clipboard.writeText(json);
                cell.getElement().innerHTML = `<i class="material-icons">check</i>`;
                setTimeout(() => cell.getElement().innerHTML = `<i class="material-icons">download_for_offline</i>`, 800);
            }
            if (field === "uploadToCloud") {
                await this.upsertTableRowsToPinecone(data.id);
                this.updateRowsCountFromFirestore();
            }
            if (field === "copyText") {
                const docRef = doc(getFirestore(),
                    `Users/${this.uid}/embedding/${this.selectedProjectId}/data/${data["responseId"]}`);
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
                this.dialogParseURL.props.hooks.setParseOptions(data.options);
                this.dialogParseURL.props.hooks.setParseURL(data.url);
                this.dialogParseURL.props.hooks.setShow(true);
                this.dialogParseURL.props.hooks.setBasePath(this.basePath);
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
            if (column.getField() === "id") {
                this.tableIdSortDirection = this.csvUploadDocumentsTabulator.getSorters()[0].dir;
                this.saveProfileField("embedding_tableIdSortDirection", this.tableIdSortDirection);
                this.updateWatchUpsertRows(true);
            }
        });
        this.upload_embedding_documents_btn.addEventListener("click", async (e: any) => {
            e.preventDefault();
            const condition = true;
            while (condition) {
                if (this.newUpsertDocumentCount > 0) {
                    await this.upsertTableRowsToPinecone();
                    const loop = this.upsert_next_loop_checkbox.checked;
                    if (!loop) break;
                } else {
                    break;
                }
            }
        });
        this.upload_document_list_button.addEventListener("click", (event: any) => {
            this.embedding_list_file_dom.value = "";
            this.embedding_list_file_dom.click();
            event.preventDefault();
        });
        this.embedding_list_file_dom.addEventListener("change", (e: Event) => this.uploadUpsertListFile(e));

        this.download_json_results_btn.addEventListener("click", (e: Event) => {
            e.preventDefault();
            this.exportAllData();
        });
        this.generate_lookup_db.addEventListener("click", (e: Event) => {
            e.preventDefault();
            this.generateLookupDB();
        });
        this.reset_errors_to_new.addEventListener("click", (e: Event) => {
            e.preventDefault();
            this.resetErrors();
        });

        this.fetch_pinecone_index_stats_btn.addEventListener("click", () => this.fetchIndexStats());
        this.add_row_btn.addEventListener("click", (e: Event) => this.addEmptyTableRow(e));
        this.setTableTheme();

        this.upsert_documents_list.addEventListener("change", () => this.updateWatchUpsertRows());
        this.add_project_btn.addEventListener("click", (e: Event) => {
            e.preventDefault();
            this.addProject();
        });
        this.remove_project_btn.addEventListener("click", (e: Event) => {
            e.preventDefault();
            this.deleteProject();
        });

        this.table_filter_select.addEventListener("input", () => {
            this.saveProfileField("embeddingPageTableFilterValue", this.table_filter_select.value);
            this.updateWatchUpsertRows();
        });

        this.first_table_row.addEventListener("input", () => this.updateWatchUpsertRows());
        this.next_table_page_btn.addEventListener("click", () => {
            let nextId = "";
            if (this.fileListToUpload.length > 0) {
                nextId = this.fileListToUpload[this.fileListToUpload.length - 1].id;
            }
            this.first_table_row.value = nextId;
            this.updateWatchUpsertRows();
        });

        const div = document.createElement("div");
        document.body.appendChild(div);
        this.dialogParseURL = React.createElement(DialogParseURL, {
            hooks: {},
        });
        createRoot(div).render(this.dialogParseURL);

        const div2 = document.createElement("div");
        document.body.appendChild(div2);
        this.dialogTestPinecone = React.createElement(DialogTestPinecone, {
            hooks: {},
        });
        createRoot(div2).render(this.dialogTestPinecone);
        this.test_pinecone_dialog_btn.addEventListener("click", (e: any) => {
            e.preventDefault();
            this.dialogTestPinecone.props.hooks.queryEmbeddings = async (prompt: string) => {
                return this.queryEmbeddings(prompt);
            };
            this.dialogTestPinecone.props.hooks.setShow(true);
        });

        const div3 = document.createElement("div");
        document.body.appendChild(div3);
        this.dialogPublishEmbedding = React.createElement(DialogPublishEmbedding, {
            hooks: {},
        });
        createRoot(div3).render(this.dialogPublishEmbedding);
        this.publish_pinecone_dialog_btn.addEventListener("click", (e: any) => {
            e.preventDefault();
            this.dialogPublishEmbedding.props.hooks.addConnectedSession = async () => {
                return this.addConnectedSession();
            };
            this.dialogPublishEmbedding.props.hooks.setShow(true);
        });

        const div4 = document.createElement("div");
        document.body.appendChild(div4);
        this.dialogVectorInspect = React.createElement(DialogVectorInspect, {
            hooks: {},
        });
        createRoot(div4).render(this.dialogVectorInspect);
        this.vector_inspect_dialog_btn.addEventListener("click", (e: any) => {
            e.preventDefault();
            this.dialogVectorInspect.props.hooks.fetchVector = async (id: string) => this.fetchPineconeVector(id);
            this.dialogVectorInspect.props.hooks.deleteVector = async (id: string) => this.deletePineconeVector(id);
            this.dialogVectorInspect.props.hooks.setShow(true);
        });

        const div5 = document.createElement("div");
        document.body.appendChild(div5);
        this.dialogEmbeddingOptions = React.createElement(DialogEmbeddingOptions, {
            hooks: {},
        });
        createRoot(div5).render(this.dialogEmbeddingOptions);
        this.embedding_options_dialog_btn.addEventListener("click", (e: any) => {
            e.preventDefault();
            this.dialogEmbeddingOptions.props.hooks.setPineconeKey(this.pineconeKey);
            this.dialogEmbeddingOptions.props.hooks.setPineconeEnvironment(this.pineconeEnvironment);
            this.dialogEmbeddingOptions.props.hooks.setPineconeIndex(this.pineconeIndex);
            this.dialogEmbeddingOptions.props.hooks.setPineconeChunkSize(this.pineconeChunkSize);
            this.dialogEmbeddingOptions.props.hooks.setIncludeTextInMeta(this.includeTextInMeta);
            this.dialogEmbeddingOptions.props.hooks.setChunkingType(this.chunkingType);
            this.dialogEmbeddingOptions.props.hooks.setOverlap(this.overlap);
            this.dialogEmbeddingOptions.props.hooks.setSeparators(this.separators);
            this.dialogEmbeddingOptions.props.hooks.setServerType(this.serverType);

            this.dialogEmbeddingOptions.props.hooks.deleteIndex =
                () => this.deleteIndex();
            this.dialogEmbeddingOptions.props.hooks.savePineconeOptions =
                (serverType: string, pineconeIndex: string, pineconeKey: string, pineconeEnvironment: string,
                    pineconeChunkSize: number, includeTextInMeta: boolean,
                    chunkingType: string, overlap: number, separators: string) =>
                    this.savePineconeOptions(serverType, pineconeIndex, pineconeKey, pineconeEnvironment, pineconeChunkSize,
                        includeTextInMeta, chunkingType, overlap, separators);
            this.dialogEmbeddingOptions.props.hooks.setShow(true);
        });

        const div6 = document.createElement("div");
        document.body.appendChild(div6);
        this.dialogGenerateResult = React.createElement(DialogGenerateResult, {
            hooks: {},
        });
        createRoot(div6).render(this.dialogGenerateResult);
    }
    /** */
    async resetErrors() {        
        const docsCollection = collection(getFirestore(),
        `Users/${this.uid}/embedding/${this.selectedProjectId}/data`);
        const errorQuery = query(docsCollection, where("status", "==", "new"));
        const errorsSnapshot = await getDocs(errorQuery);
        errorsSnapshot.forEach((d: any) => {
            console.log(d.id);
            const docPath = `Users/${this.uid}/embedding/${this.selectedProjectId}/data/${d.id}`;
            setDoc(doc(getFirestore(), docPath), {
                status: "New",
            }, {
                merge: true,
            });
        })
    }
    /** */
    async generateLookupDB() {
        if (!this.selectedProjectId) return;
        this.upsert_result_status_bar.innerHTML = `Generating Lookup ...`;

        const body: any = {
            projectId: this.selectedProjectId,
        };
        const token = await getAuth().currentUser?.getIdToken() as string;
        const fResult = await fetch(this.basePath + "embeddingApi/generatelookup", {
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
        if (!json.success) {
            console.log(json.errorMessage, json);
            alert(json.errorMessage);
            return;
        }

        this.upsert_result_status_bar.innerHTML = ``;
        console.log("lookup data", json.publicPath);
        this.dialogGenerateResult.props.hooks.setTitle("Lookup Database Cloud Path");
        this.dialogGenerateResult.props.hooks.setPath(json.publicPath);
        this.dialogGenerateResult.props.hooks.setShow(true);
    }
    /**
     * @param { any } event
     */
    addEmptyTableRow(event: any) {
        if (event) event.preventDefault();
        let rowId = prompt("Row ID:", new Date().toISOString().substring(0, 10));
        if (rowId === null) return;
        rowId = rowId.trim();
        if (!rowId) return;

        const data: any = {
            id: rowId,
            include: true,
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
                this.table_filter_select.value = this.profile.embeddingPageTableFilterValue;
                if (this.table_filter_select.selectedIndex === -1) this.table_filter_select.selectedIndex = 0;

                let rowCount = Number(this.profile.upsertEmbeddingRowCount);
                if (isNaN(rowCount)) rowCount = 1;
                this.upload_embedding_document_batchsize.value = rowCount;

                if (this.profile.upsertEmbeddingStartRow) {
                    this.first_table_row.value = this.profile.upsertEmbeddingStartRow;
                }

                let sortDir = this.profile.embedding_tableIdSortDirection;
                this.tableIdSortDirection = sortDir;
                if (sortDir !== "asc" && sortDir !== "desc") sortDir = "asc";
                this.csvUploadDocumentsTabulator.setSort([
                    {
                        column: "id",
                        dir: sortDir,
                    },
                ]);
                this.updateWatchUpsertRows(true);
            }

            this.watchProjectList();
        }
        if (this.csvUploadDocumentsTabulator) this.csvUploadDocumentsTabulator.redraw();
    }
    /** */
    async deleteIndex() {
        if (!confirm("Are you sure you want to delete this index?")) return;
        await this._deleteIndex(this.pineconeIndex, this.pineconeKey);
        this.fetchIndexStats();
    }
    /** delete index
     * @param { string } pineconeIndex grouping key
     * @param { string } pineconeKey
    */
    async _deleteIndex(pineconeIndex: string, pineconeKey: string) {
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
    /**
     * @param { string } id
     */
    async deletePineconeVector(id: string) {
        if (id === "") {
            alert("Please supply a vector id");
            return;
        }

        const pineconeIndex = this.pineconeIndex;
        const pineconeEnvironment = this.pineconeEnvironment;
        const pineconeKey = this.pineconeKey;
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
        if (!confirm("Are you sure you want to delete this project? " +
            " Please wait until additional alert before leaving page.")) return;
        const deleteProjectId = this.selectedProjectId;
        const rowRef = doc(getFirestore(), `Users/${this.uid}/embedding/${deleteProjectId}`);
        await deleteDoc(rowRef);

        const loop = true;
        while (loop) {
            const docsCollection = collection(getFirestore(),
                `Users/${this.uid}/embedding/${deleteProjectId}/data`);
            const docsQuery = query(docsCollection, limit(100));
            const nextChunk = await getDocs(docsQuery);

            if (nextChunk.size < 1) break;

            const promises: any[] = [];
            nextChunk.forEach((d: any) => {
                const docPath = `Users/${this.uid}/embedding/${deleteProjectId}/data/${d.id}`;
                const rowRef = doc(getFirestore(), docPath);
                promises.push(deleteDoc(rowRef));
            });
            await Promise.all(promises);
        }
        while (loop) {
            const docsCollection = collection(getFirestore(),
                `Users/${this.uid}/embedding/${deleteProjectId}/chunkMap`);
            const docsQuery = query(docsCollection, limit(100));
            const nextChunk = await getDocs(docsQuery);

            if (nextChunk.size < 1) break;

            const promises: any[] = [];
            nextChunk.forEach((d: any) => {
                const rowRef = doc(getFirestore(),
                    `Users/${this.uid}/embedding/${deleteProjectId}/chunkMap/${d.id}`);
                promises.push(deleteDoc(rowRef));
            });
            await Promise.all(promises);
        }

        alert("Project " + deleteProjectId + " finished deleting all records.");
    }
    /**
     * @param { string } id
     */
    async deleteTableRow(id: string) {
        if (!confirm("Are you sure you want to delete this row?")) return;
        let rowRef = doc(getFirestore(),
            `Users/${this.uid}/embedding/${this.selectedProjectId}/data/${id}`);
        await deleteDoc(rowRef);
        rowRef = doc(getFirestore(),
            `Users/${this.uid}/embedding/${this.selectedProjectId}/chunkMap/${id}`);
        await deleteDoc(rowRef);
        this.updateRowsCountFromFirestore();
    }
    /** */
    async exportAllData() {
        if (!this.selectedProjectId) return;
        this.upsert_result_status_bar.innerHTML = `Exporting all data...`;
        const body: any = {
            projectId: this.selectedProjectId,
        };
        const token = await getAuth().currentUser?.getIdToken() as string;
        const fResult = await fetch(this.basePath + "embeddingApi/exportjson", {
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
        if (!json.success) {
            console.log(json.errorMessage, json);
            alert(json.errorMessage);
            return;
        }

        console.log("exported data", json.publicPath);
        this.upsert_result_status_bar.innerHTML = ``;
        this.dialogGenerateResult.props.hooks.setTitle("Exported Data Database Cloud Path");
        this.dialogGenerateResult.props.hooks.setPath(json.publicPath);
        this.dialogGenerateResult.props.hooks.setShow(true);
    }
    /** */
    async fetchIndexStats() {
        const body = {
            pineconeIndex: this.pineconeIndex,
            pineconeEnvironment: this.pineconeEnvironment,
            pineconeKey: this.pineconeKey,
        };
        this.pinecone_index_status_display.innerHTML = "fetching...";
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
            this.pinecone_index_status_display.innerHTML = json.errorMessage;
            return;
        }

        this.pinecone_index_status_display.innerHTML = "Vectors:<br>" + json.indexDescription.totalRecordCount;
    }
    /**
     * @param { string } id
     * @return { Promise<string> }
     */
    async fetchPineconeVector(id: string): Promise<string> {
        if (id === "") {
            alert("Please supply a vector id");
            return "Please supply a vector id";
        }

        const pineconeIndex = this.pineconeIndex;
        const pineconeEnvironment = this.pineconeEnvironment;
        const pineconeKey = this.pineconeKey;
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
        return JSON.stringify(json, (k: any, v: any) => {
            if (v instanceof Array && k === "values") return JSON.stringify(v, null, 1).replace(/\n/g, " ");
            return v;
        }, 2);
    }
    /** */
    getPineconeOptions() {
        this.pineconeIndex = "";
        this.pineconeKey = "";
        this.pineconeEnvironment = "";
        this.pineconeChunkSize = 200;
        this.includeTextInMeta = false;
        this.chunkingType = "size";
        this.overlap = 20;
        this.separators = `["\\n\\n", "\\n", " ", ""]`;
        this.serverType = "Serverless";

        if (this.selectedProjectId) {
            const projectSettings = this.embeddingProjects[this.selectedProjectId];
            if (projectSettings) {
                if (projectSettings.pineconeIndex !== undefined) this.pineconeIndex = projectSettings.pineconeIndex;
                if (projectSettings.pineconeKey !== undefined) this.pineconeKey = projectSettings.pineconeKey;
                if (projectSettings.pineconeEnvironment !== undefined) this.pineconeEnvironment = projectSettings.pineconeEnvironment;
                if (projectSettings.pineconeChunkSize !== undefined) this.pineconeChunkSize = projectSettings.pineconeChunkSize;
                if (projectSettings.includeTextInMeta !== undefined) this.includeTextInMeta = projectSettings.includeTextInMeta;
                if (projectSettings.chunkingType !== undefined) this.chunkingType = projectSettings.chunkingType;
                if (projectSettings.overlap !== undefined) this.overlap = projectSettings.overlap;
                if (projectSettings.separators !== undefined) this.separators = projectSettings.separators;
                if (projectSettings.serverType !== undefined) this.serverType = projectSettings.serverType;
            }
        }
    }
    /**
     * @param { string } prompt
     * @return { Promise<any> }
     */
    async queryEmbeddings(prompt: string): Promise<any> {
        return await this._queryEmbeddings(prompt, this.pineconeIndex, this.pineconeKey, this.pineconeEnvironment);
    }
    /** query matching vector documents
     * @param { string } query
     * @param { string } pineconeIndex grouping key
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
     * @return { Promise<any> }
    */
    async _queryEmbeddings(query: string, pineconeIndex: string, pineconeKey: string,
        pineconeEnvironment: string): Promise<any> {
        if (!getAuth().currentUser) {
            alert("login on homepage to use this");
            return;
        }
        if (this.vectorQueryRunning) {
            alert("already running");
            return;
        }

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

        const resultRows = json.queryResponse.matches;
        this.vectorQueryRunning = false;
        return resultRows;
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
     * @param { string } serverType
     * @param { string } pineconeIndex
     * @param { string } pineconeKey
     * @param { string } pineconeEnvironment
     * @param { number } pineconeChunkSize
     * @param { boolean } includeTextInMeta
     * @param { string } chunkingType
     * @param { number } overlap
     * @param { string } separators
     */
    async savePineconeOptions(serverType: string, pineconeIndex: string, pineconeKey: string,
        pineconeEnvironment: string, pineconeChunkSize: number, includeTextInMeta: boolean,
        chunkingType: string, overlap: number, separators: string) {
        this.serverType = serverType;
        this.pineconeIndex = pineconeIndex;
        this.pineconeKey = pineconeKey;
        this.pineconeEnvironment = pineconeEnvironment;
        this.pineconeChunkSize = pineconeChunkSize;
        this.includeTextInMeta = includeTextInMeta;
        this.chunkingType = chunkingType;
        this.overlap = overlap;
        this.separators = separators;

        await Promise.all([
            this.saveEmbeddingField("serverType", serverType),
            this.saveEmbeddingField("pineconeIndex", pineconeIndex),
            this.saveEmbeddingField("pineconeKey", pineconeKey),
            this.saveEmbeddingField("pineconeEnvironment", pineconeEnvironment),
            this.saveEmbeddingField("pineconeChunkSize", pineconeChunkSize),
            this.saveEmbeddingField("includeTextInMeta", includeTextInMeta),
            this.saveEmbeddingField("chunkingType", chunkingType),
            this.saveEmbeddingField("overlap", overlap),
            this.saveEmbeddingField("separators", separators),
        ]);
        this.csvUploadDocumentsTabulator.redraw();
    }
    /**
 * @param { any } updateData
 * @param { string } id
 */
    async saveTableRowToFirestore(updateData: any, id: string) {
        try {
            const rowPath = `Users/${this.uid}/embedding/${this.selectedProjectId}/data/${id}`;
            updateData.lastActivity = new Date().toISOString();
            const docRef = doc(getFirestore(), rowPath);
            await setDoc(docRef, updateData, {
                merge: true,
            });
            return {
                success: true,
            };
        } catch (err: any) {
            return {
                success: false,
                error: err,
                errorMessage: err.message,
            };
        }
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
                const columnsToVerify = ["text", "url", "options", "title"];
                columnsToVerify.forEach((key: string) => {
                    if (!row[key]) row[key] = "";
                });
                promises.push(this.saveTableRowToFirestore(row, row.id));
            }
        });
        const results = await Promise.all(promises);
        results.forEach((result: any, index: number) => {
            if (!result.success) {
                errors.push({
                    index,
                    error: result.error,
                });
            }
        });
        if (errors.length > 0) console.log("Upload errors", errors);
        const success = errors.length === 0;
        return {
            success,
            errors,
        };
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
     * @param { string } singleRowId
     */
    async upsertTableRowsToPinecone(singleRowId = "") {
        if (this.actionRunning) {
            alert("already running");
            return;
        }

        let rowCount = this.upload_embedding_document_batchsize.value;
        this.saveProfileField("upsertEmbeddingRowCount", rowCount);

        if (singleRowId) rowCount = 1;
        this.upsert_result_status_bar.innerHTML = `Upserting next ${rowCount} rows ...`;
        this.actionRunning = true;
        const body = {
            projectId: this.selectedProjectId,
            pineconeIndex: this.pineconeIndex,
            pineconeKey: this.pineconeKey,
            pineconeEnvironment: this.pineconeEnvironment,
            tokenThreshold: this.pineconeChunkSize,
            includeTextInMeta: this.includeTextInMeta,
            chunkingType: this.chunkingType,
            overlap: this.overlap,
            separators: this.separators,
            serverType: this.serverType,
            rowCount,
            singleRowId,
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
        this.actionRunning = false;
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

        this.fetchIndexStats();
        await this.updateRowsCountFromFirestore();
    }
    /** upload/import CSV file
     * @param { any } event
     */
    async uploadUpsertListFile(event: any) {
        if (event) event.preventDefault();
        if (this.actionRunning) {
            alert("action running already");
            return;
        }

        this.upsert_result_status_bar.innerHTML = `Uploading data file ...`;
        this.actionRunning = true;
        if (this.fileUpsertListFirestore) this.fileUpsertListFirestore();
        this.fileUpsertListFirestore = null;

        const importData = await ChatDocument.getImportDataFromDomFile(this.embedding_list_file_dom);
        const uploadDate = new Date().toISOString();
        const importedRows: any[] = [];
        const errorList: any[] = [];
        importData.forEach((item: any) => {
            const text = item.text as string;
            if ((item.url || item.id) && text.length < 900000) {
                item.created = uploadDate;
                if (!item.id) item.id = encodeURIComponent(item.url);

                const keys = Object.keys(item);
                const metaData: any = {};
                keys.forEach((key: string) => {
                    if (key.substring(0, 5) === "meta_") {
                        const field = key.substring(5);
                        if (field) metaData[field] = item[key];
                    }
                });
                item.additionalMetaData = JSON.stringify(metaData, null, "\t");
                if (!item.status) item.status = "New";
                importedRows.push(item);
            } else {
                errorList.push(item);
            }
        });

        await this.saveUpsertRowsToFirestore(importedRows);
        this.updateRowsCountFromFirestore();
        let alertMessage = importedRows.length + " row(s) imported ";
        if (errorList.length > 0) {
            alertMessage += errorList.length + " row(s) skipped - refer to browser console for more details";
            console.log("File upload errored items", errorList);
        }
        this.actionRunning = false;
        this.upsert_result_status_bar.innerHTML = alertMessage;
        this.updateWatchUpsertRows(true);
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

        this.newUpsertDocumentCount = newCount;
        this.table_new_count.innerHTML = `New (${newCount})`;
        this.table_all_count.innerHTML = `All (${totalRows})`;
        this.table_done_count.innerHTML = `Done (${doneCount})`;
        this.table_error_count.innerHTML = `Errors (${errorCount})`;
    }
    /**
     * @param { boolean } forceRefresh
     */
    async updateWatchUpsertRows(forceRefresh = false) {
        if (this.actionRunning) return;
        const projectId = this.upsert_documents_list.value;
        const filterValue = this.table_filter_select.value;
        const firstRow = this.first_table_row.value;

        if (this.selectedProjectId === projectId && this.selectedFilter === filterValue &&
            this.tableQueryFirstRow === firstRow && forceRefresh === false) return;
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
        if (this.connectedSessionsFirestore) this.connectedSessionsFirestore();
        this.connectedSessionsFirestore = null;
        if (!this.selectedProjectId) return;

        this.getPineconeOptions();
        this.fetchIndexStats();
        this.fileListToUpload = [];
        this.csvUploadDocumentsTabulator.setData(this.fileListToUpload);

        let sortDir = this.tableIdSortDirection;
        if (sortDir !== "asc" && sortDir !== "desc") sortDir = "asc";
        const rowsPath = `Users/${this.uid}/embedding/${this.selectedProjectId}/data`;
        const docsCollection = collection(getFirestore(), rowsPath);
        let docsQuery = query(docsCollection, orderBy(documentId(), <any>sortDir), limit(100));
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

        let keyHash = 9999999999999;
        let indexHash = 99999999999999;
        keyHash = SharedWithBackend.hashCode(this.pineconeKey.slice(-8));
        indexHash = SharedWithBackend.hashCode(this.pineconeIndex.slice(-8));
        const sessionsRef = collection(getFirestore(), `Games`);
        const sessionsQuery = query(sessionsRef,
            limit(20),
            orderBy("lastActivity"),
            orderBy("createUser"),
            orderBy("hashed_pineconeKey"),
            orderBy("hashed_pineconeIndex"),
            where("hashed_pineconeKey", "==", keyHash),
            where("hashed_pineconeIndex", "==", indexHash));

        this.connectedSessionsFirestore = onSnapshot(sessionsQuery, (snapshot: any) => {
            const array: any = [];
            snapshot.forEach((doc: any) => array.push(doc));
            this.dialogPublishEmbedding.props.hooks.setSessions(array);
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
    /** */
    async addConnectedSession() {
        if (!this.selectedProjectId) return;

        const body: any = {
            documentType: "chatSession",
            model: "gpt-3.5-turbo-16k",
            title: this.selectedProjectId,
            label: "",
            note: "",
            includePromptsInContext: false,
            model_lock: true,
            firstPrompt: "",
        };

        const token = await getAuth().currentUser?.getIdToken() as string;
        const fResult = await fetch(this.basePath + "lobbyApi/games/create", {
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
        if (!json.success) {
            console.log(json.errorMessage, json);
            alert(json.errorMessage);
            return;
        }
        const sessionId = json.gameNumber;

        await Promise.all([
            ChatDocument.setOwnerOnlyField(sessionId, this.basePath, "pineconeIndex", this.pineconeIndex),
            ChatDocument.setOwnerOnlyField(sessionId, this.basePath, "pineconeEnvironment", this.pineconeEnvironment),
            ChatDocument.setOwnerOnlyField(sessionId, this.basePath, "pineconeKey", this.pineconeKey),
        ]);

        const a = document.createElement("a");
        a.setAttribute("href", `/session/${json.gameNumber}`);
        a.setAttribute("target", "_blank");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
