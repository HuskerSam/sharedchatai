declare const firebase: any;
declare const window: any;
import ChatDocument from "./chatdocument.js";
import BaseApp from "./baseapp.js"; // only for escapeHTML

/** Base class for all pages - handles authorization and low level routing for api calls, etc */
export default class DocOptionsHelper {
    app: any = null;

    exportFormat = "Text";
    owner_note_display_div: any = null;
    modal_close_button: any = null;
    modalContainer: any = null;
    modal_document_title_display: any;
    modal_document_system_message_display: any;
    documentData: any = null;
    docfield_archived_checkbox: any = null;
    docfield_include_user_names_checkbox: any = null;
    shared_archived_status_wrapper: any = null;
    shared_usage_limit_div: any = null;
    copy_export_clipboard: any = null;
    session_header_link_button: any;
    wrapperClass = "";
    chatDocumentId = "";
    prompt_for_new_note: any;
    noLabelSave = false;
    lastReportData: any;
    modal_send_email_button: any;
    export_data_popup_preview: any;
    export_size: any;
    download_export_button: any;
    modal_upload_tickets_button: any;
    import_upload_file: any;
    doc_options_import_rows_preview: any;
    modal_send_tickets_to_api_button: any;
    prompt_for_new_title: any;
    prompt_for_new_system_message: any;
    prompt_for_new_usage: any;
    clone_current_chatroom_button: any;
    document_usage_stats_line: any;
    show_threshold_dialog: any;
    show_packets_dialog: any;
    doc_prompt_usage: any;
    doc_response_usage: any;
    doc_total_usage: any;
    doc_credit_usage: any;
    dialog_header_member_image: any;
    dialog_header_member_name: any;
    export_only_selected_prompts: any;
    export_format_select: any;
    export_tab_button: any;
    options_tab_button: any;
    owner_tab_button: any;
    isOwner = false;
    options_model_lock: any;
    docfield_include_prompts_in_context: any;

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
        this.modal_document_system_message_display = this.modalContainer.querySelector(".modal_document_system_message_display");

        this.doc_prompt_usage = document.querySelector(".doc_prompt_usage");
        this.doc_response_usage = document.querySelector(".doc_response_usage");
        this.doc_total_usage = document.querySelector(".doc_total_usage");
        this.doc_credit_usage = document.querySelector(".doc_credit_usage");

        this.docfield_archived_checkbox = this.modalContainer.querySelector(".docfield_archived_checkbox");
        this.docfield_archived_checkbox.addEventListener("input", () => this.updateArchivedStatus());
        this.docfield_include_user_names_checkbox = this.modalContainer.querySelector(".docfield_include_user_names_checkbox");
        this.docfield_include_user_names_checkbox.addEventListener("input", () => this.updateUserNamesStatus());

        this.shared_archived_status_wrapper = this.modalContainer.querySelector(".shared_archived_status_wrapper");
        this.shared_usage_limit_div = this.modalContainer.querySelector(".shared_usage_limit_div");
        this.prompt_for_new_title = this.modalContainer.querySelector(".prompt_for_new_title");
        this.prompt_for_new_title.addEventListener("click", () => this.promptForNewTitle());
        this.prompt_for_new_system_message = this.modalContainer.querySelector(".prompt_for_new_system_message");
        this.prompt_for_new_system_message.addEventListener("click", () => this.promptForNewSystemMessage());

        this.prompt_for_new_usage = this.modalContainer.querySelector(".prompt_for_new_usage");
        this.prompt_for_new_usage.addEventListener("click", () => this.promptForNewUsageLimit());
        this.prompt_for_new_note = this.modalContainer.querySelector(".prompt_for_new_note");
        this.prompt_for_new_note.addEventListener("click", () => this.promptForNewNote());

        this.export_data_popup_preview = this.modalContainer.querySelector(".export_data_popup_preview");
        this.export_size = this.modalContainer.querySelector(".export_size");

        this.export_format_select = this.modalContainer.querySelector(".export_format_select");
        this.export_format_select.addEventListener("input", () => {
            this.exportFormat = this.export_format_select.value;
            this.refreshReportData();
            this.app.saveProfileField("optionsDialogExportFormat", this.exportFormat);
        });

