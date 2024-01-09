import BaseApp from "./baseapp";
import ChatDocument from "./chatdocument";
import {
  getAuth,
} from "firebase/auth";
import Handlebars from "handlebars";
import SlimSelect from "slim-select";
import Papa from "papaparse";

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
  bulk_create_usage_limit: any;
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
  bulk_send_email_button: any;
  bulkEmailBodyTemplate: any;
  bulkEmailSubjectTemplate: any;
  today_bulk_label_button: any;
  create_modal_batch_label_field: any;
  downloadcsv_radio: any;
  sendemails_radio: any;
  bulk_batch_job_status: any;
  lastBulkBatchResults = "";
  bulkUsersImportData: Array<any> = [];
  bulkRowsWithNoEmail = 0;
  bulkEmailTotalCount = 0;
  bulkStatusReady = false;
  bulk_user_list_status: any;
  bulk_label_status: any;
  bulk_copy_table_clipboard: any;
  bulk_copy_csv_clipboard: any;
  lastEmailRows: any = [];
  create_dialog_model: any;
  create_model_lock: any;
  create_include_prompts_in_context: any;
  createLabelsSlimSelect: SlimSelect;

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
        this.createNewSession();
      }
    });
    this.system_message_field = this.modalContainer.querySelector(".system_message_field");
    this.document_usage_cap_field = this.modalContainer.querySelector(".document_usage_cap_field");
    this.document_usage_cap_field.addEventListener("input", () => this.updateBulkBatchStatus());
    this.bulk_create_usage_limit = this.modalContainer.querySelector(".bulk_create_usage_limit");
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
    this.create_modal_users_file.addEventListener("change", async () => {
      await this.updateUsersListFile();
      this.updateBulkBatchStatus();
    });
    this.create_game_afterfeed_button = this.modalContainer.querySelector(".create_game_afterfeed_button");
    this.create_game_afterfeed_button.addEventListener("click", () => this.createNewSession());

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

    this.createLabelsSlimSelect = new SlimSelect({
      select: ".create_document_label_options",
      events: {
        addable: (value: string): string | false => {
          if (value === "") return false;
          return value;
        },
      },
      settings: {
        placeholderText: "Add labels",
        hideSelected: true,
        searchPlaceholder: "Add Labels",
        allowDeselect: true,
        closeOnSelect: false,
        searchText: "",
      },
    });

    this.bulk_email_template_field = this.modalContainer.querySelector(".bulk_email_template_field");
    this.bulk_email_subject_field = this.modalContainer.querySelector(".bulk_email_subject_field");
    this.default_template_button = this.modalContainer.querySelector(".default_template_button");
    this.default_template_button.addEventListener("click", () => this.setDefaultEmailTemplate());

    this.create_modal_batch_label_field = this.modalContainer.querySelector(".create_modal_batch_label_field");
    this.create_modal_batch_label_field.addEventListener("input", () => this.updateBulkBatchStatus());
    this.today_bulk_label_button = this.modalContainer.querySelector(".today_bulk_label_button");
    this.today_bulk_label_button.addEventListener("click", () => this.setTodayForBulkLabel());

    this.downloadcsv_radio = this.modalContainer.querySelector(".downloadcsv_radio");
    this.sendemails_radio = this.modalContainer.querySelector(".sendemails_radio");
    this.bulk_batch_job_status = this.modalContainer.querySelector(".bulk_batch_job_status");
    this.bulk_user_list_status = this.modalContainer.querySelector(".bulk_user_list_status");
    this.bulk_label_status = this.modalContainer.querySelector(".bulk_label_status");

    this.bulk_copy_table_clipboard = this.modalContainer.querySelector(".bulk_copy_table_clipboard");
    this.bulk_copy_table_clipboard.addEventListener("click", () => this.copyBulkResultsToClipboard(true));
    this.bulk_copy_csv_clipboard = this.modalContainer.querySelector(".bulk_copy_csv_clipboard");
    this.bulk_copy_csv_clipboard.addEventListener("click", () => this.copyBulkResultsToClipboard());

    this.create_dialog_model = this.modalContainer.querySelector(".create_dialog_model");
    this.create_model_lock = this.modalContainer.querySelector(".create_model_lock");
    this.create_include_prompts_in_context = this.modalContainer.querySelector(".create_include_prompts_in_context");
  }
  /**
   * @param { boolean } isTable
   */
  copyBulkResultsToClipboard(isTable = false) {
    if (isTable) {
      navigator.clipboard.write([new ClipboardItem({
        "text/plain": new Blob([this.bulk_batch_job_status.innerText], {
          type: "text/plain",
        }),
        "text/html": new Blob([this.bulk_batch_job_status.innerHTML], {
          type: "text/html",
        }),
      })]);
    } else {
      const csvText = Papa.unparse(this.lastEmailRows);
      const file = new File([csvText], "bulkResults.csv", {
        type: "application/csv",
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
  /** */
  setTodayForBulkLabel() {
    const n = new Date();
    this.create_modal_batch_label_field.value = BaseApp.shortShowDate(n) + " " + BaseApp.formatAMPM(n);
    this.updateBulkBatchStatus();
  }
  /** */
  updateBulkBatchStatus() {
    const rows = this.bulkUsersImportData;
    const rowCount = rows.length;
    const isRowCountValid = rowCount > 0;
    this.bulk_user_list_status.innerHTML = `Sessions: ${rowCount}, ` +
      `Emails: ${this.bulkEmailTotalCount}`;
    let label = this.create_modal_batch_label_field.value.trim();
    const isLabelValid = label !== "";
    if (!label) label = `<span class="no_label">none</span>`;
    this.bulk_label_status.innerHTML = `Label:`;
    if (isRowCountValid && isLabelValid) {
      this.modalContainer.classList.add("bulk_create_sessions_ready");
      this.bulkStatusReady = true;
    } else {
      this.modalContainer.classList.remove("bulk_create_sessions_ready");
      this.bulkStatusReady = false;
    }
    this.bulk_batch_job_status.innerHTML = this.lastBulkBatchResults;
    let usageCap = "1000";
    if (this.document_usage_cap_field.value) usageCap = this.document_usage_cap_field.value;
    this.bulk_create_usage_limit.innerHTML = "Usage Limit: " + usageCap;
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
  async createBulkSessions() {
    const body = this.bulk_email_template_field.value;
    const subject = this.bulk_email_subject_field.value;
    const label = this.create_modal_batch_label_field.value;
    const bulkDownloadCSV = this.downloadcsv_radio.checked;
    const bulkSendEmails = this.sendemails_radio.checked;

    if (!body) {
      alert("Email template body required");
      return;
    }

    if (!subject) {
      alert("Email subject body required");
      return;
    }

    if (!label) {
      alert("Label required");
      return;
    }

    if (this.bulkEmailTotalCount === 0) {
      alert("No email addresses to create sessions for.");
      return;
    }

    this.app.saveProfileField("bulkEmailBodyTemplate", body);
    this.app.saveProfileField("bulkEmailSubjectTemplate", subject);
    this.app.saveProfileField("bulkDownloadCSV", bulkDownloadCSV);
    this.app.saveProfileField("bulkSendEmails", bulkSendEmails);

    try {
      this.bulkEmailBodyTemplate = Handlebars.compile(body);
      this.bulkEmailSubjectTemplate = Handlebars.compile(subject);
    } catch (err: any) {
      console.log(err);
      alert("Error compiling body or subject, check the console; send failed");
      return;
    }

    const promises: Array<any> = [];
    this.bulkUsersImportData.forEach((row: any, index: number) => {
      promises.push(this.createBulkSessionRows(row, index, label));
    });

    const bulkRows = await Promise.all(promises);
    const emailRows = Array.prototype.concat.apply([], bulkRows);
    this.lastEmailRows = emailRows;
    let keys = Object.keys(emailRows[0]);
    keys = keys.sort();

    let fileContent = "<table class=\"bulk_create_results\">";
    fileContent += "<tr>";
    fileContent += `<th>Row</th>`;
    keys.forEach((key: string) => fileContent += `<th>${key}</th>`);
    fileContent += "</tr>";

    emailRows.forEach((row: any, index: number) => {
      fileContent += "<tr>";
      fileContent += `<th>${index + 1}</th>`;
      keys.forEach((key: string) => {
        let value = row[key];
        if (value === undefined) value = "";
        fileContent += `<td>${BaseApp.escapeHTML(value)}</td>`;
      });
      fileContent += "</tr>";
    });

    fileContent += `</table>`;
    this.lastBulkBatchResults = fileContent;

    if (bulkSendEmails) {
      emailRows.forEach((row: any) => this._sendEmailForCSVRow(row));
    } else {
      this.copyBulkResultsToClipboard();
    }
    this.updateBulkBatchStatus();
    if (this.app.document_label_filter) {
      setTimeout(() => {
        this.app.document_label_filter.value = label;
        this.app.document_label_filter.dispatchEvent(new Event("input"));
      }, 50);
    }
  }
  /**
   * @param {string } row
   * @param { number } index
   * @param { string } label extra label for bulk create
   * @return { Promise<Array<any>> } csv rows
   */
  async createBulkSessionRows(row: any, index: number, label = ""): Promise<Array<any>> {
    let name = row["name"];
    if (!name) name = "";
    let email = row["email"];
    if (!email) email = "";
    let title = row["title"];
    if (!title) title = this.create_modal_title_field.value;
    if (!title) title = "";
    const note = email;
    let labels = label;
    if (row["label"]) labels = labels + "," + row["label"];
    const result = await this.createNewSession(title, note, true, labels);

    const link = location.origin + "/session/" + result.gameNumber;
    const displayName = BaseApp.escapeHTML(this.app.userMetaFromDocument(this.app.uid).name);

    const csvRows: Array<any> = [];
    let list = email.replaceAll("\n", "");
    list = list.replaceAll("\r", "");
    const emailList = list.split(";");
    emailList.forEach((address: string) => {
      const mergeObject: any = {
        displayName,
        title,
        importedEmail: email,
        ownerNote: note,
        bulkLabel: label,
        newLabels: labels,
        link,
        name,
        email: address,
        id: result.gameNumber,
        index,
      };
      mergeObject.emailBody = this.bulkEmailBodyTemplate(mergeObject);
      mergeObject.emailSubject = this.bulkEmailSubjectTemplate(mergeObject);

      csvRows.push(mergeObject);
    });

    return csvRows;
  }
  /**
   *
   * @param { any } row
   */
  _sendEmailForCSVRow(row: any) {
    const a = document.createElement("a");
    console.log(row);
    a.setAttribute("href", `mailto:${row.email}?subject=${encodeURIComponent(row.emailSubject)}&body=${encodeURIComponent(row.emailBody)}`);
    a.setAttribute("target", "_blank");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    return `<div class="modal fade scrollable_modal" data-bs-focus="false" id="createDocumentModal" tabindex="-1"
    aria-labelledby="createDocumentModalLabel" aria-hidden="true">
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
            <div class="modal-body" style="display:flex;flex-direction:column">
                <ul class="nav nav-tabs mb-2" role="tablist">
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
                            aria-selected="true">Import</a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="bulk_create_options" data-bs-toggle="tab"
                            href="#bulk_create_options_view" role="tab" aria-controls="bulk_create_options_view"
                            aria-selected="true">Bulk</a>
                    </li>
                </ul>
                <div class="tab-content" style="overflow:hidden;display:flex;height:95vh;">
                    <div class="tab-pane fade show active" id="basic_create_options_view" role="tabpanel"
                        aria-labelledby="basic_create_options">
                        <div>
                          <label class="form-label">
                              First Prompt (Enter to run)
                          </label>
                        </div>
                        <textarea class="form-control create_modal_prompt_field" style="flex:1" placeholder="optional"></textarea>
                        <div style="text-align:center;padding:12px;display:none">How to get started</div>
                    </div>
                    <div class="tab-pane fade" id="advanced_create_options_view" role="tabpanel"
                        aria-labelledby="advanced_create_options" style="overflow-y:auto;overflow-x:hidden;">
                        <div style="position:relative;">
                          <button class="btn btn-secondary add_date_as_label_button">Add Today</button>
                          <input class="form-check-input insert_todaylabel_default_checkbox" type="checkbox">
                          <label class="form-label labels_label">Labels</label>
                          <select class="create_document_label_options" multiple="multiple"></select>
                        </div>
                        <hr>
                        <div>
                          <label class="form-label">
                              Title <span class="title_note"></span>
                          </label>
                          <div style="padding-right: 4px;padding-left: 4px;">
                            <input type="text" class="form-control create_modal_title_field"
                                placeholder="fills with first prompt if blank">
                          </div>
                        </div>
                        <hr>
                        <label class="form-label">
                            System Message
                        </label>
                        <textarea class="form-control system_message_field" placeholder="optional"></textarea>
                        <hr>
                        <div>
                          <label class="form-label">
                            LLM Model
                          </label>
                          <br>
                          <select class="form-select create_dialog_model" aria-label="chatGPTEngine Selection">
                            <option>gpt-4</option>
                            <option selected>gpt-3.5-turbo</option>
                            <option>gpt-3.5-turbo-16k</option>
                            <option>chat-bison-001</option>
                          </select>
                          <label class="form-check-label create_model_lock_wrapper">
                            <input class="form-check-input create_model_lock" type="checkbox" value="">
                            Lock Model
                          </label>   
                        </div>
                        <label class="form-check-label" style="padding-left:4px;">
                          <input class="form-check-input create_include_prompts_in_context" checked type="checkbox" value="">
                              Include prompts in context
                        </label>
                        <hr>
                        <div style="display:flex;flex-direction:row;">
                            <div>
                                <label class="form-label">Usage Cap</label>
                                <br>
                                <input type="text" class="form-control document_usage_cap_field"
                                    placeholder="1k default" style="margin-left: 4px;">
                            </div>
                            <div style="flex:1;padding-left: 12px;">
                                <label class="form-label">Owner Note</label>
                                <br>
                                <input type="text" style="width:calc(100% - 4px);margin-right:4px;" 
                                  class="form-control create_modal_note_field"
                                    placeholder="optional">
                            </div>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="template_create_options_view" role="tabpanel"
                        aria-labelledby="template_create_options">
                        <div class="upload_wrapper">
                            <div>
                                <button class="btn btn-secondary modal_create_template_tickets_button">
                                    <i class="material-icons">upload_file</i>
                                    Session Template
                                </button>
                            </div>
                            <input class="create_modal_template_file" style="display:none;" type="file"
                                accept=".json,.csv">
                            <div class="parsed_file_status"></div>
                            <div class="parsed_file_name" style="display:none;"></div>
                        </div>
                        <div class="preview_create_template"></div>
                    </div>
                    <div class="tab-pane fade" id="bulk_create_options_view" role="tabpanel"
                        aria-labelledby="bulk_create_options">
                        <ul class="nav nav-pills bulk_create_pills_wrapper" role="tablist">
                            <li class="nav-item" role="presentation">
                                <a class="nav-link active" id="bulk_create_pill_1" data-bs-toggle="tab"
                                    href="#bulkCreateView1" role="tab" aria-controls="bulkCreateView1"
                                    aria-selected="true">Email List</a>
                            </li>
                            <li class="nav-item" role="presentation">
                                <a class="nav-link" id="bulk_create_pill_2" data-bs-toggle="tab" href="#bulkCreateView2"
                                    role="tab" aria-controls="bulkCreateView2" aria-selected="false">Email Template</a>
                            </li>
                            <li class="nav-item" role="presentation">
                                <a class="nav-link" id="bulk_create_pill_3" data-bs-toggle="tab" href="#bulkCreateView3"
                                    role="tab" aria-controls="bulkCreateView3" aria-selected="false">Finish</a>
                            </li>
                        </ul>

                        <div class="tab-content">
                            <div class="tab-pane fade show active" id="bulkCreateView1" role="tabpanel"
                                style="flex-direction:column;" aria-labelledby="bulk_create_pill_1">
                                <div class="upload_wrapper">
                                    <div>
                                        <button class="btn btn-secondary modal_create_users_list_button">
                                            <i class="material-icons">upload_file</i> <span>Users
                                                List</span>
                                        </button>
                                    </div>
                                    <div>
                                        <input class="create_modal_users_file" style="display:none;" type="file"
                                            accept=".json,.csv">
                                    </div>
                                    <div class="parsed_list_file_status"></div>
                                    <div class="parsed_list_file_name" style="display:none;"></div>
                                </div>
                                <div class="preview_bulk_template"></div>
                            </div>
                            <div class="tab-pane fade" id="bulkCreateView2" role="tabpanel"
                                aria-labelledby="bulk_create_pill_2">
                                <div style="display:flex;flex-direction:row;">
                                    <div style="flex:1;display:flex;">
                                        <label class="form-label" style="margin-top:8px;margin-right:8px;">Subject</label>
                                        <div style="flex:1;">
                                          <input type="text" style="width:100%;"
                                              class="form-control bulk_email_subject_field" placeholder="required">
                                        </div>
                                    </div>                                    
                                    <div>
                                        <button class="default_template_button btn btn-secondary"><i
                                                class="material-icons">restart_alt</i> <span class="mobile_hide">
                                                Default</span></button>
                                    </div>
                                </div>
                                <textarea class="form-control bulk_email_template_field" 
                                  style="flex:1;margin-right:4px;margin-left:4px;width:calc(100% - 8px)"
                                    placeholder="see help for template specifications"></textarea>
                            </div>
                            <div class="tab-pane fade" id="bulkCreateView3" role="tabpanel"
                                aria-labelledby="bulk_create_pill_3">
                                <div style="display:flex;flex-direction:row;margin-bottom: 12px;">
                                    <div style="flex:1;display:flex;">
                                        <div class="bulk_label_status"></div>
                                        <div style="flex:1;">
                                          <input type="text" style="width:100%;"
                                              class="form-control create_modal_batch_label_field" placeholder="required">
                                        </div>
                                    </div>
                                    <div>
                                        <button class="btn btn-secondary today_bulk_label_button">
                                            <i class="material-icons">today</i>
                                        </button>
                                    </div>
                                </div>                          
                                <div style="display:flex;flex-direction:row">
                                  <div class="bulk_user_list_status"></div>
                                  <div style="flex:1"></div>
                                  <div class="bulk_create_usage_limit"></div>
                                  <div style="flex:1"></div>
                                  <div>
                                    <label class="form-check-label csv_choice_label">
                                      <input class="form-radio-input downloadcsv_radio" type="radio"
                                            value="" name="bulk_generate_type">
                                        CSV
                                    </label>
                                    <label class="form-check-label csv_choice_label">
                                        <input class="form-radio-input sendemails_radio" checked type="radio"
                                            value="" name="bulk_generate_type">
                                        Emails
                                    </label>
                                    <br>
                                    <br>
                                    <div>
                                      <button type="button" class="btn btn-primary create_bulk_sessions_button">
                                        <i class="material-icons">add</i>
                                        Create Sessions
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <hr>
                                <div class="bulk_batch_job_status"></div>
                                <div style="line-height: 4em;text-align: right">
                                  <button type="button" class="btn btn-secondary bulk_copy_table_clipboard"><i
                                    class="material-icons">content_copy</i> Table</button>
                                  &nbsp;
                                  <button type="button" class="btn btn-secondary bulk_copy_csv_clipboard"><i
                                      class="material-icons">download</i> CSV</button>
                                </div>
                            </div>
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
                <button type="button" class="btn btn-primary create_game_afterfeed_button">
                    <i class="material-icons">add</i>
                    Session
                </button>
            </div>
        </div>
    </div>
</div>`;
  }
  /** create new game api call
   * @param { string } title
   * @param { string } note
   * @param { boolean } bulkMode false default
   * @param { string } bulkLabel label to add
  */
  async createNewSession(title = "", note = "", bulkMode = false, bulkLabel = ""): Promise<any> {
    if (!bulkMode && this.creatingNewRecord) return;
    if (!this.app.profile) return;
    this.creatingNewRecord = true;
    if (!note) note = this.create_modal_note_field.value.trim();
    if (!title) title = this.create_modal_title_field.value.trim();
    const model = this.create_dialog_model.value;
    const modelLock = this.create_model_lock.checked;
    const includePromptsInContext = this.create_include_prompts_in_context.checked;

    this.create_game_afterfeed_button.innerHTML = "Creating...";
    document.body.classList.add("creating_new_session");
    let label = this.scrapeLabels();
    if (bulkLabel) {
      if (label) label += ",";
      label += bulkLabel;
    }
    const body: any = {
      documentType: "chatSession",
      label,
      note,
      title,
      model,
      includePromptsInContext,
      model_lock: modelLock,
      firstPrompt: this.create_modal_prompt_field.value.trim(),
    };

    const systemMessage = this.system_message_field.value.trim();
    if (systemMessage) body.systemMessage = systemMessage;

    if (this.document_usage_cap_field.value.trim() !== "") {
      body.creditUsageLimit = this.document_usage_cap_field.value.trim();
    }

    const token = await getAuth().currentUser?.getIdToken() as string;
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
      if (!bulkMode) {
        const a = document.createElement("a");
        a.setAttribute("href", `/session/${json.gameNumber}`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
    this.create_game_afterfeed_button.innerHTML = "<i class=\"material-icons\">add</i> Session";
    console.log(json);
    return json;
  }
  /** scrape labels from dom and return comma delimited list
  * @return { string } comma delimited list
  */
  scrapeLabels(): string {
    const data = this.createLabelsSlimSelect.getData();
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
  async show(label = "", forceAdvanced = false) {
    this.create_modal_note_field.value = "";
    if (!forceAdvanced) {
      this.create_modal_template_file.value = "";
      this.updateParsedFileStatus();
    }

    this.create_modal_users_file.value = "";
    await this.updateUsersListFile();
    this.updateBulkBatchStatus();

    if (getAuth().currentUser && getAuth().currentUser?.isAnonymous) {
      alert("Anonymous can only join already created sessions (no create)");
      return;
    }

    let labelString = this.app.profile.documentLabels;
    if (!labelString) labelString = "";
    const labelArray = labelString.split(",");
    const selectItems: any[] = [];
    labelArray.forEach((label: string) => {
      if (label.trim()) {
        selectItems.push({
          text: label.trim(),
        });
      }
    });

    this.createLabelsSlimSelect.setData(selectItems);

    this.insert_todaylabel_default_checkbox.checked = this.app.profile.insertTodayAsLabel === true;
    if (this.app.profile.insertTodayAsLabel) this.addTodayAsLabel();
    if (label) this.addTodayAsLabel(label);

    const downloadCSV = (this.app.profile.bulkDownloadCSV === true);
    this.downloadcsv_radio.checked = downloadCSV;
    this.sendemails_radio.checked = !downloadCSV;

    if (forceAdvanced) {
      this.template_create_options.click();
      this.tabChangeHandler(2, false);
    } else {
      this.basic_create_options.click();
      this.tabChangeHandler(0, false);
    }

    this.updateBulkEmailTemplate();
    this.updateBulkBatchStatus();

    const modal = new (<any>window).bootstrap.Modal("#createDocumentModal", {});
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
    fileContent += `<th>row</th>`;
    keys.forEach((key: string) => fileContent += `<th>${key}</th>`);
    fileContent += "</tr>";

    importData.forEach((row: any, index: number) => {
      fileContent += "<tr>";
      fileContent += `<th>${index + 1}</th>`;
      keys.forEach((key: string) => {
        let value = row[key];
        if (value === undefined) value = "";
        fileContent += `<td>${BaseApp.escapeHTML(value)}</td>`;
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
    this.bulkUsersImportData = [];
    const importData = await ChatDocument.getImportDataFromDomFile(this.create_modal_users_file);
    let fileContent = "<table tabindex class=\"file_preview_table\">";
    fileContent += "<tr><th>row</th><th>name</th><th>email</th><th>title</th><th>label</th></tr>";

    this.bulkRowsWithNoEmail = 0;
    this.bulkEmailTotalCount = 0;
    importData.forEach((row: any, index: number) => {
      const email = row["email"] ? row["email"] : "";
      const name = row["name"] ? row["name"] : "";
      const title = row["title"] ? row["title"] : "";
      const label = row["label"] ? row["label"] : "";

      let invalidEmail = "";
      const validateResult = BaseApp.validateEmailList(email);
      if (email && validateResult) {
        const emails = email.split(";");
        this.bulkEmailTotalCount += emails.length;
        this.bulkUsersImportData.push({
          email,
          name,
          title,
          label,
        });
        invalidEmail = "";
      } else {
        this.bulkRowsWithNoEmail++;
        invalidEmail = "bulkInvalidEmail ";
      }
      fileContent += `<tr class="${invalidEmail}">`;
      fileContent += `<th>${index + 1}</th>`;
      fileContent += `<td>${BaseApp.escapeHTML(name)}</td><td>${BaseApp.escapeHTML(email)}</td>` +
        `<td>${BaseApp.escapeHTML(title)}</td><td>${BaseApp.escapeHTML(label)}</td>`;
      fileContent += "</tr>";
    });

    fileContent += `</table>`;

    this.preview_bulk_template.innerHTML = fileContent;
    let contentCount = "";
    contentCount = (importData.length - this.bulkRowsWithNoEmail) + " / " + importData.length + " rows, " +
      this.bulkEmailTotalCount + " emails";

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

    const data = this.createLabelsSlimSelect.getData();
    let newLabel = true;
    data.forEach((item: any) => {
      if (item.text === label) newLabel = false;
    });
    if (newLabel) {
      data.push(<any>{
        text: today,
        selected: true,
      });
      this.createLabelsSlimSelect.setData(data);
    }
  }
}
