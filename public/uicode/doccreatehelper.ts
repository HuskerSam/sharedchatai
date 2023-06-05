import {
  ChatDocument,
} from "./chatdocument.js";
declare const firebase: any;
declare const window: any;

/** Base class for all pages - handles authorization and low level routing for api calls, etc */
export default class DocCreateHelper {
  app: any = null;
  modal_close_button: any = null;
  modalContainer: any = null;
  create_game_afterfeed_button: any = null;
  create_modal_note_field: any = null;
  doccreatehelper_show_modal: any = null;
  creatingNewRecord = false;
  show_create_dialog_help: any;
  create_modal_title_field: any;
  document_usage_cap_field: any;
  create_modal_template_file: any;
  modal_create_template_tickets_button: any;
  parsed_file_status: any;
  parsed_file_name: any;
  modal_open_new_document: any;

  /**
   * @param { any } app BaseApp derived application instance
   */
  constructor(app: any) {
    this.app = app;
    const html = this.getModalTemplate();
    this.modalContainer = document.createElement("div");
    this.modalContainer.innerHTML = html;
    document.body.appendChild(this.modalContainer);

    this.create_game_afterfeed_button = this.modalContainer.querySelector(".create_game_afterfeed_button");
    this.create_modal_note_field = this.modalContainer.querySelector(".create_modal_note_field");
    this.doccreatehelper_show_modal = document.querySelector(".doccreatehelper_show_modal");
    this.create_game_afterfeed_button = this.modalContainer.querySelector(".create_game_afterfeed_button");
    this.create_modal_title_field = this.modalContainer.querySelector(".create_modal_title_field");
    this.document_usage_cap_field = this.modalContainer.querySelector(".document_usage_cap_field");
    this.show_create_dialog_help = this.modalContainer.querySelector(".show_create_dialog_help");
    this.show_create_dialog_help.addEventListener("click", () => this.app.helpHelper.show("create_document_modal"));
    this.modal_create_template_tickets_button = this.modalContainer.querySelector(".modal_create_template_tickets_button");
    this.modal_create_template_tickets_button.addEventListener("click", () => this.create_modal_template_file.click());
    this.parsed_file_status = this.modalContainer.querySelector(".parsed_file_status");
    this.parsed_file_name = this.modalContainer.querySelector(".parsed_file_name");
    this.modal_open_new_document = this.modalContainer.querySelector(".modal_open_new_document");

    this.create_modal_template_file = this.modalContainer.querySelector(".create_modal_template_file");
    this.create_modal_template_file.addEventListener("change", () => this.updateParsedFileStatus());
    this.create_game_afterfeed_button.addEventListener("click", () => this.createNewGame());

    this.modal_close_button = this.modalContainer.querySelector(".modal_close_button");

    window.$(".create_document_label_options").select2({
      tags: true,
      placeHolder: "Add labels...",
    });
  }
  /** template as string for modal
   * @return { string } html template as string
   */
  getModalTemplate(): string {
    return `  <div class="modal fade" id="createDocumentModal" tabindex="-1" aria-labelledby="createDocumentModalLabel"
        aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content app_panel">
            <div class="modal-header">
              <h5 class="modal-title" id="createDocumentModalLabel">New Chat Room</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <button class="btn btn-secondary show_create_dialog_help"><i 
                  class="material-icons">help</i></button>
                  <div style="display:inline-block">
                    <label class="form-label">Template</label>
                    <br>
                    <button class="btn btn-secondary modal_create_template_tickets_button">Template...</button>
                    <input class="create_modal_template_file" style="display:none;" type="file">
                  </div>
                  &nbsp;
                  <div class="parsed_file_status"></div>
                  &nbsp;
                  <div class="parsed_file_name"></div>
               <br>
               <br>
              <div style="display:inline-block;">
                <label class="form-label">Usage Cap</label>
                <br>
                <input type="text" class="form-control document_usage_cap_field" placeholder="tokens limit">
              </div>
              <br>
              <br>
              <label class="form-label" style="width:100%">
                Title<br>
                <input type="text" class="form-control create_modal_title_field" placeholder="autofills if blank">
              </label>
              <br>
              <label class="form-label" style="width:100%">
                Reference<br>
                <input type="text" class="form-control create_modal_note_field" placeholder="optional">
              </label>
              <br>
              <label class="form-label">Labels</label>
              <br>
              <select class="create_document_label_options" multiple="multiple" style="width:100%"></select>
            </div>
            <div class="modal-footer">
              <div class="form-check" style="float:left">
                <label class="form-check-label">
                    <input class="form-check-input modal_open_new_document" checked type="checkbox" value="">
                    Open
                </label>
              </div>
              <button type="button" class="btn btn-secondary modal_close_button" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary create_game_afterfeed_button">Create</button>
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

    this.create_game_afterfeed_button.innerHTML = "Creating";

    const body: any = {
      gameType: "aichat",
      label: this.scrapeLabels(),
      note: this.create_modal_note_field.value.trim(),
      title: this.create_modal_title_field.value.trim(),
    };

    if (this.document_usage_cap_field.value.trim() !== "") {
      body.tokenUsageLimit = this.document_usage_cap_field.value.trim();
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
      alert("failed to create game");
      return;
    }

    let importError = false;
    if (this.create_modal_template_file.files[0]) {
      importError = await this.parseSelectedTemplateFile(json.gameNumber);
    }
    this.create_game_afterfeed_button.innerHTML = "Create";
    this.creatingNewRecord = false;
    if (importError) {
      alert("data import error");
    } else {
      if (this.modal_open_new_document.checked) {
        const a = document.createElement("a");
        a.setAttribute("href", `/${body.gameType}/?game=${json.gameNumber}`);
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
  /** populate modal fields and show */
  show() {
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
    this.doccreatehelper_show_modal.click();
  }
  /** parse template data from file input
   * @param {string } documentId new document to add ticket imports
   * @return { Promise<boolean> } true if import error
   */
  async parseSelectedTemplateFile(documentId: string):Promise<boolean> {
    try {
      const records = await ChatDocument.getImportDataFromDomFile(this.create_modal_template_file);

      if (records.length === 0) {
          alert("no records found");
          return true;
      }

      const recordsToUpload: any = ChatDocument.processImportTicketsToUpload(records);
      const error = await ChatDocument.sendImportTicketToAPI(documentId, recordsToUpload, this.app.basePath);
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
}
