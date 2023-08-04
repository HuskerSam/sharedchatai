import BaseApp from "./baseapp.js";
import ChatDocument from "./chatdocument.js";
import Utility from "./utility.js";
declare const firebase: any;
declare const window: any;

/** Base class for all pages - handles authorization and low level routing for api calls, etc */
export default class DocCreateHelper {
  app: any = null;
  modal_close_button: any;
  modalContainer: any;
  create_game_afterfeed_button: any;
  create_bulk_sessions_button: any;
  create_modal_note_field: any;
  creatingNewRecord = false;
  create_modal_title_field: any;
  create_modal_prompt_field: any;
  system_message_field: any;
  document_usage_cap_field: any;
  create_modal_template_file: any;
  modal_create_template_tickets_button: any;
  create_modal_users_file: any;
  modal_create_users_list_button: any;
  parsed_file_status: any;
  parsed_file_name: any;
  parsed_list_file_status: any;
  parsed_list_file_name: any;
  createDocumentModal: any;
  add_date_as_label_button: any;
  insert_todaylabel_default_checkbox: any;
  advanced_create_options: any;
  basic_create_options: any;
  template_create_options: any;
  bulk_create_options: any;
  preview_create_template: any;
  preview_bulk_template: any;
  default_template_button: any;
  bulk_email_template_field: any;
  bulk_email_subject_field: any;