        this.download_export_button = this.modalContainer.querySelector(".download_export_button");
        this.modal_upload_tickets_button = this.modalContainer.querySelector(".modal_upload_tickets_button");
        this.import_upload_file = this.modalContainer.querySelector(".import_upload_file");
        this.copy_export_clipboard = this.modalContainer.querySelector(".copy_export_clipboard");
        this.doc_options_import_rows_preview = this.modalContainer.querySelector(".doc_options_import_rows_preview");

        this.modal_send_tickets_to_api_button = this.modalContainer.querySelector(".modal_send_tickets_to_api_button");
        this.modal_send_tickets_to_api_button.addEventListener("click", () => this.uploadReportData());

        this.clone_current_chatroom_button = this.modalContainer.querySelector(".clone_current_chatroom_button");
        this.clone_current_chatroom_button.addEventListener("click", async (event: any) => {
            event.stopPropagation();
            event.preventDefault();
            this.cloneDocument();
        });

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
        const field: any = document.body.querySelector("#owner_tab_view .select2-search__field");
        field.addEventListener("keydown", (event: any) => {
            if (event.key === ",") {
                event.preventDefault();
                event.stopPropagation();
            }
        });

        this.session_header_link_button = document.querySelector(".session_header_link_button");

        this.export_only_selected_prompts = this.modalContainer.querySelector(".export_only_selected_prompts");
        this.export_only_selected_prompts.addEventListener("input", () => this.refreshReportData());

        this.download_export_button.addEventListener("click", () => this.downloadReportData());
        this.modal_upload_tickets_button.addEventListener("click", () => this.import_upload_file.click());
        this.import_upload_file.addEventListener("change", () => this.updateImportRowsDisplay());
        this.copy_export_clipboard.addEventListener("click", () => this.copyExportToClipboard());

        this.show_threshold_dialog = this.modalContainer.querySelector(".show_threshold_dialog");
        this.show_threshold_dialog.addEventListener("click", () => {
            this.modal_close_button.click();
            this.app.showOverthresholdToSendModal();
        });

        this.session_header_link_button.addEventListener("click", () =>
            BaseApp.copyGameLink(this.chatDocumentId, this.session_header_link_button,
                `<i class="material-icons">settings</i>`));

        this.show_packets_dialog = this.modalContainer.querySelector(".show_packets_dialog");
        this.show_packets_dialog.addEventListener("click", () => this.showPacketsDialog());

        this.dialog_header_member_image = this.modalContainer.querySelector(".dialog_header_member_image");
        this.dialog_header_member_name = this.modalContainer.querySelector(".dialog_header_member_name");

        this.modal_send_email_button = this.modalContainer.querySelector(".modal_send_email_button");

        this.export_tab_button = this.modalContainer.querySelector("#export_tab_button");
        this.export_tab_button.addEventListener("click", () => this.app.saveProfileField("optionsDialogTabIndex", 0));
        this.options_tab_button = this.modalContainer.querySelector("#options_tab_button");
        this.options_tab_button.addEventListener("click", () => this.app.saveProfileField("optionsDialogTabIndex", 1));
        this.owner_tab_button = this.modalContainer.querySelector("#owner_tab_button");
        this.owner_tab_button.addEventListener("click", () => this.app.saveProfileField("optionsDialogTabIndex", 2));

        this.options_model_lock = this.modalContainer.querySelector(".options_model_lock");
        this.options_model_lock.addEventListener("input", () => this.updateModelLockStatus());

