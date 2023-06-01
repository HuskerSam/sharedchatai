declare const firebase: any;
declare const window: any;

/** Base class for all pages - handles authorization and low level routing for api calls, etc */
export default class DocOptionsHelper {
    app: any = null;
    owner_note_field_edit: any = null;
    save_game_afterfeed_button: any = null;
    modal_close_button: any = null;
    modalContainer: any = null;
    copyLink: any = null;
    document_title: any = null;
    documentData: any = null;
    docfield_archived_checkbox: any = null;
    docfield_usage_limit: any = null;
    code_link_href: any;
    code_link_copy: any;
    gameid_span: any;

    export_data_popup_preview: any;
    export_size: any;
    selected_filter: any;
    all_filter: any;
    text_format: any;
    html_format: any;
    csv_format: any;
    json_format: any;
    download_export_button: any;
    upload_import_button: any;
    import_upload_file: any;
    /**
     * @param { any } app BaseApp derived application instance
     */
    constructor(app: any) {
        this.app = app;
        this.addModalToDOM();
    }
    /** instaniate and add modal #loginModal */
    addModalToDOM() {
        const html = this.getModalTemplate();
        this.modalContainer = document.createElement("div");
        this.modalContainer.innerHTML = html;
        document.body.appendChild(this.modalContainer);

        this.owner_note_field_edit = this.modalContainer.querySelector("#owner_note_field_edit");
        this.save_game_afterfeed_button = this.modalContainer.querySelector(".save_game_afterfeed_button");
        this.modal_close_button = this.modalContainer.querySelector(".modal_close_button");
        this.document_title = this.modalContainer.querySelector(".document_title");

        this.docfield_archived_checkbox = document.querySelector(".docfield_archived_checkbox");
        this.docfield_usage_limit = document.querySelector(".docfield_usage_limit");

        this.export_data_popup_preview = document.querySelector(".export_data_popup_preview");
        this.export_size = document.querySelector(".export_size");
        this.selected_filter = document.getElementById("selected_filter");
        this.all_filter = document.getElementById("all_filter");
        this.text_format = document.getElementById("text_format");
        this.html_format = document.getElementById("html_format");
        this.csv_format = document.getElementById("csv_format");
        this.json_format = document.getElementById("json_format");
        this.download_export_button = document.querySelector(".download_export_button");
        this.upload_import_button = document.querySelector(".upload_import_button");
        this.import_upload_file = document.querySelector(".import_upload_file");

        this.save_game_afterfeed_button.addEventListener("click", () => this.saveDocumentOptions());
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

        this.code_link_href = document.querySelector(".code_link_href");
        this.code_link_copy = document.querySelector(".code_link_copy");
        this.gameid_span = document.querySelector(".gameid_span");
        this.copyLink = this.modalContainer.querySelector(".code_link");

        this.selected_filter.addEventListener("click", () => this.refreshReportData());
        this.all_filter.addEventListener("click", () => this.refreshReportData());
        this.text_format.addEventListener("click", () => this.refreshReportData());
        this.html_format.addEventListener("click", () => this.refreshReportData());
        this.csv_format.addEventListener("click", () => this.refreshReportData());
        this.json_format.addEventListener("click", () => this.refreshReportData());
        this.download_export_button.addEventListener("click", () => this.downloadReportData());
        this.upload_import_button.addEventListener("click", () => this.import_upload_file.click());
        this.import_upload_file.addEventListener("change", () => this.uploadReportData());

        this.copyLink.addEventListener("click", () => this.copyGameLinkToClipboard());
    }
    /** copy game url link to clipboard
 * @param { any } btn dom control
 */
    copyGameLink() {
        navigator.clipboard.writeText(window.location.origin + "/aichat/?game=" + this.app.editedDocumentId);
        this.copyLink.innerHTML = "✅" + `<i class="material-icons">content_copy</i> <span>${this.app.editedDocumentId}</span>`;
    }
    /** send user (optional owner) settings for document to api */
    async saveDocumentOptions() {
        const docId = this.app.editedDocumentId;
        const label = this.scrapeDocumentEditLabels();
        const note = this.owner_note_field_edit.value;
        const archived = this.docfield_archived_checkbox.checked ? "1" : "0";
        const tokenUsageLimit = this.docfield_usage_limit.value;

        const body: any = {
            gameNumber: docId,
        };

        if (this.documentData.acrhived !== archived) body.archived = archived;
        if (this.documentData.tokenUsageLimit !== archived) body.tokenUsageLimit = tokenUsageLimit;
        if (this.documentData.label !== label) body.label = label;
        if (this.documentData.note !== note) body.note = note;

        if (this.document_title.value.trim() !== this.documentData.title &&
            this.document_title.value !== "") {
            body.title = this.document_title.value.trim();
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
            body: JSON.stringify(body),
        });
        const json = await fResult.json();
        if (!json.success) {
            alert("Unable to save options " + json.errorMessage);
        }
        this.modal_close_button.click();
    }
    /** template as string for modal
     * @return { string } html template as string
     */
    getModalTemplate(): string {
        const exportModalTabHTML = this.getModalTabExportHTML();
        const importModalTabHTML = this.getModalTabImportHTML();
        return `<div class="modal fade scrollable_modal" id="editDocumentModal" tabindex="-1" aria-labelledby="editDocumentModalLabel"
        aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="editDocumentModalLabel">Edit Document</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="owner_options_edit_section">
                        <ul class="nav nav-tabs mb-3" id="ex1" role="tablist">
                            <li class="nav-item" role="presentation">
                                <a class="nav-link active" id="options_tab_button" data-bs-toggle="tab" href="#options_tab_view" role="tab"
                                    aria-controls="options_tab_view" aria-selected="true">Details</a>
                            </li>
                            <li class="nav-item" role="presentation">
                                <a class="nav-link" id="export_tab_button" data-bs-toggle="tab" href="#export_tab_view" role="tab"
                                    aria-controls="export_tab_view" aria-selected="false">Export</a>
                            </li>
                            <li class="nav-item" role="presentation">
                                <a class="nav-link" id="import_tab_button" data-bs-toggle="tab" href="#import_tab_view" role="tab"
                                    aria-controls="import_tab_view" aria-selected="false">Import</a>
                            </li>
                        </ul>
                        <div class="tab-content" id="ex1-content">
                            <div class="tab-pane fade show active" id="options_tab_view" role="tabpanel"
                                aria-labelledby="options_tab_button">
                                <div class="form-floating">
                                    <textarea type="text" class="form-control document_title"
                                        placeholder="Title"></textarea>
                                    <label>Title</label>
                                </div>
                                <div style="text-align:center;">
                                    <select class="edit_options_document_labels" multiple="multiple"
                                        style="width:80%"></select>
                                </div>
                                <br>
                                <div class="form-floating" style="display:inline-block;width:80%">
                                    <input type="text" class="form-control" id="owner_note_field_edit" placeholder="Note">
                                    <label>Note</label>
                                </div>
                                <div class="form-check" style="display:inline-block;width:auto;">
                                    <label class="form-check-label">
                                        <input class="form-check-input docfield_archived_checkbox" type="checkbox" value="">
                                        Archived
                                    </label>
                                </div>
                                <br>
                                <div class="form-floating" style="display:inline-block;width:auto;">
                                    <input type="text" class="form-control docfield_usage_limit" placeholder="Usage Limit">
                                    <label>Usage Limit</label>
                                </div>
                                <button class="delete_game btn btn-secondary">
                                    Delete
                                </button>
                                <button class="leave_game btn btn-secondary">
                                    Leave
                                </button>
                                <button class="code_link game btn btn-primary"></button>
                                <br>
                                <br>
                                <div style="text-align:center">
                                    <button class="document_import_button btn btn-secondary" data-bs-toggle="modal"
                                        data-bs-target="#importModal">Import Tickets</button>
    
                                </div>
                                <br>
                                <div style="text-align: right">
                                    <span class="gameid_span"></span>
                                    <a href="#" style="display:none;" class="code_link_href">URL</a>
                                    <button class="code_link_copy game"><i class="material-icons">content_copy</i>
                                        <span>url</span></button>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="export_tab_view" role="tabpanel" aria-labelledby="export_tab_button">
                                ${exportModalTabHTML}
                            </div>
                            <div class="tab-pane fade" id="import_tab_view" role="tabpanel" aria-labelledby="import_tab_button">
                                ${importModalTabHTML}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary modal_close_button"
                        data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary save_game_afterfeed_button">Save</button>
                </div>
            </div>
        </div>
    </div>`;
    }
    /** return dialog html for document export
     * @return { string } html string
     */
    getModalTabExportHTML(): string {
        return `<div>
        <h2>Tickets:</h2>
        <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
            <input type="radio" class="btn-check" name="tickets_filter" id="selected_filter" value="selected"
                autocomplete="off" checked>
            <label class="btn btn-outline-primary" for="selected_filter">Selected</label>
            <input type="radio" class="btn-check" name="tickets_filter" id="all_filter" value="all" autocomplete="off">
            <label class="btn btn-outline-primary" for="all_filter">All</label>
        </div>
        <br>
        <br>
        Format:
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
        <br>
        Preview
        <br>
        <textarea class="export_data_popup_preview"></textarea>
        <br>
        <span class="export_size"></span> bytes
        <br>
    
        <button type="button" class="btn btn-secondary download_export_button">Download</button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
    </div>`;
    }
    /** return dialog html for document import
     * @return { string } html string
     */
    getModalTabImportHTML(): string {
        return `<div>
        <span> Format:</span>
        <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
            <input type="radio" class="btn-check" name="import_format_choice" id="import_csv_format" value="csv"
                autocomplete="off" checked>
            <label class="btn btn-outline-primary" for="import_csv_format">CSV</label>
            <input type="radio" class="btn-check" name="import_format_choice" id="import_json_format" value="json"
                autocomplete="off">
            <label class="btn btn-outline-primary" for="import_json_format">JSON</label>
        </div>
        <br>
        <input class="import_upload_file" type="file">
        <button type="button" class="btn btn-secondary upload_import_button">Import</button>
    </div>`;
    }
    /** use jquery to extract label list from select2
     * @return { string } comma delimited list of labels
      */
    scrapeDocumentEditLabels(): string {
        const data = window.$(".edit_options_document_labels").select2("data");
        const labels: Array<string> = [];
        data.forEach((item: any) => {
            if (item.text.trim()) labels.push(item.text.trim());
        });

        return labels.join(",");
    }
    /** delete game api call */
    async deleteGame() {
        if (!confirm("Are you sure you want to delete this game?")) return;

        if (!this.app.editedDocumentId) {
            alert("Game Number not found - error");
            return;
        }

        const body = {
            gameNumber: this.app.editedDocumentId,
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
        this.modal_close_button.click();
    }
    /** logout api call */
    async logoutGame() {
        if (!this.app.editedDocumentId) {
            alert("Game Number not found - error");
            return;
        }

        const body = {
            gameNumber: this.app.editedDocumentId,
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

        this.modal_close_button.click();
    }
    /** populate modal fields and show */
    show() {
        const doc = this.app.documentsLookup[this.app.editedDocumentId];
        this.documentData = doc;
        if (doc.createUser === this.app.uid) {
            (<any>document.getElementById("owner_note_field_edit")).value = doc.note;
            (<any>document.querySelector(".owner_options_edit_section")).style.display = "block";
            this.modalContainer.classList.add("feed_game_owner");
        } else {
            (<any>document.getElementById("owner_note_field_edit")).value = "Shared Document";
            (<any>document.querySelector(".owner_options_edit_section")).style.display = "none";
            this.modalContainer.classList.remove("feed_game_owner");
        }

        this.document_title.value = this.documentData.title;
        this.docfield_usage_limit.value = this.documentData.tokenUsageLimit;
        this.docfield_archived_checkbox.checked = this.documentData.archived;

        if (doc.createUser === this.app.uid) {
            const queryLabelSelect2 = window.$(".edit_options_document_labels");
            queryLabelSelect2.val(null).trigger("change");

            try {
                let labelString = doc.label;
                if (!labelString) labelString = "";
                const labelArray = labelString.split(",");
                labelArray.forEach((label: string) => {
                    if (label !== "") {
                        if (queryLabelSelect2.find("option[value='" + label + "']").length) {
                            queryLabelSelect2.val(label).trigger("change");
                        } else {
                            // Create a DOM Option and pre-select by default
                            const newOption = new Option(label, label, true, true);
                            // Append it to the select
                            queryLabelSelect2.append(newOption).trigger("change");
                        }
                    }
                });
            } catch (error) {
                console.log(error);
            }
        }

        if (this.code_link_href) {
            const path = window.location.href;
            this.code_link_href.setAttribute("href", path);
        }

        this.copyLink.innerHTML = `<i class="material-icons">content_copy</i> <span>${this.app.editedDocumentId}</span>`;
        this.copyLink.addEventListener("click", () => this.copyGameLink());

        this.refreshReportData();
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
            if (ticketsFilter === "all" || ticket.data().includeInMessage) tickets.push(ticket);
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
                    completion: this.app.messageForCompletion(ticket.id),
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
                    completion: this.app.messageForCompletion(ticket.id),
                    selected: ticket.data().includeInMessage ? "y" : "n",
                });
            });
            const csvText = window.Papa.unparse(rows);
            resultText = csvText;
        } else if (formatFilter === "text") {
            format = "plain/text";
            fileName = "report.txt";
            resultText += new Date().toString() + " summary\n";
            tickets.forEach((ticket: any) => {
                const completion = this.app.messageForCompletion(ticket.id);
                const prompt = ticket.data().message;

                resultText += "Prompt: " + prompt + "\n";
                if (completion) resultText += "Assist: " + completion + "\n";
                resultText += "\n";
            });
        } else if (formatFilter === "html") {
            fileName = "report.html";
            format = "text/html";
            resultText += `<div class="export_date">${new Date().toString()} summary</div>\n`;
            resultText += `<style>\n`;
            resultText += `.prompt-text {\n`;
            resultText += `    font-weight: bold;\n`;
            resultText += `}\n`;
            resultText += `\n`;
            resultText += `.completion-text {\n`;
            resultText += `    white-space: pre-wrap;\n`;
            resultText += `}\n`;
            resultText += `\n`;
            resultText += `</style>\n`;
            tickets.forEach((ticket: any) => {
                const prompt = <string>ticket.data().message;
                const completion = <string> this.app.messageForCompletion(ticket.id);
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
            fileName,
        };
    }
    /** refresh report data
     * @param { boolean } download
    */
    refreshReportData(download = false) {
        const data = this.generateExportData();
        this.export_data_popup_preview.innerHTML = data.resultText;
        this.export_size.innerHTML = data.resultText.length;

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
        if (!this.import_upload_file.files[0]) {
            return;
        }
        const formatFilterSelected: any = document.querySelector(`input[name="import_format_choice"]:checked`);
        const formatFilter: any = formatFilterSelected.value;

        const fileContent = await this.import_upload_file.files[0].text();

        try {
            let records: Array<any> = [];
            if (formatFilter === "json") {
                records = JSON.parse(fileContent);
            } else {
                const result = window.Papa.parse(fileContent, {
                    header: true,
                });
                console.log("Papa result", result);
                records = result.data;
            }

            for (let c = 0, l = records.length; c < l; c++) {
                const ticket: any = records[c];
                const error = await this.app.sendImportTicketToAPI({
                    prompt: ticket.prompt,
                    completion: ticket.completion,
                });
                if (error) break;
            }
        } catch (error: any) {
            alert("Import failed");
            console.log(error);
            return;
        }
    }
    /** copy game link to global clipboard */
    copyGameLinkToClipboard() {
      const path = this.code_link_href.getAttribute("href");
      navigator.clipboard.writeText(path);
    }
}