  /**
   * @param { any } app BaseApp derived application instance
   */
  constructor(app: any) {
    this.app = app;
    const html = this.getModalTemplate();
    this.modalContainer = document.createElement("div");
    this.modalContainer.innerHTML = html;
    document.body.appendChild(this.modalContainer);
    this.modalContainer.children[0].addEventListener("shown.bs.modal", () => {
      this.create_modal_prompt_field.focus();
    });

    this.create_modal_note_field = this.modalContainer.querySelector(".create_modal_note_field");
    this.createDocumentModal = this.modalContainer.querySelector("#createDocumentModal");
    this.create_modal_title_field = this.modalContainer.querySelector(".create_modal_title_field");
    this.create_modal_prompt_field = this.modalContainer.querySelector(".create_modal_prompt_field");
    this.create_modal_prompt_field.addEventListener("keydown", (e: any) => {
      if (e.key === "Enter" && e.shiftKey === false) {
        e.preventDefault();
        e.stopPropagation();
        this.createNewGame();
      }
    });
    this.system_message_field = this.modalContainer.querySelector(".system_message_field");
    this.document_usage_cap_field = this.modalContainer.querySelector(".document_usage_cap_field");
    this.modal_create_users_list_button = this.modalContainer.querySelector(".modal_create_users_list_button");
    this.create_modal_users_file = this.modalContainer.querySelector(".create_modal_users_file");
    this.modal_create_users_list_button.addEventListener("click", () => this.create_modal_users_file.click());
    this.modal_create_template_tickets_button = this.modalContainer.querySelector(".modal_create_template_tickets_button");
    this.modal_create_template_tickets_button.addEventListener("click", () => this.create_modal_template_file.click());
    this.parsed_file_status = this.modalContainer.querySelector(".parsed_file_status");
    this.parsed_file_name = this.modalContainer.querySelector(".parsed_file_name");
    this.parsed_list_file_status = this.modalContainer.querySelector(".parsed_list_file_status");
    this.parsed_list_file_name = this.modalContainer.querySelector(".parsed_list_file_name");

    this.insert_todaylabel_default_checkbox = this.modalContainer.querySelector(".insert_todaylabel_default_checkbox");
    this.insert_todaylabel_default_checkbox.addEventListener("input", () => {
      const b = this.insert_todaylabel_default_checkbox.checked;
      this.app.saveProfileField("insertTodayAsLabel", b);
      if (b) this.addTodayAsLabel();
    });

    this.create_modal_template_file = this.modalContainer.querySelector(".create_modal_template_file");
    this.create_modal_template_file.addEventListener("change", () => this.updateParsedFileStatus());
    this.create_modal_users_file = this.modalContainer.querySelector(".create_modal_users_file");
    this.create_modal_users_file.addEventListener("change", () => this.updateUsersListFile());
    this.create_game_afterfeed_button = this.modalContainer.querySelector(".create_game_afterfeed_button");
    this.create_game_afterfeed_button.addEventListener("click", () => this.createNewGame());

    this.create_bulk_sessions_button = this.modalContainer.querySelector(".create_bulk_sessions_button");
    this.create_bulk_sessions_button.addEventListener("click", () => this.createBulkSessions());

    this.preview_create_template = this.modalContainer.querySelector(".preview_create_template");
    this.preview_bulk_template = this.modalContainer.querySelector(".preview_bulk_template");
    this.add_date_as_label_button = this.modalContainer.querySelector(".add_date_as_label_button");

    // this.add_date_as_label_button.innerHTML = this.getLocal8DigitDate();
    this.add_date_as_label_button.addEventListener("click", () => this.addTodayAsLabel());

    this.modal_close_button = this.modalContainer.querySelector(".modal_close_button");

    this.advanced_create_options = this.modalContainer.querySelector("#advanced_create_options");
    this.advanced_create_options.addEventListener("click", () => this.tabChangeHandler(1));
    this.basic_create_options = this.modalContainer.querySelector("#basic_create_options");
    this.basic_create_options.addEventListener("click", () => this.tabChangeHandler(0));
    this.template_create_options = this.modalContainer.querySelector("#template_create_options");
    this.template_create_options.addEventListener("click", () => this.tabChangeHandler(2));
    this.bulk_create_options = this.modalContainer.querySelector("#bulk_create_options");
    this.bulk_create_options.addEventListener("click", () => this.tabChangeHandler(3));

    window.$(".create_document_label_options").select2({
      tags: true,
      placeHolder: "Add labels...",
    });

    this.bulk_email_template_field = this.modalContainer.querySelector(".bulk_email_template_field");
    this.bulk_email_subject_field = this.modalContainer.querySelector(".bulk_email_subject_field");
    this.default_template_button = this.modalContainer.querySelector(".default_template_button");
    this.default_template_button.addEventListener("click", () => this.setDefaultEmailTemplate());
  }
  /**
   * @param { number } tabIndex
   * @param { boolean } save defaults to true
   */
  tabChangeHandler(tabIndex: number, save = true) {
    if (save) this.app.saveProfileField("createDialogTabIndex", tabIndex);
    for (let c = 0, l = 10; c < l; c++) document.body.classList.remove("modal_tab_selected_" + c);
    document.body.classList.add("modal_tab_selected_" + tabIndex);
  }
  /** */
  createBulkSessions() {

  }
  /** */
  setDefaultEmailTemplate() {
    this.bulk_email_template_field.value = ChatDocument.bulkEmailBodyTemplate;
    this.bulk_email_subject_field.value = ChatDocument.bulkEmailSubjectTemplate;
  }
  /** */
  updateBulkEmailTemplate() {
    let body = this.app.profile.bulkEmailBodyTemplate;
    let subject = this.app.profile.bulkEmailSubjectTemplate;

    if (!body) body = ChatDocument.bulkEmailBodyTemplate;
    if (!subject) subject = ChatDocument.bulkEmailSubjectTemplate;

    this.bulk_email_template_field.value = body;
    this.bulk_email_subject_field.value = subject;
  }
  /**
   * @param { string } d isostring of a date, default today
   * @return { string } 8 digit local date
  */
  getLocal8DigitDate(d: string = new Date().toISOString()): string {
    const localISOString = BaseApp.isoToLocal(d).toISOString();
    const year = localISOString.substring(2, 4);
    const mon = localISOString.substring(5, 7);
    const day = localISOString.substring(8, 10);
    return mon + "/" + day + "/" + year;
  }
  /** template as string for modal
   * @return { string } html template as string
   */
  getModalTemplate(): string {
    return `<div class="modal fade" id="createDocumentModal" tabindex="-1" aria-labelledby="createDocumentModalLabel"
    aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content app_panel">
            <div class="modal-header" style="display:flex;">
                <h5 class="modal-title" id="createDocumentModalLabel" style="flex:1;display:flex;">
                    <span class="dialog_header_icon"><i class="material-icons">add</i></span>
                    <span style="flex:1">
                        New Session
                    </span>
                </h5>
                <a class="btn btn-secondary show_create_dialog_help" href="/help/#create" target="help"><i
                        class="material-icons">help_outline</i></a>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <ul class="nav nav-tabs mb-3" id="ex1" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active" id="basic_create_options" data-bs-toggle="tab"
                            href="#basic_create_options_view" role="tab" aria-controls="basic_create_options_view"
                            aria-selected="false">Prompt</a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="advanced_create_options" data-bs-toggle="tab"
                            href="#advanced_create_options_view" role="tab" aria-controls="advanced_create_options_view"
                            aria-selected="true">Options</a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="template_create_options" data-bs-toggle="tab"
                            href="#template_create_options_view" role="tab" aria-controls="template_create_options_view"
                            aria-selected="true">Template</a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="bulk_create_options" data-bs-toggle="tab"
                            href="#bulk_create_options_view" role="tab" aria-controls="bulk_create_options_view"
                            aria-selected="true">Bulk</a>
                    </li>
                </ul>
                <div class="tab-content">
                    <div class="tab-pane fade show active" id="basic_create_options_view" role="tabpanel"
                        aria-labelledby="basic_create_options">
                      <label class="form-label">
                          First Prompt (Enter to run)
                      </label>
                      <br>
                      <textarea class="form-control create_modal_prompt_field"
                          placeholder="optional"></textarea>
                      <div style="position:relative;margin-top: 12px;">
                          <button class="btn btn-secondary add_date_as_label_button">Add Today</button>
                          <input class="form-check-input insert_todaylabel_default_checkbox" type="checkbox">
                          <label class="form-label labels_label">Labels</label>
                          <div style="text-align:center;margin-left: -3px;padding-right: 3px;">
                            <select class="create_document_label_options" multiple="multiple"
                                style="width:100%"></select>
                          </div>
                      </div>
                    </div>
                    <div class="tab-pane fade" id="advanced_create_options_view" role="tabpanel"
                        aria-labelledby="advanced_create_options">
                          <label class="form-label">
                            Title <span class="title_note"></span>
                          </label>
                          <br>
                          <input type="text" class="form-control create_modal_title_field"
                              placeholder="fills with first prompt if blank">
                          <hr>
                          <label class="form-label">
                            System Message
                          </label>
                          <br>
                          <textarea class="form-control system_message_field"
                              placeholder="optional"></textarea>
                          <br>
                          <div style="display:flex;flex-direction:row;">
                            <div>
                                <label class="form-label">Usage Cap</label>
                                <br>
                                <input type="text" class="form-control document_usage_cap_field"
                                    placeholder="1k default">
                            </div>
                            <div style="flex:1;padding-left: 12px;">
                                <label class="form-label">Owner Note</label>
                                <br>
                                <input type="text" style="width:100%;" class="form-control create_modal_note_field"
                                    placeholder="optional">
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-pane fade" id="template_create_options_view" role="tabpanel"
                      aria-labelledby="template_create_options">
                      <div class="create_import_file_description">
                        <button class="btn btn-secondary modal_create_template_tickets_button">
                            <i class="material-icons">upload_file</i>
                            Import...
                        </button>
                        <input class="create_modal_template_file" style="display:none;" type="file"
                            accept=".json,.csv">
                        &nbsp;
                        <div class="parsed_file_status"></div>
                        &nbsp;
                        <div class="parsed_file_name"></div>
                        <br>
                        <br>
                        <div class="preview_create_template"></div>
                      </div>
                    </div>
                    <div class="tab-pane fade" id="bulk_create_options_view" role="tabpanel"
                    aria-labelledby="bulk_create_options">
                      <div class="create_import_file_description">
                        <button class="btn btn-secondary modal_create_users_list_button">
                            <i class="material-icons">upload_file</i>
                            Users List
                        </button>
                        <input class="create_modal_users_file" style="display:none;" type="file"
                            accept=".json,.csv">
                        &nbsp;
                        <div class="parsed_list_file_status"></div>
                        &nbsp;
                        <div class="parsed_list_file_name"></div>
                        <br>
                        <br>
                        <div class="preview_bulk_template"></div>
                        <hr>
                        <div style="display:flex;flex-direction:row">
                          <div style="flex:1">
                            <label class="form-label">
                              Email Template
                            </label>
                            <div class="subject_line_wrapper">
                              <label class="form-label">
                                Subject
                              </label>
                              <input class="form-control bulk_email_subject_field" type="text">
                            </div>
                          </div>
                          <div>
                            <button class="default_template_button btn btn-secondary">Default Template</button>
                          </div>
                        </div>
                        <textarea class="form-control bulk_email_template_field"
                            placeholder="see help for template specifications"></textarea>
                        <hr>
                        <label class="form-check-label">
                          <input class="form-check-input name_for_title_checkbox" checked type="checkbox" value="">
                          Use Name for Title
                        </label>  
                        <br>
                        <label class="form-check-label">
                          <input class="form-check-input name_for_title_checkbox" checked type="checkbox" value="">
                          Use Email for Owner's Note
                        </label>  
                      </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary modal_close_button" data-bs-dismiss="modal">
                    <i class="material-icons">cancel</i>
                    Cancel
                </button>
                <div style="flex:1"></div>
                <button type="button" class="btn btn-primary create_bulk_sessions_button">
                    <i class="material-icons">email</i>
                    Create and Send
                </button>
                <button type="button" class="btn btn-primary create_game_afterfeed_button">
                    <i class="material-icons">add</i>
                    Session
                </button>
            </div>
        </div>
    </div>
</div>`;
  }
  /** create new game api call */
  async createNewGame() {
    if (this.creatingNewRecord) return;
    if (!this.app.profile) return;
    this.creatingNewRecord = true;

    this.create_game_afterfeed_button.innerHTML = "Creating...";
    document.body.classList.add("creating_new_session");
    const body: any = {
      documentType: "chatSession",
      label: this.scrapeLabels(),
      note: this.create_modal_note_field.value.trim(),
      title: this.create_modal_title_field.value.trim(),
      firstPrompt: this.create_modal_prompt_field.value.trim(),
    };

    const systemMessage = this.system_message_field.value.trim();
    if (systemMessage) body.systemMessage = systemMessage;

    if (this.document_usage_cap_field.value.trim() !== "") {
      body.creditUsageLimit = this.document_usage_cap_field.value.trim();
    }

    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.app.basePath + "lobbyApi/games/create", {
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

    let importError = false;
    if (this.create_modal_template_file.files[0]) {
      importError = await this.parseSelectedTemplateFile(json.gameNumber, !systemMessage);
    }
    this.create_game_afterfeed_button.innerHTML = "Launching...";
    document.body.classList.remove("creating_new_session");
    this.creatingNewRecord = false;
    if (importError) {
      alert("data import error");
    } else {
      const a = document.createElement("a");
      a.setAttribute("href", `/session/${json.gameNumber}`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
  /** scrape labels from dom and return comma delimited list
  * @return { string } comma delimited list
  */
  scrapeLabels(): string {
    const data = window.$(".create_document_label_options").select2("data");
    const labels: Array<string> = [];
    data.forEach((item: any) => {
      if (item.text.trim()) labels.push(item.text.trim());
    });

    return labels.join(",");
  }
  /** populate modal fields and show
   * @param { string } label optional label to add
   * @param { boolean } forceAdvanced true to show advanced tab (i.e. template preloaded)
  */
  show(label = "", forceAdvanced = false) {
    this.create_modal_note_field.value = "";
    if (!forceAdvanced) {
      this.create_modal_template_file.value = "";
      this.updateParsedFileStatus();
    }

    this.create_modal_users_file.value = "";
    this.updateUsersListFile();

    if (this.app.fireUser.isAnonymous) {
      alert("Anonymous can only join already created sessions");
      return;
    }

    const queryLabelSelect2 = window.$(".create_document_label_options");
    queryLabelSelect2.html("");
    queryLabelSelect2.val(null).trigger("change");

    let labelString = this.app.profile.documentLabels;
    if (!labelString) labelString = "";
    const labelArray = labelString.split(",");
    labelArray.forEach((label: string) => {
      if (label !== "") {
        // Create a DOM Option and pre-select by default
        const newOption = new Option(label, label, false, false);
        // Append it to the select
        queryLabelSelect2.append(newOption).trigger("change");
      }
    });
    this.insert_todaylabel_default_checkbox.checked = this.app.profile.insertTodayAsLabel === true;
    if (this.app.profile.insertTodayAsLabel) this.addTodayAsLabel();
    if (label) this.addTodayAsLabel(label);

    if (forceAdvanced) {
      this.template_create_options.click();
      this.tabChangeHandler(3, false);
    } else {
      this.basic_create_options.click();
      this.tabChangeHandler(0, false);
    }

    this.updateBulkEmailTemplate();

    const modal = new window.bootstrap.Modal("#createDocumentModal", {});
    modal.show();
  }
  /** parse template data from file input
   * @param {string } documentId new document to add ticket imports
   * @param { boolean } importSystemMessage import the system message if exists
   * @return { Promise<boolean> } true if import error
   */
  async parseSelectedTemplateFile(documentId: string, importSystemMessage = false): Promise<boolean> {
    try {
      const records = await ChatDocument.getImportDataFromDomFile(this.create_modal_template_file);

      if (records.length === 0) {
        alert("no records found");
        return true;
      }

      const importResult = ChatDocument.processImportTicketsToUpload(records);
      if (importResult.systemMessage.trim() !== "" && importSystemMessage == true) {
        this.app.saveDocumentOption(documentId, "systemMessage", importResult.systemMessage.trim());
      }
      const error = await ChatDocument.sendImportTicketToAPI(documentId, importResult.recordsToUpload, this.app.basePath);
      if (error) {
        alert("Import error");
        return true;
      }
    } catch (error: any) {
      console.log(error);
      return true;
    }

    return false;
  }
  /** */
  async updateParsedFileStatus(): Promise<Array<any>> {
    const importData = await ChatDocument.getImportDataFromDomFile(this.create_modal_template_file);
    let contentCount = "";
    contentCount = importData.length + " rows";
    let fileContent = "<table class=\"file_preview_table\">";
    const keys = ["selected", "system", "prompt", "completion"];
    fileContent += "<tr>";
    fileContent += `<th>Row</th>`;
    keys.forEach((key: string) => fileContent += `<th>${Utility.capFirst(key)}</th>`);
    fileContent += "</tr>";

    importData.forEach((row: any, index: number) => {
      fileContent += "<tr>";
      fileContent += `<th>${index + 1}</th>`;
      keys.forEach((key: string) => {
        let value = row[key];
        if (value === undefined) value = "";
        fileContent += `<td>${value}</td>`;
      });
      fileContent += "</tr>";
    });

    fileContent += `</table>`;

    this.preview_create_template.innerHTML = fileContent;

    this.parsed_file_status.innerHTML = contentCount;
    let fileName = "";
    if (this.create_modal_template_file.files[0]) fileName = this.create_modal_template_file.files[0].name;
    this.parsed_file_name.innerHTML = fileName;
    return importData;
  }
  /** */
  async updateUsersListFile(): Promise<Array<any>> {
    const importData = await ChatDocument.getImportDataFromDomFile(this.create_modal_users_file);
    let contentCount = "";
    contentCount = importData.length + " rows";
    let fileContent = "<table class=\"file_preview_table\">";
    const keys = ["name", "email"];
    fileContent += "<tr>";
    fileContent += `<th>Row</th>`;
    keys.forEach((key: string) => fileContent += `<th>${Utility.capFirst(key)}</th>`);
    fileContent += "</tr>";

    importData.forEach((row: any, index: number) => {
      fileContent += "<tr>";
      fileContent += `<th>${index + 1}</th>`;
      keys.forEach((key: string) => fileContent += `<td>${row[key]}</td>`);
      fileContent += "</tr>";
    });

    fileContent += `</table>`;

    this.preview_bulk_template.innerHTML = fileContent;

    this.parsed_list_file_status.innerHTML = contentCount;
    let fileName = "";
    if (this.create_modal_users_file.files[0]) fileName = this.create_modal_users_file.files[0].name;
    this.parsed_list_file_name.innerHTML = fileName;
    return importData;
  }
  /** add todays yy/mm/dd as label
   * @param { string } label overrides today to be added
  */
  addTodayAsLabel(label = "") {
    let today = this.getLocal8DigitDate();
    if (label) today = label;
    const queryLabelSelect2 = window.$(".create_document_label_options");

    if (queryLabelSelect2.find("option[value='" + today + "']").length) {
      queryLabelSelect2.val(today).trigger("change");
    } else {
      const newOption = new Option(today, today, true, true);
      queryLabelSelect2.append(newOption).trigger("change");
    }
  }
}
