declare const firebase: any;
declare const window: any;
import {
    ChatDocument,
} from "./chatdocument.js";
import BaseApp from "./baseapp.js"; // only for escapeHTML

/** Base class for all pages - handles authorization and low level routing for api calls, etc */
export default class DocOptionsHelper {
    app: any = null;
    owner_note_display_div: any = null;
    modal_close_button: any = null;
    modalContainer: any = null;
    modal_document_title_display: any;
    documentData: any = null;
    docfield_archived_checkbox: any = null;
    shared_archived_status_wrapper: any = null;
    shared_usage_limit_div: any = null;
    copy_export_clipboard: any = null;
    code_link_href: any;
    code_link_copy: any;
    wrapperClass = "";
    chatDocumentId = "";
    prompt_for_new_note: any;
    noLabelSave = false;
    lastReportData: any;

    export_data_popup_preview: any;
    export_size: any;
    selected_filter: any;
    all_filter: any;
    text_format: any;
    html_format: any;
    csv_format: any;
    json_format: any;
    download_export_button: any;
    modal_upload_tickets_button: any;
    import_upload_file: any;
    show_import_tickets_help: any;
    show_export_tickets_help: any;
    show_document_details_options_help: any;
    show_document_owner_options_help: any;
    doc_options_import_rows_preview: any;
    modal_send_tickets_to_api_button: any;
    prompt_for_new_title: any;
    prompt_for_new_usage: any;