        this.docfield_include_prompts_in_context = this.modalContainer.querySelector(".docfield_include_prompts_in_context");
        this.docfield_include_prompts_in_context.addEventListener("input", () => this.updateIncludePrompts());
    }
    /** */
    async updateIncludePrompts() {
        this.app.saveDocumentOption(this.chatDocumentId, "includePromptsInContext", this.docfield_include_prompts_in_context.checked);
    }
    /** */
    async updateModelLockStatus() {
        this.docData.model_lock = this.options_model_lock.checked;
        this.app.saveDocumentOwnerOption(this.chatDocumentId, "model_lock", this.docData);
    }
    /** */
    async cloneDocument() {
        const exportData = ChatDocument.generateExportData(this.docData, this.app.lastTicketsSnapshot,
            this.app.assistsLookup, true, "JSON");
        const templateData = JSON.parse(exportData.resultText);
        let fileName = this.docData.title;
        if (!fileName) fileName = "Cloned";
        const file = new File([JSON.stringify(templateData)], fileName, {
            type: "application/json",
        });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        this.app.documentCreate.create_modal_template_file.files = transfer.files;
        const templateRows = await this.app.documentCreate.updateParsedFileStatus();
        if (!templateRows || templateRows.length === 0) {
            this.app.documentCreate.create_modal_template_file.value = "";
        }
        this.app.documentCreate.create_modal_title_field.value = fileName;
        this.app.documentCreate.show();
    }
    /** */
    async showPacketsDialog() {
        const packets = await firebase.firestore().collection(`Games/${this.chatDocumentId}/packets`)
            .orderBy("submitted", "desc").limit(200).get();
        const lookup: any = {};
        packets.forEach((doc: any) => {
            lookup[doc.id] = doc.data();
        });
        const displayString = JSON.stringify(lookup, null, "\t");
        navigator.clipboard.writeText(displayString);
        this.show_packets_dialog.innerHTML = `<i class="material-icons copy_green">done</i>
            <i class="material-icons">content_copy</i>Packets`;
        setTimeout(() => this.show_packets_dialog.innerHTML = `<i class="material-icons">content_copy</i>Packets`, 1200);
    }
    /** */
    async updateImportRowsDisplay() {
        const records: any = await ChatDocument.getImportDataFromDomFile(this.import_upload_file);
        this.doc_options_import_rows_preview.innerHTML = records.length + " rows";
        if (records.length > 0) this.modal_send_tickets_to_api_button.style.display = "inline-block";
        else this.modal_send_tickets_to_api_button.style.display = "none";
    }
    /** copy export text area to clipboard */
    copyExportToClipboard() {
        if (this.lastReportData.fileFormat === "HTML") {
            navigator.clipboard.write([new ClipboardItem({
                "text/plain": new Blob([this.export_data_popup_preview.innerText], {
                    type: "text/plain",
                }),
                "text/html": new Blob([this.export_data_popup_preview.innerHTML], {
                    type: "text/html",
                }),
            })]);
        } else {
            navigator.clipboard.writeText(this.lastReportData.resultText);
        }
        const buttonText = `<span class="material-icons">content_copy</span>`;
        this.copy_export_clipboard.innerHTML = `<i class="material-icons copy_green">done</i>` + buttonText;
        setTimeout(() => this.copy_export_clipboard.innerHTML = buttonText, 1200);
    }
    /** docData to support dashboard and chatroom */
    get docData(): any {
        if (this.app.sessionDocumentData) return this.app.sessionDocumentData;
        else return this.documentData;
    }
    /** */
    promptForNewSystemMessage() {
        if (!this.docData.systemMessage === undefined) this.docData.systemMessage = "";
        let newMessage = prompt("System Message", this.docData.systemMessage);
        if (newMessage !== null) {
            newMessage = newMessage.trim();
            this.docData.systemMessage = newMessage;
            this.app.saveDocumentOption(this.chatDocumentId, "systemMessage", newMessage);
            this.modal_document_system_message_display.innerHTML = BaseApp.escapeHTML(newMessage);
        }
    }
    /** prompt and send title to api */
    promptForNewTitle() {
        let newTitle = prompt("Document Title", this.docData.title);
        if (newTitle !== null) {
            newTitle = newTitle.trim();
            this.docData.title = newTitle.substring(0, 300);
            this.app.saveDocumentOwnerOption(this.chatDocumentId, "title", this.docData);
            this.paintDocumentData();
        }
    }
    /** prompt and send not to api */
    promptForNewNote() {
        let newNote = prompt("Owner Note", this.docData.note);
        if (newNote !== null) {
            newNote = newNote.trim();
            this.docData.note = newNote;
            this.app.saveDocumentOwnerOption(this.chatDocumentId, "note", this.docData);
            this.paintDocumentData();
        }
    }
    /** prompt and send token limit usage to api */
    promptForNewUsageLimit() {
        let newLimit: any = prompt("Token Usage Limit", this.docData.creditUsageLimit);
        if (newLimit !== null) {
            newLimit = Number(newLimit);
            if (isNaN(newLimit)) {
                alert("invalid value");
                return;
            }
            this.docData.creditUsageLimit = newLimit;
            this.app.saveDocumentOwnerOption(this.chatDocumentId, "usage", this.docData);

            this.paintDocumentData();
        }
    }
    /** */
    updateUserNamesStatus() {
        this.app.saveDocumentOption(this.chatDocumentId, "includeUserNames",
            this.docfield_include_user_names_checkbox.checked);
    }
    /** */
    updateArchivedStatus() {
        this.docData.archived = this.docfield_archived_checkbox.checked;
        this.app.saveDocumentOwnerOption(this.chatDocumentId, "archived", this.docData);
    }
    /** template as string for modal
     * @return { string } html template as string
     */
    getModalTemplate(): string {
        return `<div class="modal fade scrollable_modal" id="editDocumentModal" tabindex="-1" aria-labelledby="editDocumentModalLabel"
        aria-hidden="true">
        <div class="modal-dialog app_panel modal-lg">
            <div class="modal-content app_panel">
                <div class="modal-header">
                    <h5 class="modal-title" id="editDocumentModalLabel">
                        <button class="session_header_link_button btn btn-secondary"><i class="material-icons">settings</i></button>
                        <span class="member_profile_image dialog_header_member_image"></span>
                        <span class="member_profile_name dialog_header_member_name"></span>
                    </h5>
                    <a class="btn btn-secondary show_export_tickets_help" href="/help/#options" target="help">
                        <i class="material-icons">help_outline</i>
                    </a>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" style="display:flex;flex-direction:column">
                    <ul class="nav nav-tabs mb-3" role="tablist">
                        <li class="nav-item" role="presentation">
                            <a class="nav-link" id="export_tab_button" data-bs-toggle="tab" href="#export_tab_view"
                                role="tab" aria-controls="export_tab_view" aria-selected="false">Export</a>
                        </li>
                        <li class="nav-item" role="presentation">
                            <a class="nav-link active" id="options_tab_button" data-bs-toggle="tab" href="#options_tab_view"
                                role="tab" aria-controls="options_tab_view" aria-selected="true">Options</a>
                        </li>
                        <li class="nav-item" role="presentation">
                            <a class="nav-link" id="owner_tab_button" data-bs-toggle="tab" href="#owner_tab_view" role="tab"
                                aria-controls="owner_tab_view" aria-selected="false">Owner</a>
                        </li>
                    </ul>
                    <div class="tab-content" style="overflow:hidden;display:flex;">
                        <div class="tab-pane fade" id="export_tab_view" role="tabpanel"
                            style="flex-direction:column;overflow:hidden;" aria-labelledby="export_tab_button">
                            <div style="text-align:left;line-height: 3em">
                                <select class="export_format_select form-select form-select-lg hover_yellow">
                                    <option>Text</option>
                                    <option>HTML</option>
                                    <option>CSV</option>
                                    <option>JSON</option>
                                </select>
                                &nbsp;
                                <div class="form-check" style="margin-bottom: 8px;">
                                    <label class="form-check-label">
                                        <input class="form-check-input export_only_selected_prompts" type="checkbox">
                                        Selected Only
                                    </label>
                                </div>
                            </div>
                            <div class="export_data_popup_preview"></div>
                            <div class="export_bottom_bar">
                                <span class="export_size"></span>
                                &nbsp;
                                <button type="button" class="btn btn-primary download_export_button">
                                    <i class="material-icons">download</i>    
                                    Download</button>
                                <button type="button" class="btn btn-secondary copy_export_clipboard"><span
                                        class="material-icons">content_copy</span></button>
                            </div>
                        </div>
                        <div class="tab-pane fade show active" id="options_tab_view" role="tabpanel"
                            aria-labelledby="options_tab_button" style="padding-left:4px;">
                            <div style="padding-bottom: 8px;">
                                <label class="form-label">Title</label>
                                <br>
                                <button class="btn btn-secondary prompt_for_new_title">
                                    <i class="material-icons">edit</i></button>
                                <div class="modal_document_title_display"></div>
                            </div>
                            <hr>
                            <div style="padding-bottom: 8px;">
                                <label class="form-label">System Message</label>
                                <br>
                                <button class="btn btn-secondary prompt_for_new_system_message">
                                    <i class="material-icons">edit</i></button>
                                <div class="modal_document_system_message_display"></div>
                            </div>
                            <hr>
                            <div style="line-height:3.5em;" class="template_import_options_section">
                                <button class="btn btn-secondary modal_upload_tickets_button">
                                <i class="material-icons">upload_file</i>
                                Upload
                                </button>
                                <input class="import_upload_file" style="display:none;" type="file" accept=".json,.csv">
                                &nbsp; &nbsp;
                                <div class="doc_options_import_rows_preview"></div>
                                <br>
                                <button class="btn btn-primary modal_send_tickets_to_api_button"
                                    style="display: none;float: right;">Append Session</button>
                                <div style="clear:both"></div>
                                <hr>
                            </div>
                            <div>
                                <div style="float:left">
                                    <div class="shared_archived_status_wrapper"></div>
                                    <div class="form-check owner_archived_input_wrapper">
                                        <label class="form-check-label">
                                            <input class="form-check-input docfield_archived_checkbox" type="checkbox" value="">
                                            Archived
                                        </label>
                                        <br>
                                    </div>
                                    <br>
                                    <button class="clone_current_chatroom_button btn-125 btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="material-icons">import_export</i>
                                        Clone
                                </button>
                                </div>
                                <div style="float:right;line-height: 3em;text-align: right;">
                                    <button class="btn btn-secondary btn-125 show_threshold_dialog">
                                        <i class="material-icons">query_stats</i>
                                        Threshold
                                    </button>
                                    <br>
                                    <button class="btn btn-125 btn-secondary show_packets_dialog">
                                        <i class="material-icons">content_copy</i>
                                    Packets
                                    </button>
                                </div>
                                <div style="clear:both;"></div>
                            </div>
                            <hr>
                            <div>
                                <div class="form-check">
                                    <label class="form-check-label">
                                    <input class="form-check-input docfield_include_prompts_in_context" type="checkbox" value="">
                                        Include prompts in context
                                    </label>
                                    <br>
                                    <label class="form-check-label">
                                        <input class="form-check-input docfield_include_user_names_checkbox" type="checkbox" value="">
                                        Include user id in prompts
                                    </label>
                                    <br>
                                </div>                            
                            </div>
                        </div>
                        <div class="tab-pane fade" id="owner_tab_view" role="tabpanel" aria-labelledby="owner_tab_button">
                            <label class="form-label">Labels</label>
                            <select class="edit_options_document_labels" multiple="multiple" style="width:95%"></select>
                            <hr>
                            <label class="form-check-label options_model_lock_wrapper">
                                <input class="form-check-input options_model_lock" type="checkbox" value="">
                                Lock LLM Model from changes
                            </label>   
                            <hr>
                            <label class="form-label">Owner Note</label>
                            <br>
                            <button class="btn btn-secondary prompt_for_new_note" 
                                style="float:right;margin-bottom:16px;">
                                <i class="material-icons">edit</i>
                            </button>
                            <div class="owner_note_display_div"></div>
                            <br>
                            <hr>
                            <label class="form-label">Usage Cap (credits)</label>
                            <br>
                            <div class="token_usage_document_limit_header">
                                <span class="shared_usage_limit_div"></span>
                                <button class="btn btn-secondary prompt_for_new_usage">
                                    <i class="material-icons">edit</i>
                                </button>
                            </div>
                            <table class="document_usage_stats_line number">
                                <tr>
                                    <td>Prompt</td>
                                    <td class="doc_prompt_usage"></td>
                                </tr>
                                <tr>
                                    <td>Response</td>
                                    <td class="doc_response_usage"></td>
                                </tr>
                                <tr>
                                    <td>Total</td>
                                    <td class="doc_total_usage"></td>
                                </tr>
                                <tr>
                                    <td>Credits</td>
                                    <td class="doc_credit_usage"></td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="delete_game btn btn-secondary">
                    <i class="material-icons">delete_forever</i>
                        Delete
                    </button>
                    <button class="leave_game btn btn-secondary">
                    <i class="material-icons">logout</i>Leave
                    </button>
                    <div style="flex:1"></div>
                    <a type="button" class="btn btn-secondary modal_send_email_button" target="_blank" style="display:none;">
                        <i class="material-icons">email</i>
                        Send
                    </a>                  
                    <button type="button" class="btn btn-secondary modal_close_button" data-bs-dismiss="modal">
                        <i class="material-icons">cancel</i>
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    }
    /** use jquery to extract label list from select2 */
    saveDocumentLabels() {
        if (this.noLabelSave) return;
        const data = window.$(".edit_options_document_labels").select2("data");
        const labels: Array<string> = [];
        data.forEach((item: any) => {
            const text = item.text.trim().replaceAll(",", "").substring(0, 30);
            if (text) labels.push(text);
        });

        const newLabel = labels.join(",");
        if (newLabel !== this.docData.label) {
            this.docData.label = newLabel;
            this.app.saveDocumentOwnerOption(this.chatDocumentId, "label", this.docData);
        }
    }
    /** delete game api call
     * @return { Promise<boolean> } true if deleted
    */
    async deleteGame(): Promise<boolean> {
        if (!confirm("Delete this session?")) return false;

        if (!this.chatDocumentId) {
            alert("Session not found - error");
            return false;
        }
        const body = {
            gameNumber: this.chatDocumentId,
        };
        const token = await firebase.auth().currentUser.getIdToken();
        this.app.sessionDeleting = true;

        if (this.app.isSessionApp) window.location = "/";
        this.modal_close_button.click();

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
            return false;
        }

        return true;
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
        this.app.sessionDeleting = true;
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

        if (this.app.isSessionApp) window.location = "/";
        this.modal_close_button.click();
    }
    /** refresh report data
     * @param { boolean } download
    */
    refreshReportData(download = false) {
        const data = ChatDocument.generateExportData(this.docData, this.app.lastTicketsSnapshot,
            this.app.assistsLookup, !this.export_only_selected_prompts.checked, this.exportFormat);
        this.lastReportData = data;
        this.export_data_popup_preview.innerHTML = data.displayText;
        this.modalContainer.classList.remove("text_preview");
        this.modalContainer.classList.remove("csv_preview");
        this.modalContainer.classList.remove("html_preview");
        this.modalContainer.classList.remove("json_preview");

        const parts = data.format.split("/");
        const format = parts[1];
        this.modalContainer.classList.add(format + "_preview");
        this.export_size.innerHTML = data.resultText.trim().length + " characters";

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
        this.modal_close_button.click();
        try {
            const records = await ChatDocument.getImportDataFromDomFile(this.import_upload_file);

            if (records.length === 0) {
                alert("no records found");
                return;
            }

            const uploadResults = ChatDocument.processImportTicketsToUpload(records);
            if (uploadResults.systemMessage.trim()) {
                this.app.saveDocumentOption(this.chatDocumentId, "systemMessage", uploadResults.systemMessage.trim());
            }
            const error = await ChatDocument.sendImportTicketToAPI(this.chatDocumentId, uploadResults.recordsToUpload, this.app.basePath);
            if (error) {
                alert("Import error");
            }

            if (this.app.tickets_list) {
                this.app.tickets_list.scrollTop = this.app.tickets_list.scrollHeight;
                setTimeout(() => this.app.tickets_list.scrollTop = this.app.tickets_list.scrollHeight, 100);
            }
        } catch (error: any) {
            alert("Import failed");
            console.log(error);
            return;
        }

        if (this.app.tickets_list) {
            this.app.tickets_list.scrollTop = this.app.tickets_list.scrollHeight;
            setTimeout(() => this.app.tickets_list.scrollTop = this.app.tickets_list.scrollHeight, 100);
        }

        this.import_upload_file.value = ""; // clear input
        this.updateImportRowsDisplay();
    }
    /** paint document data */
    paintDocumentData() {
        this.doc_prompt_usage.innerHTML = BaseApp.numberWithCommas(this.docData.promptTokens);
        this.doc_response_usage.innerHTML = BaseApp.numberWithCommas(this.docData.completionTokens);
        this.doc_total_usage.innerHTML = BaseApp.numberWithCommas(this.docData.totalTokens);
        this.doc_credit_usage.innerHTML = BaseApp.numberWithCommas(this.docData.creditUsage, 2);

        this.modal_document_title_display.innerHTML = BaseApp.escapeHTML(this.docData.title);

        if (this.docData.systemMessage === undefined) this.docData.systemMessage = "";
        this.modal_document_system_message_display.innerHTML = BaseApp.escapeHTML(this.docData.systemMessage);

        const sharedStatus = ChatDocument.getDocumentSharedStatus(this.docData, this.app.uid);
        this.session_header_link_button.classList.remove("shared_status_not");
        this.session_header_link_button.classList.remove("shared_status_withusers");
        this.session_header_link_button.classList.remove("shared_status_withothers");

        if (sharedStatus === 0) this.session_header_link_button.classList.add("shared_status_not");
        if (sharedStatus === 1) this.session_header_link_button.classList.add("shared_status_withusers");
        if (sharedStatus === 2) this.session_header_link_button.classList.add("shared_status_withothers");

        let sharedLimit = "none";
        let creditLimit = Number(this.docData.creditUsageLimit);
        if (isNaN(creditLimit)) creditLimit = 0;
        if (creditLimit !== 0) sharedLimit = BaseApp.numberWithCommas(creditLimit);
        this.shared_usage_limit_div.innerHTML = sharedLimit;
        this.docfield_archived_checkbox.checked = this.docData.archived;
        this.docfield_include_user_names_checkbox.checked = this.docData.includeUserNames;
        this.docfield_include_prompts_in_context.checked = this.docData.includePromptsInContext;

        this.shared_archived_status_wrapper.innerHTML = this.docData.archived ? "Archived" : "Active";

        const ownerNote = (this.docData.createUser === this.app.uid) ? this.docData.note : "";
        this.owner_note_display_div.innerHTML = BaseApp.escapeHTML(ownerNote);
        const ownerMeta = this.app.userMetaFromDocument(this.docData.createUser, this.chatDocumentId);
        const ownerDescription = BaseApp.escapeHTML(ownerMeta.name);
        const displayName = BaseApp.escapeHTML(this.app.userMetaFromDocument(this.app.uid).name);

        const subject = encodeURIComponent(`${displayName} invited you to a Unacog Session`);
        const body = encodeURIComponent(`${this.docData.title}

Use this link to join - https://unacog.com/session/${this.chatDocumentId}

Session hosted by: ${ownerDescription}

feedback: support@unacog.com`);
        const emailTarget = (BaseApp.validateEmail(ownerNote) ? ownerNote : "");
        this.modal_send_email_button.setAttribute("href", `mailto:${emailTarget}?subject=${subject}&body=${body}`);

        this.options_model_lock.checked = this.docData.model_lock;
    }
    /** populate modal fields and show
     * @param { string } chatDocumentId firestore doc id
     * @param { any } doc doc data
    */
    show(chatDocumentId: string, doc: any) {
        this.chatDocumentId = chatDocumentId;
        this.documentData = doc;
        this.isOwner = doc.createUser === this.app.uid;
        if (this.isOwner) {
            this.modalContainer.classList.add("modal_options_owner_user");
            this.modalContainer.classList.remove("modal_options_shared_user");
        } else {
            this.modalContainer.classList.remove("modal_options_owner_user");
            this.modalContainer.classList.add("modal_options_shared_user");
        }

        if (this.isOwner) {
            const queryLabelSelect2 = window.$(".edit_options_document_labels");
            this.noLabelSave = true;
            queryLabelSelect2.html("");
            queryLabelSelect2.val(null).trigger("change");

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
                this.noLabelSave = false;
                console.log(error);
            }
            this.noLabelSave = false;
        }
        this.app.sessionDeleting = false;
        if (this.app.profile.optionsDialogExportFormat) {
            this.export_format_select.value = this.app.profile.optionsDialogExportFormat;
        }

        this.dialog_header_member_image.setAttribute("uid", this.docData.createUser);
        this.dialog_header_member_name.setAttribute("uid", this.docData.createUser);
        this.app.updateUserNamesImages();
        this.paintDocumentData();
        this.exportFormat = this.export_format_select.value;
        this.refreshReportData();

        if (this.app.profile.optionsDialogTabIndex === 0) {
            this.export_tab_button.click();
        } else if (this.app.profile.optionsDialogTabIndex === 1) {
            this.options_tab_button.click();
        } else if (this.app.profile.optionsDialogTabIndex === 2) {
            if (this.isOwner) this.owner_tab_button.click();
            else this.export_tab_button.click();
        }
        const modal = new window.bootstrap.Modal("#editDocumentModal", {});
        modal.show();
    }
}
