import BaseApp from "./baseapp.js";
import ChatDocument from "./chatdocument.js";
declare const firebase: any;
declare const window: any;

/** Base class for all pages - handles authorization and low level routing for api calls, etc */
export default class DocCreateHelper {
  app: any = null;
  modal_close_button: any = null;
  modalContainer: any = null;
  create_game_afterfeed_button: any = null;
  create_modal_note_field: any = null;
  creatingNewRecord = false;
  create_modal_title_field: any;
  system_message_field: any;
  document_usage_cap_field: any;
  create_modal_template_file: any;
  modal_create_template_tickets_button: any;
  parsed_file_status: any;
  parsed_file_name: any;
  modal_open_new_document: any;
  createDocumentModal: any;
  add_date_as_label_button: any;
  insert_todaylabel_default_checkbox: any;
  advanced_create_options: any;
  basic_create_options: any;

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
      this.create_modal_title_field.focus();
    });

    this.create_game_afterfeed_button = this.modalContainer.querySelector(".create_game_afterfeed_button");
    this.create_modal_note_field = this.modalContainer.querySelector(".create_modal_note_field");
    this.create_game_afterfeed_button = this.modalContainer.querySelector(".create_game_afterfeed_button");
    this.createDocumentModal = this.modalContainer.querySelector("#createDocumentModal");
    this.create_modal_title_field = this.modalContainer.querySelector(".create_modal_title_field");
    this.create_modal_title_field.addEventListener("keydown", (e: any) => {
      if (e.key === "Enter" && e.shiftKey === false) {
        e.preventDefault();
        e.stopPropagation();
        this.createNewGame();
      }
    });
    this.system_message_field = this.modalContainer.querySelector(".system_message_field");
    this.document_usage_cap_field = this.modalContainer.querySelector(".document_usage_cap_field");
    this.modal_create_template_tickets_button = this.modalContainer.querySelector(".modal_create_template_tickets_button");
    this.modal_create_template_tickets_button.addEventListener("click", () => this.create_modal_template_file.click());
    this.parsed_file_status = this.modalContainer.querySelector(".parsed_file_status");
    this.parsed_file_name = this.modalContainer.querySelector(".parsed_file_name");
    this.modal_open_new_document = this.modalContainer.querySelector(".modal_open_new_document");
    this.insert_todaylabel_default_checkbox = this.modalContainer.querySelector(".insert_todaylabel_default_checkbox");
    this.insert_todaylabel_default_checkbox.addEventListener("input", () => {
      const b = this.insert_todaylabel_default_checkbox.checked;
      this.app.saveProfileField("insertTodayAsLabel", b);
      if (b) this.addTodayAsLabel();
    });

    this.create_modal_template_file = this.modalContainer.querySelector(".create_modal_template_file");
    this.create_modal_template_file.addEventListener("change", () => this.updateParsedFileStatus());
    this.create_game_afterfeed_button.addEventListener("click", () => this.createNewGame());

    this.add_date_as_label_button = this.modalContainer.querySelector(".add_date_as_label_button");

    // this.add_date_as_label_button.innerHTML = this.getLocal8DigitDate();
    this.add_date_as_label_button.addEventListener("click", () => this.addTodayAsLabel());

    this.modal_close_button = this.modalContainer.querySelector(".modal_close_button");

    this.advanced_create_options = this.modalContainer.querySelector("#advanced_create_options");
    this.advanced_create_options.addEventListener("click", () => this.app.saveProfileField("createDialogTabIndex", 1));
    this.basic_create_options = this.modalContainer.querySelector("#basic_create_options");
    this.basic_create_options.addEventListener("click", () => this.app.saveProfileField("createDialogTabIndex", 0));

    window.$(".create_document_label_options").select2({
      tags: true,
      placeHolder: "Add labels...",
    });
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
    <div class="modal-dialog">
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
                            aria-selected="false">Basic</a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="advanced_create_options" data-bs-toggle="tab"
                            href="#advanced_create_options_view" role="tab" aria-controls="advanced_create_options_view"
                            aria-selected="true">Advanced</a>
                    </li>
                </ul>
                <div class="tab-content">
                    <div class="tab-pane fade" id="basic_create_options_view" role="tabpanel"
                        style="flex-direction:column;overflow:hidden;" aria-labelledby="basic_create_options">
                    </div>
                    <div>
                        <label class="form-label">
                            Title <span class="title_note"> - [Enter] to add</span>
                        </label>
                        <div class="form-check open_button_wrapper">
                            <label class="form-check-label">
                                <input class="form-check-input modal_open_new_document" checked type="checkbox"
                                    value="">
                                Open
                            </label>
                        </div>
                        <br>
                        <input type="text" class="form-control create_modal_title_field"
                            placeholder="autofills if blank">
                        <hr>
                        <div style="position:relative;margin-top: -6px;">
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
                        style="flex-direction:column;overflow:hidden;" aria-labelledby="advanced_create_options">
                          <hr>
                          <label class="form-label">
                            System Message
                          </label>
                          <br>
                          <input type="text" class="form-control system_message_field"
                              placeholder="optional">
                          <br>
                          <div style="display:flex;flex-direction:row;">
                            <div>
                                <label class="form-label">Usage Cap</label>
                                <br>
                                <input type="text" class="form-control document_usage_cap_field"
                                    placeholder="500 default">
                            </div>
                            <div style="flex:1;overflow:hidden;padding-left: 12px;">
                                <label class="form-label">Owner Note</label>
                                <br>
                                <input type="text" style="width:100%;" class="form-control create_modal_note_field"
                                    placeholder="optional">
                            </div>
                        </div>
                        <hr>
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
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary modal_close_button" data-bs-dismiss="modal">
                    <i class="material-icons">cancel</i>
                    Close
                </button>
                <div style="flex:1"></div>
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
      console.log("failed create", json);
      alert("failed to create session");
      return;
    }

    let importError = false;
    if (this.create_modal_template_file.files[0]) {
      importError = await this.parseSelectedTemplateFile(json.gameNumber, !systemMessage);
    }
    this.create_game_afterfeed_button.innerHTML = "Create";
    document.body.classList.remove("creating_new_session");
    this.creatingNewRecord = false;
    if (importError) {
      alert("data import error");
    } else {
      if (this.modal_open_new_document.checked) {
        const a = document.createElement("a");
        a.setAttribute("href", `/session/${json.gameNumber}`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
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

    if (this.app.profile.createDialogTabIndex === 1 || forceAdvanced) {
      this.advanced_create_options.click();
    } else if (this.app.profile.createDialogTabIndex === 0) {
      this.basic_create_options.click();
    }

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
    if (importData.length > 0) {
      contentCount = importData.length + " rows";
    } else {
      importData.length = 0;
    }
    this.parsed_file_status.innerHTML = contentCount;
    let fileName = "";
    if (this.create_modal_template_file.files[0]) fileName = this.create_modal_template_file.files[0].name;
    this.parsed_file_name.innerHTML = fileName;
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