    /**
     * @param { any } app BaseApp derived application instance
     * @param { string } wrapperClass class to add to modal wrapper
     */
    constructor(app: any, wrapperClass = "") {
        this.app = app;
        this.wrapperClass = wrapperClass;

        const html = this.getModalTemplate();
        this.modalContainer = document.createElement("div");
        this.modalContainer.innerHTML = html;
        document.body.appendChild(this.modalContainer);
        if (this.wrapperClass) this.modalContainer.classList.add(this.wrapperClass);

        this.owner_note_display_div = this.modalContainer.querySelector(".owner_note_display_div");
        this.modal_close_button = this.modalContainer.querySelector(".modal_close_button");
        this.modal_document_title_display = this.modalContainer.querySelector(".modal_document_title_display");

        this.docfield_archived_checkbox = this.modalContainer.querySelector(".docfield_archived_checkbox");
        this.docfield_archived_checkbox.addEventListener("input", () => this.updateArchivedStatus());
        this.shared_archived_status_wrapper = this.modalContainer.querySelector(".shared_archived_status_wrapper");
        this.shared_usage_limit_div = this.modalContainer.querySelector(".shared_usage_limit_div");
        this.prompt_for_new_title = this.modalContainer.querySelector(".prompt_for_new_title");
        this.prompt_for_new_title.addEventListener("click", () => this.promptForNewTitle());
        this.prompt_for_new_usage = this.modalContainer.querySelector(".prompt_for_new_usage");
        this.prompt_for_new_usage.addEventListener("click", () => this.promptForNewUsageLimit());
        this.prompt_for_new_note = this.modalContainer.querySelector(".prompt_for_new_note");
        this.prompt_for_new_note.addEventListener("click", () => this.promptForNewNote());

        this.export_data_popup_preview = this.modalContainer.querySelector(".export_data_popup_preview");
        this.export_size = this.modalContainer.querySelector(".export_size");
        this.selected_filter = this.modalContainer.querySelector("#selected_filter");
        this.all_filter = this.modalContainer.querySelector("#all_filter");
        this.text_format = this.modalContainer.querySelector("#text_format");
        this.html_format = this.modalContainer.querySelector("#html_format");
        this.csv_format = this.modalContainer.querySelector("#csv_format");
        this.json_format = this.modalContainer.querySelector("#json_format");
        this.download_export_button = this.modalContainer.querySelector(".download_export_button");
        this.modal_upload_tickets_button = this.modalContainer.querySelector(".modal_upload_tickets_button");
        this.import_upload_file = this.modalContainer.querySelector(".import_upload_file");
        this.copy_export_clipboard = this.modalContainer.querySelector(".copy_export_clipboard");
        this.doc_options_import_rows_preview = this.modalContainer.querySelector(".doc_options_import_rows_preview");

        this.modal_send_tickets_to_api_button = this.modalContainer.querySelector(".modal_send_tickets_to_api_button");
        this.modal_send_tickets_to_api_button.addEventListener("click", () => this.uploadReportData());

        this.show_import_tickets_help = document.querySelector(".show_import_tickets_help");
        this.show_import_tickets_help.addEventListener("click", () => this.app.helpHelper.show("share_document_options_tab"));
        this.show_export_tickets_help = document.querySelector(".show_export_tickets_help");
        this.show_export_tickets_help.addEventListener("click", () => this.app.helpHelper.show("export_tickets"));

        this.show_document_details_options_help = document.querySelector(".show_document_details_options_help");
        this.show_document_details_options_help.addEventListener("click", () => this.app.helpHelper.show("user_document_options"));
        this.show_document_owner_options_help = document.querySelector(".show_document_owner_options_help");
        this.show_document_owner_options_help.addEventListener("click", () => this.app.helpHelper.show("owner_document_options"));

        const del: any = this.modalContainer.querySelector("button.delete_game");
        del.addEventListener("click", (e: any) => {
            e.stopPropagation();
            e.preventDefault();
            this.deleteGame();
        });
        const leave: any = this.modalContainer.querySelector("button.leave_game");
        leave.addEventListener("click", (e: any) => {
            e.stopPropagation();
            e.preventDefault();
            this.logoutGame();
        });

        window.$(".edit_options_document_labels").select2({
            tags: true,
            placeHolder: "Add labels...",
        });
        window.$(".edit_options_document_labels").on("change", () => this.saveDocumentLabels());

        this.code_link_href = document.querySelector(".code_link_href");
        this.code_link_copy = document.querySelector(".code_link_copy");

        this.selected_filter.addEventListener("click", () => this.refreshReportData());
        this.all_filter.addEventListener("click", () => this.refreshReportData());
        this.text_format.addEventListener("click", () => this.refreshReportData());
        this.html_format.addEventListener("click", () => this.refreshReportData());
        this.csv_format.addEventListener("click", () => this.refreshReportData());
        this.json_format.addEventListener("click", () => this.refreshReportData());
        this.download_export_button.addEventListener("click", () => this.downloadReportData());
        this.modal_upload_tickets_button.addEventListener("click", () => this.import_upload_file.click());
        this.import_upload_file.addEventListener("change", () => this.updateImportRowsDisplay());
        this.copy_export_clipboard.addEventListener("click", () => this.copyExportToClipboard());

        this.code_link_copy.addEventListener("click", () => this.copyGameLink());
    }
    /** */
    async updateImportRowsDisplay() {
        const records: any = await ChatDocument.getImportDataFromDomFile(this.import_upload_file);
        this.doc_options_import_rows_preview.innerHTML = records.length + " rows";
        if (records.length > 0) this.modal_send_tickets_to_api_button.style.visibility = "visible";
        else this.modal_send_tickets_to_api_button.style.display = "hidden";
    }
    /** copy game url link to clipboard
     */
    copyGameLink() {
        navigator.clipboard.writeText(window.location.origin + "/aichat/?game=" + this.chatDocumentId);
        const buttonText = `<i class="material-icons">content_copy</i> <span>Link</span>`;
        this.code_link_copy.innerHTML = "✅" + buttonText;
        setTimeout(() => this.code_link_copy.innerHTML = buttonText, 1200);
    }
    /** copy export text area to clipboard */
    copyExportToClipboard() {
        if (this.lastReportData.formatFilter === "html") {
            navigator.clipboard.write([new ClipboardItem({
                "text/plain": new Blob([this.export_data_popup_preview.innerText], {type: "text/plain"}),
                "text/html": new Blob([this.export_data_popup_preview.innerHTML], {type: "text/html"}),
              })]);
        } else {
            navigator.clipboard.writeText(this.lastReportData.resultText);
        }
        const buttonText = `<i class="material-icons">content_copy</i>`;
        this.copy_export_clipboard.innerHTML = "✅" + buttonText;
        setTimeout(() => this.copy_export_clipboard.innerHTML = buttonText, 1200);
    }
    /** detect if chatroom view
     * @return { boolean } for navigation after delete
     */
    get chatRoomView(): boolean {
        if (this.app.gameData) return true;
        return false;
    }
    /** docData to support dashboard and chatroom */
    get docData(): any {
        if (this.app.gameData) return this.app.gameData;
        else return this.documentData;
    }
    /** prompt and send title to api */
    promptForNewTitle() {
        let newTitle = prompt("Document Title", this.docData.title);
        if (newTitle !== null) {
            newTitle = newTitle.trim();
            if (!newTitle) {
                alert("no title entered");
                return;
            }
            this.docData.title = newTitle;
            this.saveDocumentOwnerOption("title");
            this.modal_document_title_display.innerHTML = BaseApp.escapeHTML(newTitle);
        }
    }
    /** prompt and send not to api */
    promptForNewNote() {
        let newNote = prompt("Reference Note", this.docData.note);
        if (newNote !== null) {
            newNote = newNote.trim();
            this.docData.note = newNote;
            this.saveDocumentOwnerOption("note");
            this.owner_note_display_div.innerHTML = BaseApp.escapeHTML(newNote);
        }
    }
    /** prompt and send token limit usage to api */
    promptForNewUsageLimit() {
        let newLimit: any = prompt("Token Usage Limit", this.documentData.tokenUsageLimit);
        if (newLimit !== null) {
            newLimit = Number(newLimit);
            if (isNaN(newLimit)) {
                alert("invalid value");
                return;
            }
            this.docData.tokenUsageLimit = newLimit;
            this.saveDocumentOwnerOption("usage");

            this.shared_usage_limit_div.innerHTML = this.documentData.tokenUsageLimit;
        }
    }
    /** */
    updateArchivedStatus() {
        this.docData.archived = this.docfield_archived_checkbox.checked;
        this.saveDocumentOwnerOption("archived");
    }
    /** send owner setting for document to api
     * @param { string } fieldKey title for title, usage for tokenUsageLimit, note for note
    */
    async saveDocumentOwnerOption(fieldKey: string) {
        const docId = this.chatDocumentId;
        const updatePacket: any = {
            gameNumber: docId,
        };

        if (fieldKey === "title") {
            updatePacket.title = this.docData.title;
        }
        if (fieldKey === "usage") {
            updatePacket.tokenUsageLimit = this.docData.tokenUsageLimit;
        }
        if (fieldKey === "note") {
            updatePacket.note = this.docData.note;
        }
        if (fieldKey === "label") {
            updatePacket.label = this.docData.label;
        }
        if (fieldKey === "archived") {
            updatePacket.archived = this.docData.archived;
        }

        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.app.basePath + "lobbyApi/games/owner/options", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(updatePacket),
        });
        const json = await fResult.json();
        if (!json.success) {
            alert("Unable to save options " + json.errorMessage);
        }
    }
    /** template as string for modal
     * @return { string } html template as string
     */
    getModalTemplate(): string {
        const exportModalTabHTML = this.getModalTabExportHTML();
        return `<div class="modal fade scrollable_modal" id="editDocumentModal" tabindex="-1" aria-labelledby="editDocumentModalLabel"
        aria-hidden="true">
        <div class="modal-dialog app_panel">
            <div class="modal-content app_panel">
                <div class="modal-header">
                    <h5 class="modal-title" id="editDocumentModalLabel">Document Options</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                        <ul class="nav nav-tabs mb-3" id="ex1" role="tablist">
                        <li class="nav-item" role="presentation">
                                <a class="nav-link active" id="export_tab_button" data-bs-toggle="tab" href="#export_tab_view"
                                    role="tab" aria-controls="export_tab_view" aria-selected="false">Export</a>
                            </li>
                            <li class="nav-item" role="presentation">
                                <a class="nav-link" id="options_tab_button" data-bs-toggle="tab"
                                    href="#options_tab_view" role="tab" aria-controls="options_tab_view"
                                    aria-selected="true">Details</a>
                            </li>
                            <li class="nav-item" role="presentation">
                                <a class="nav-link" id="owner_tab_button" data-bs-toggle="tab" href="#owner_tab_view"
                                    role="tab" aria-controls="owner_tab_view" aria-selected="false">Owner</a>
                            </li>
                        </ul>
                        <div class="tab-content">
                        <div class="tab-pane fade show active" id="export_tab_view" role="tabpanel"
                        aria-labelledby="export_tab_button">
                        ${exportModalTabHTML}
                    </div>
                        <div class="tab-pane fade" id="options_tab_view" role="tabpanel"
                        aria-labelledby="options_tab_button">
                                <button class="btn btn-secondary show_document_details_options_help"><i 
                                    class="material-icons">help</i></button>
                                <div class="shared_archived_status_wrapper"></div>
                                <div class="form-check owner_archived_input_wrapper">
                                    <label class="form-check-label">
                                        <input class="form-check-input docfield_archived_checkbox" type="checkbox" value="">
                                        Archived
                                    </label>
                                </div>
                                <hr>
                                <label class="form-label">Title</label>
                                <br>
                                <button class="btn btn-primary prompt_for_new_title" style="float:right;">Change...</button>
                                <div class="modal_document_title_display"></div>
                                <br>
                                
                                <label class="form-label">Token Usage Cap (0 for none)</label>
                                <div>
                                    <div class="shared_usage_limit_div"></div>
                                    <button class="btn btn-primary prompt_for_new_usage">Change...</button>
                                </div>
                                <hr>
                                <div style="line-height:3em;" class="template_import_options_section">
                                    <button class="btn btn-secondary modal_upload_tickets_button">Template...</button>
                                    <input class="import_upload_file" style="display:none;" type="file">
                                    &nbsp;
                                    <div class="doc_options_import_rows_preview"></div>
                                    <button class="btn btn-primary modal_send_tickets_to_api_button" 
                                                        style="visibility:hidden">Import</button>
                                    <button class="btn btn-secondary show_import_tickets_help">
                                    <i class="material-icons">help</i></button>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="owner_tab_view" role="tabpanel"
                                aria-labelledby="owner_tab_button">  
                                <div style="text-align:center">
                                <a href="#" class="code_link_href">URL</a>
                                <button class="code_link_copy btn btn-secondary"><i class="material-icons">content_copy</i>
                                    <span>url</span></button>
                            </div>                       
                                <button class="btn btn-secondary show_document_owner_options_help"><i 
                                    class="material-icons">help</i></button>

                                <label class="form-label">Labels</label>
                                    <select class="edit_options_document_labels" multiple="multiple"
                                        style="width:100%"></select>
                                <hr>
                                <label class="form-label">Reference</label>
                                <br>
                                <button class="btn btn-primary prompt_for_new_note" style="float:right;">Change...</button>
                                <div class="owner_note_display_div"></div>                      
                                <br>
                            </div>
                        </div>
                </div>
                <div class="modal-footer">
                    <button class="delete_game btn btn-secondary" data-bs-dismiss="modal">
                        Delete
                    </button>
                    <button class="leave_game btn btn-secondary" data-bs-dismiss="modal">
                        Leave
                    </button>
                    <div style="flex:1"></div>
                    <button type="button" class="btn btn-secondary modal_close_button"
                        data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>`;
    }
    /** return dialog html for document export
     * @return { string } html string
     */
    getModalTabExportHTML(): string {
        return `<div style="display:flex;flex-direction:column">
        
        <div style="text-align: center">
            <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
                <input type="radio" class="btn-check" name="tickets_filter" id="selected_filter" value="selected"
                    autocomplete="off" checked>
                <label class="btn btn-outline-primary" for="selected_filter">Selected Tickets</label>
                <input type="radio" class="btn-check" name="tickets_filter" id="all_filter" value="all" autocomplete="off">
                <label class="btn btn-outline-primary" for="all_filter">All Tickets</label>
                <button class="btn btn-secondary show_export_tickets_help"><i class="material-icons">help</i></button>
            </div>
            <br><br>
            <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
                <input type="radio" class="btn-check" name="export_format_choice" id="text_format" value="text"
                    autocomplete="off" checked>
                <label class="btn btn-outline-primary" for="text_format">Text</label>
                <input type="radio" class="btn-check" name="export_format_choice" id="html_format" value="html"
                    autocomplete="off">
                <label class="btn btn-outline-primary" for="html_format">HTML</label>
                <input type="radio" class="btn-check" name="export_format_choice" id="csv_format" value="csv"
                    autocomplete="off">
                <label class="btn btn-outline-primary" for="csv_format">CSV</label>
                <input type="radio" class="btn-check" name="export_format_choice" id="json_format" value="json"
                    autocomplete="off">
                <label class="btn btn-outline-primary" for="json_format">JSON</label>
            </div>
        </div>
        <br>
        <div class="export_data_popup_preview"></div>
        <br>
        <div class="export_bottom_bar">
            <span class="export_size"></span>&nbsp;
            <button type="button" class="btn btn-secondary copy_export_clipboard"><i class="material-icons">content_copy</i></button>
            &nbsp;
            <button type="button" class="btn btn-primary download_export_button">Download Template</button>
        </div>
    </div>`;
    }
    /** use jquery to extract label list from select2 */
    saveDocumentLabels() {
        if (this.noLabelSave) return;
        const data = window.$(".edit_options_document_labels").select2("data");
        const labels: Array<string> = [];
        data.forEach((item: any) => {
            const text = item.text.trim().substring(0, 30);
            if (text) labels.push(text);
        });

        this.docData.label = labels.join(",");
        this.saveDocumentOwnerOption("label");
    }
    /** delete game api call */
    async deleteGame() {
        if (!confirm("Are you sure you want to delete this game?")) return;

        if (!this.chatDocumentId) {
            alert("Game Number not found - error");
            return;
        }

        const body = {
            gameNumber: this.chatDocumentId,
        };
        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.app.basePath + "lobbyApi/games/delete", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const result = await fResult.json();
        if (!result.success) {
            console.log("delete error", result);
            alert("Delete failed");
            return;
        }

        if (this.chatRoomView) window.location = "/dashboard";
        this.modal_close_button.click();
    }
    /** logout api call */
    async logoutGame() {
        if (!this.chatDocumentId) {
            alert("Game Number not found - error");
            return;
        }

        const body = {
            gameNumber: this.chatDocumentId,
        };
        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.app.basePath + "lobbyApi/games/leave", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const result = await fResult.json();
        if (!result.success) {
            alert("Logout failed");
            return;
        }

        if (this.chatRoomView) window.location = "/dashboard";
        this.modal_close_button.click();
    }
    /** generate export data
     * @return { string } text for selected format and tickets
    */
    generateExportData(): any {
        const ticketsFilterSelected: any = document.querySelector(`input[name="tickets_filter"]:checked`);
        const ticketsFilter: any = ticketsFilterSelected.value;
        const formatFilterSelected: any = document.querySelector(`input[name="export_format_choice"]:checked`);
        const formatFilter: any = formatFilterSelected.value;

        if (!this.app.lastTicketsSnapshot) {
            return {
                resultText: "",
                format: "",
                fileName: "",
            };
        }

        let resultText = "";
        const tickets: Array<any> = [];
        this.app.lastTicketsSnapshot.forEach((ticket: any) => {
            if (ticketsFilter === "all" || ticket.data().includeInMessage) tickets.unshift(ticket);
        });

        let format = "";
        let fileName = "";
        if (formatFilter === "json") {
            format = "application/json";
            fileName = "export.json";
            const rows: any = [];
            tickets.forEach((ticket: any) => {
                rows.push({
                    prompt: ticket.data().message,
                    completion: this.messageForCompletion(ticket.id),
                    selected: ticket.data().includeInMessage ? "y" : "n",
                });
            });
            const jsonText = JSON.stringify(rows, null, "  ");
            resultText = jsonText;
        } else if (formatFilter === "csv") {
            format = "application/csv";
            fileName = "export.csv";
            const rows: any = [];
            tickets.forEach((ticket: any) => {
                rows.push({
                    prompt: ticket.data().message,
                    completion: this.messageForCompletion(ticket.id),
                    selected: ticket.data().includeInMessage ? "y" : "n",
                });
            });
            const csvText = window.Papa.unparse(rows);
            resultText = csvText;
        } else if (formatFilter === "text") {
            format = "plain/text";
            fileName = "report.txt";
            resultText += "Exported: " + new Date().toISOString().substring(0, 10) + "\n";
            tickets.forEach((ticket: any) => {
                const completion = this.messageForCompletion(ticket.id);
                const prompt = ticket.data().message;

                resultText += "Prompt: " + prompt + "\n";
                if (completion) resultText += "Assist: " + completion + "\n";
                resultText += "\n";
            });
        } else if (formatFilter === "html") {
            fileName = "report.html";
            format = "text/html";
            resultText += `<div class="export_date">Exported: ${new Date().toISOString().substring(0, 10)}</div>\n`;
            tickets.forEach((ticket: any) => {
                const prompt = <string>ticket.data().message;
                const completion = <string>
                    this.messageForCompletion(ticket.id);
                const selected = <string>ticket.data().includeInMessage ? "✅" : "&nbsp;";

                resultText += `<div class="ticket-item">\n`;
                resultText += `    <div class="prompt-text">${selected} ${prompt}</div>\n`;
                resultText += `    <div class="completion-text">${completion}</div>\n`;
                resultText += `</div>`;
            });
        }

        return {
            resultText,
            format,
            formatFilter,
            fileName,
        };
    }
    /** check for assist message
* @param { string } assistId ticket id to check for assist
* @return { any } message
*/
    messageForCompletion(assistId: string): string {
        try {
            const assistData: any = this.app.assistsLookup[assistId];
            if (!assistData || !assistData.assist || !assistData.assist.choices ||
                !assistData.assist.choices["0"] || !assistData.assist.choices["0"].message ||
                !assistData.assist.choices["0"].message.content) return "";
            return assistData.assist.choices["0"].message.content;
        } catch (assistError: any) {
            console.log(assistError);
            return "";
        }
    }
    /** refresh report data
     * @param { boolean } download
    */
    refreshReportData(download = false) {
        const data = this.generateExportData();
        this.lastReportData = data;
        this.export_data_popup_preview.innerHTML = data.resultText;
        this.modalContainer.classList.remove("text_preview");
        this.modalContainer.classList.remove("csv_preview");
        this.modalContainer.classList.remove("html_preview");
        this.modalContainer.classList.remove("json_preview");
        this.modalContainer.classList.add(data.formatFilter + "_preview");
        this.export_size.innerHTML = data.resultText.length;
        const selection = window.getSelection();
        selection.removeAllRanges();

        // Select paragraph
        const range = document.createRange();
        range.selectNodeContents(this.export_data_popup_preview);
        selection.addRange(range);
        this.export_data_popup_preview.focus();

        if (download) {
            const file = new File([data.resultText], data.fileName, {
                type: data.format,
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
    }
    /** download report data */
    downloadReportData() {
        this.refreshReportData(true);
    }
    /** upload report data */
    async uploadReportData() {
        try {
            const records = await ChatDocument.getImportDataFromDomFile(this.import_upload_file);

            if (records.length === 0) {
                alert("no records found");
                return;
            }

            const recordsToUpload: any = ChatDocument.processImportTicketsToUpload(records);
            const error = await ChatDocument.sendImportTicketToAPI(this.app.currentGame, recordsToUpload, this.app.basePath);
            if (error) {
                alert("Import error");
            }

            this.app.tickets_list.scrollTop = this.app.tickets_list.scrollHeight;
            setTimeout(() => this.app.tickets_list.scrollTop = this.app.tickets_list.scrollHeight, 100);
        } catch (error: any) {
            alert("Import failed");
            console.log(error);
            return;
        }

        this.app.tickets_list.scrollTop = this.app.tickets_list.scrollHeight;
        setTimeout(() => this.app.tickets_list.scrollTop = this.app.tickets_list.scrollHeight, 100);

        this.import_upload_file.value = ""; // clear input
        this.updateImportRowsDisplay();
    }
    /** populate modal fields and show
     * @param { string } chatDocumentId firestore doc id
     * @param { any } doc doc data
    */
    show(chatDocumentId: string, doc: any) {
        this.chatDocumentId = chatDocumentId;
        this.documentData = doc;
        if (doc.createUser === this.app.uid) {
            this.owner_note_display_div.innerHTML = BaseApp.escapeHTML(doc.note);
            this.modalContainer.classList.add("modal_options_owner_user");
            this.modalContainer.classList.remove("modal_options_shared_user");
        } else {
            this.modalContainer.classList.remove("modal_options_owner_user");
            this.modalContainer.classList.add("modal_options_shared_user");
        }

        this.modal_document_title_display.innerHTML = BaseApp.escapeHTML(this.documentData.title);
        this.shared_usage_limit_div.innerHTML = this.documentData.tokenUsageLimit;
        this.docfield_archived_checkbox.checked = this.documentData.archived;
        this.shared_archived_status_wrapper.innerHTML = this.documentData.archived ? "Archived" : "Active";

        if (doc.createUser === this.app.uid) {
            const queryLabelSelect2 = window.$(".edit_options_document_labels");
            this.noLabelSave = true;
            queryLabelSelect2.html("");
            queryLabelSelect2.val(null).trigger("change");
            this.noLabelSave = false;

            try {
                let labelString = doc.label;
                if (!labelString) labelString = "";
                const labelArray = labelString.split(",");
                labelArray.forEach((label: string) => {
                    if (label !== "") {
                        if (queryLabelSelect2.find("option[value='" + label + "']").length) {
                            this.noLabelSave = true;
                            queryLabelSelect2.val(label).trigger("change");
                            this.noLabelSave = false;
                        } else {
                            // Create a DOM Option and pre-select by default
                            const newOption = new Option(label, label, true, true);
                            // Append it to the select
                            this.noLabelSave = true;
                            queryLabelSelect2.append(newOption).trigger("change");
                            this.noLabelSave = false;
                        }
                    }
                });


                let profileLabelString = this.app.profile.documentLabels;
                if (!profileLabelString) profileLabelString = "";
                const profileLabelArray = profileLabelString.split(",");
                profileLabelArray.forEach((label: string) => {
                    if (label !== "" && labelArray.indexOf(label) === -1) {
                        const newOption = new Option(label, label, false, false);
                        queryLabelSelect2.append(newOption).trigger("change");
                    }
                });
            } catch (error) {
                console.log(error);
            }
        }

        if (this.code_link_href) {
            const path = window.location.href;
            this.code_link_href.setAttribute("href", path);
            this.code_link_href.innerHTML = path;
        }

        this.code_link_copy.innerHTML = `<i class="material-icons">content_copy</i> <span>Link</span>`;

        this.refreshReportData();
    }
}
