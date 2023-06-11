import BaseApp from "./baseapp.js";
import LoginHelper from "./loginhelper.js";
import DocOptionsHelper from "./docoptionshelper.js";
import DocCreateHelper from "./doccreatehelper.js";
import {
  HelpHelper,
} from "./helphelper.js";
import {
  ChatDocument,
} from "./chatdocument.js";

declare const firebase: any;
declare const window: any;

/** Guess app class */
export class SessionApp extends BaseApp {
  maxTokenPreviewChars = 30;
  documentId: any;
  lastTicketsSnapshot: any = [];
  gameSubscription: any;
  assistsSubscription: any;
  ticketsSubscription: any;
  lastAssistsSnapShot: any;
  ticketFeedRegistered = false;
  recentDocumentFeedRegistered = false;
  recentDocumentsSubscription: any = null;
  lastInputTokenCount = 0;
  lastDocumentsSnapshot: any = null;
  sessionDocumentData: any;
  alertErrors = false;
  mobileLayoutCache: any = null;
  ticketsLookup: any = {};
  ticketsTokenCounts: any = {};
  assistsLookup: any = {};
  includeTotalTokens = 0;
  includeMessageTokens = 0;
  includeAssistTokens = 0;
  ticketCount = 0;
  ticketIsPending = false;
  selectedTicketCount = 0;
  login = new LoginHelper(this);
  documentOptions = new DocOptionsHelper(this);
  documentCreate = new DocCreateHelper(this);
  helpHelper = new HelpHelper(this);
  markdownConverter = new window.showdown.Converter();
  documentsLookup: any = {};
  lastDocumentOptionChange = 0;
  sliderChangeDebounceTimeout: any = {};
  sliderPaintDebounceTimeout: any = {};
  fragmentCache: any = {};
  copyResponseCache: any = {};
  copyTicketCache: any = {};
  ticket_stats: any = document.querySelector(".ticket_stats");
  updateAssistFeedTimeout: any = null;
  excludingTicketsRunning = false;
  paintOptionsDebounceTimer: any = null;
  lastMembersHTMLCache = "";
  defaultUIEngineSettings: any = {
    model: "gpt-3.5-turbo",
    max_tokens: 500,
    temperature: 1,
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
  };

  chat_history_tokens: any = document.querySelector(".chat_history_tokens");
  chat_completion_tokens: any = document.querySelector(".chat_completion_tokens");
  chat_new_prompt_tokens: any = document.querySelector(".chat_new_prompt_tokens");
  chat_threshold_total_tokens: any = document.querySelector(".chat_threshold_total_tokens");
  exclude_tickets_button: any = document.querySelector(".exclude_tickets_button");
  sidebar_tree_menu: any = document.querySelector(".sidebar_tree_menu");
  mobile_sidebar_Menu_Layout_container: any = document.querySelector(".mobile_sidebar_Menu_Layout_container");
  desktop_sidebar_menu_wrapper: any = document.querySelector(".desktop_sidebar_menu_wrapper");
  menu_nav_bar: any = document.querySelector(".menu_nav_bar");
  left_panel_view: any = document.querySelector(".left_panel_view");
  session_sidebar_splitter_div: any = document.querySelector(".session_sidebar_splitter_div");

  tickets_list: any = document.querySelector(".tickets_list");
  members_list: any = document.querySelector(".members_list");

  send_ticket_button: any = document.querySelector(".send_ticket_button");
  ticket_content_input: any = document.querySelector(".ticket_content_input");
  prompt_token_count: any = document.querySelector(".prompt_token_count");
  total_prompt_token_count: any = document.querySelector(".total_prompt_token_count");
  token_visualizer_preview: any = document.querySelector(".token_visualizer_preview");

  show_document_options_modal: any = document.querySelector(".show_document_options_modal");
  show_document_options_help: any = document.querySelector(".show_document_options_help");
  show_profile_modal: any = document.querySelector(".show_profile_modal");
  show_create_modal: any = document.querySelector(".show_create_modal");

  docfield_model: any = document.querySelector(".docfield_model");
  docfield_max_tokens: any = document.querySelector(".docfield_max_tokens");
  docfield_temperature: any = document.querySelector(".docfield_temperature");
  docfield_top_p: any = document.querySelector(".docfield_top_p");
  docfield_presence_penalty: any = document.querySelector(".docfield_presence_penalty");
  docfield_frequency_penalty: any = document.querySelector(".docfield_frequency_penalty");
  document_menutop_usage_stats_line: any = document.querySelector(".document_menutop_usage_stats_line");
  last_activity_display: any = document.querySelector(".last_activity_display");
  document_export_button: any = document.querySelector(".document_export_button");
  document_import_button: any = document.querySelector(".document_import_button");
  ticket_count_span: any = document.querySelector(".ticket_count_span");
  selected_ticket_count_span: any = document.querySelector(".selected_ticket_count_span");
  reset_engine_options_button: any = document.querySelector(".reset_engine_options_button");

  show_document_options_popup: any = document.getElementById("show_document_options_popup");
  temperature_slider_label: any = document.querySelector(".temperature_slider_label");
  top_p_slider_label: any = document.querySelector(".top_p_slider_label");
  presence_penalty_slider_label: any = document.querySelector(".presence_penalty_slider_label");
  frequency_penalty_slider_label: any = document.querySelector(".frequency_penalty_slider_label");
  max_tokens_slider_label: any = document.querySelector(".max_tokens_slider_label");
  recent_documents_list: any = document.querySelector(".recent_documents_list");
  sidebar_document_title: any = document.querySelector(".sidebar_document_title");
  menu_bar_doc_title: any = document.querySelector(".menu_bar_doc_title");
  show_overthreshold_dialog: any = document.querySelector(".show_overthreshold_dialog");
  show_token_threshold_dialog_help: any = document.querySelector(".show_token_threshold_dialog_help");
  show_create_modal_on_bar: any = document.querySelector(".show_create_modal_on_bar");

  auto_run_overthreshold_ticket: any = document.querySelector(".auto_run_overthreshold_ticket");
  overthresholdModalDialog: any = document.querySelector("#overthresholdModalDialog");

  /**  */
  constructor() {
    super();

    this.send_ticket_button.addEventListener("click", () => this.sendTicketToAPI());
    this.auto_run_overthreshold_ticket.addEventListener("click", () => this.sendTicketToAPI(true));
    this.ticket_content_input.addEventListener("keydown", (e: any) => {
      if (e.key === "Enter" && e.shiftKey === false) {
        e.preventDefault();
        e.stopPropagation();
        this.sendTicketToAPI();
      }
      if (this.atBottom(this.tickets_list)) {
        setTimeout(() => this.scrollTicketListBottom(), 100);
      }
    });
    // redraw message feed to update time since values
    setInterval(() => this.updateTimeSince(this.tickets_list), this.timeSinceRedraw);

    this.ticket_content_input.addEventListener("input", () => this.updatePromptTokenStatus());
    this.show_document_options_modal.addEventListener("click", () => {
      this.show_document_options_popup.click();
      this.documentOptions.show(this.documentId, this.sessionDocumentData);
    });
    this.show_document_options_help.addEventListener("click", () => this.helpHelper.show("engine"));
    this.show_token_threshold_dialog_help.addEventListener("click", () => this.helpHelper.show("engine"));

    this.docfield_temperature.addEventListener("input", () => this.optionSliderChange(true, "temperature",
      this.docfield_temperature, this.temperature_slider_label, "Temperature: "));
    this.docfield_top_p.addEventListener("input", () => this.optionSliderChange(true, "top_p",
      this.docfield_top_p, this.top_p_slider_label, "Top P: "));
    this.docfield_presence_penalty.addEventListener("input", () => this.optionSliderChange(true, "presence_penalty",
      this.docfield_presence_penalty, this.presence_penalty_slider_label, "Presence Penalty: "));
    this.docfield_frequency_penalty.addEventListener("input", () => this.optionSliderChange(true, "frequency_penalty",
      this.docfield_frequency_penalty, this.frequency_penalty_slider_label, "Frequency Penalty: "));
    this.docfield_max_tokens.addEventListener("input", () => this.optionSliderChange(true, "max_tokens",
      this.docfield_max_tokens, this.max_tokens_slider_label, "Completion Tokens: "));
    this.docfield_model.addEventListener("change", () => {
      if (this.sessionDocumentData.archived) {
        this.docfield_model.value = this.sessionDocumentData.model;
      } else {
        this.saveDocumentOption("model", this.docfield_model.value);
      }
    });
    this.reset_engine_options_button.addEventListener("click", () => this.resetEngineDefaults());

    this.updateMobileLayout();
    this.exclude_tickets_button.addEventListener("click", () => this.autoExcludeTicketsToMeetThreshold());

    window.addEventListener("resize", () => {
      this.updateMobileLayout();
    });

    this.ticket_content_input.addEventListener("keydown", () => this.autoSizeTextArea());
    this.ticket_content_input.addEventListener("focus", () => document.body.classList.add("show_send_bar_display_header"));
    this.ticket_content_input.addEventListener("blur", () => {
      if (document.activeElement === this.ticket_content_input) return;
      document.body.classList.remove("show_send_bar_display_header");
    });

    this.show_profile_modal.addEventListener("click", (event: any) => {
      event.stopPropagation();
      event.preventDefault();

      this.profileHelper.show();
    });
    this.show_create_modal.addEventListener("click", (event: any) => {
      event.stopPropagation();
      event.preventDefault();

      this.documentCreate.show();
    });
    this.show_create_modal_on_bar.addEventListener("click", (event: any) => {
      event.stopPropagation();
      event.preventDefault();

      this.documentCreate.show();
    });

    this.overthresholdModalDialog.addEventListener("shown.bs.modal", () => {
      this.exclude_tickets_button.focus();
    });

    this.scrollTicketListBottom();
    this.autoSizeTextArea();
  }
  /** expand prompt input textarea */
  autoSizeTextArea() {
    const el = this.ticket_content_input;
    setTimeout(() => {
      el.style.height = "auto";
      let height = el.scrollHeight;
      if (height < 80) {
        el.style.height = "60px";
        if (el.scrollHeight < 65) height = 60;
      }
      el.style.height = height + "px";
    }, 0);
  }
  /** update temperature label and save to api
   * @param { boolean } saveToAPI true to save slider value to api
   * @param { string } sliderField document name of field
   * @param { any } sliderCtl dom input
   * @param { any } sliderLabel dom label to update on change
   * @param { string } prefix included in label update
  */
  async optionSliderChange(saveToAPI = false, sliderField: string, sliderCtl: any,
    sliderLabel: any, prefix: string) {
    let value = Number(sliderCtl.value);
    if (isNaN(value)) value = 0;
    let outPercent = Math.round(value * 100) + "%";
    if (sliderField === "max_tokens") outPercent = value.toString();
    BaseApp.setHTML(sliderLabel, prefix + "<span>" + outPercent + "</span>");

    if (value !== this.defaultUIEngineSettings[sliderField]) sliderLabel.classList.add("engine_field_not_default");
    else sliderLabel.classList.remove("engine_field_not_default");

    // only update every 50ms
    if (saveToAPI) {
      if (this.sliderChangeDebounceTimeout[sliderField]) clearTimeout(this.sliderChangeDebounceTimeout[sliderField]);
      this.lastDocumentOptionChange = new Date().getTime();
      this.sliderChangeDebounceTimeout[sliderField] = setTimeout(() => {
        this.saveDocumentOption(sliderField, Number(sliderCtl.value));
        this.sliderChangeDebounceTimeout[sliderField] = null;
      }, 75);
    }
  }
  /** setup data listender for user messages */
  async initTicketFeed() {
    if (this.ticketFeedRegistered) return;
    this.ticketFeedRegistered = true;

    if (this.ticketsSubscription) this.ticketsSubscription();

    this.ticketsSubscription = firebase.firestore().collection(`Games/${this.documentId}/tickets`)
      .orderBy(`submitted`, "desc")
      .limit(500)
      .onSnapshot((snapshot: any) => this.updateTicketsFeed(snapshot));

    if (this.assistsSubscription) this.assistsSubscription();

    this.assistsSubscription = firebase.firestore().collection(`Games/${this.documentId}/assists`)
      .orderBy(`created`, "desc")
      .limit(500)
      .onSnapshot((snapshot: any) => this.updateAssistsFeed(snapshot));
  }
  /** setup data listener for recent document feed */
  async initRecentDocumentsFeed() {
    if (this.recentDocumentFeedRegistered) return;
    this.recentDocumentFeedRegistered = true;

    if (this.recentDocumentsSubscription) this.recentDocumentsSubscription();
    this.recentDocumentsSubscription = firebase.firestore().collection(`Games`)
      .orderBy(`members.${this.uid}`, "desc")
      .limit(6)
      .onSnapshot((snapshot: any) => this.updateRecentDocumentFeed(snapshot));
  }
  /** paint recent document feed
  * @param { any } snapshot firestore query data snapshot
  */
  updateRecentDocumentFeed(snapshot: any = null) {
    if (snapshot) this.lastDocumentsSnapshot = snapshot;
    else if (this.lastDocumentsSnapshot) snapshot = this.lastDocumentsSnapshot;
    else return;

    let html = "";
    this.lastDocumentsSnapshot.forEach((doc: any) => {
      if (doc.id !== this.documentId) {
        const data = doc.data();
        let title = BaseApp.escapeHTML(data.title);
        if (!title) title = "unused";
        // const activityDate = data.created.substring(5, 16).replace("T", " ").replace("-", "/");
        title = title.substring(0, 100);
        const activityDate = this.showGmailStyleDate(new Date(data.lastActivity));
        const rowHTML = `<li>
        <a href="/session/?id=${doc.id}">
          <div class="sidebar_tree_recent_title title">${title}</div>
          <div class="activity_date">${activityDate}</div>
        </a></li>`;
        html += rowHTML;
      }
    });
    this.recent_documents_list.innerHTML = html;
  }
  /** paint user message feed
 * @param { any } snapshot firestore query data snapshot
 */
  updateAssistsFeed(snapshot: any = null) {
    if (!window.hljs || !window.hljs.highlightElement) {
      clearTimeout(this.updateAssistFeedTimeout);
      this.updateAssistFeedTimeout = setTimeout(() => this.updateAssistsFeed(snapshot), 30);
      return;
    }
    if (snapshot) this.lastAssistsSnapShot = snapshot;
    else if (this.lastAssistsSnapShot) snapshot = this.lastAssistsSnapShot;
    else return;
    const scrollToBottom = this.atBottom(this.tickets_list);
    this.assistsLookup = {};
    snapshot.forEach((doc: any) => this.assistsLookup[doc.id] = doc.data());

    this.ticketIsPending = false;
    const ticketIds = Object.keys(this.ticketsLookup);
    ticketIds.forEach((ticketId: string) => {
      const ticketData = this.ticketsLookup[ticketId];
      const assistData = this.assistsLookup[ticketId];
      const card: any = this.tickets_list.querySelector(`div[ticketid="${ticketId}"]`);
      if (card) {
        const ticketRunning = ChatDocument.isTicketRunning(ticketData, assistData);

        const assistSection: any = card.querySelector(`.assist_section`);
        const totalSpan: any = card.querySelector(`.tokens_total`);
        const promptSpan: any = card.querySelector(`.tokens_prompt`);
        const completionSpan: any = card.querySelector(`.tokens_completion`);
        totalSpan.innerHTML = "";
        promptSpan.innerHTML = "";
        completionSpan.innerHTML = "";

        if (!ticketRunning) {
          if (assistData.success) {
            if (assistData.assist.error) {
              let result = "";
              if (assistData.assist.error.code) {
                result += assistData.assist.error.code + " ";
              }
              if (assistData.assist.error.message) {
                result += assistData.assist.error.message + " ";
              }
              assistSection.innerHTML = result;
            } else {
              const completionRawText = assistData.assist.choices["0"].message.content;
              const markDownPieces = completionRawText.split("```");
              const l = markDownPieces.length;
              assistSection.innerHTML = "";
              markDownPieces.forEach((responseFrag: string, index: number) => {
                const fragmentId = ticketId + "_" + index;
                this.fragmentCache[fragmentId] = responseFrag;
                if (index % 2 === 1 && index < l - 1) {
                  const htmlForMarkdown = this.markdownConverter.makeHtml("```" + responseFrag + "```");

                  const sectionDiv = document.createElement("div");
                  sectionDiv.innerHTML = `<div class="code_block_wrapper">` +
                    htmlForMarkdown + "</div>";

                  window.hljs.configure({
                    ignoreUnescapedHTML: true,
                  });
                  window.hljs.highlightElement(sectionDiv.children[0]);
                  const btn = document.createElement("button");
                  btn.setAttribute("fragmentid", fragmentId);
                  btn.setAttribute("class", "copy_code_block_button btn btn-secondary");
                  btn.innerHTML = `<i class="material-icons">content_copy</i>`;
                  sectionDiv.children[0].appendChild(btn);

                  if (sectionDiv.children.length > 0) assistSection.appendChild(sectionDiv.children[0]);
                } else {
                  const sectionDiv = document.createElement("div");
                  sectionDiv.innerHTML = "<div>" + BaseApp.escapeHTML(responseFrag) + "</div>";
                  if (sectionDiv.children.length > 0) assistSection.appendChild(sectionDiv.children[0]);
                }
              });

              assistSection.querySelectorAll(".copy_code_block_button").forEach((btn: any) => {
                btn.addEventListener("click", () => {
                  const data = this.fragmentCache[btn.getAttribute("fragmentid")];
                  navigator.clipboard.writeText(data);
                  const buttonText = `<i class="material-icons">content_copy</i>`;
                  btn.innerHTML = "✅ " + buttonText;
                  setTimeout(() => btn.innerHTML = buttonText, 1200);
                });
              });

              this.copyResponseCache[ticketId] = completionRawText;
              const btn = document.createElement("button");
              btn.setAttribute("ticketid", ticketId);
              btn.setAttribute("class", "copy_response_block_button btn btn-secondary");
              btn.innerHTML = `<i class="material-icons">content_copy</i>`;
              assistSection.appendChild(btn);
              btn.addEventListener("click", () => {
                const data = this.copyResponseCache[<any>btn.getAttribute("ticketid")];
                navigator.clipboard.writeText(data);
                const buttonText = `<i class="material-icons">content_copy</i>`;
                btn.innerHTML = "✅ " + buttonText;
                setTimeout(() => btn.innerHTML = buttonText, 1200);
              });

              const continueButton = document.createElement("button");
              continueButton.setAttribute("class", "continue_previous_response btn btn-primary");
              continueButton.innerHTML = `Continue`;
              assistSection.appendChild(continueButton);
              continueButton.addEventListener("click", () => this.sendTicketToAPI(true, "Continue Previous"));

              totalSpan.innerHTML = assistData.assist.usage.total_tokens;
              promptSpan.innerHTML = assistData.assist.usage.prompt_tokens;
              completionSpan.innerHTML = assistData.assist.usage.completion_tokens;

              let responseCap = this.sessionDocumentData.max_tokens;
              if (ticketData.max_tokens !== undefined) responseCap = ticketData.max_tokens;
              if (assistData.assist.usage.completion_tokens >= responseCap) {
                card.classList.add("completion_max_tokens_reached");
              } else {
                card.classList.remove("completion_max_tokens_reached");
              }
            }
          } else {
            let msg = "API Error";
            if (assistData.error) msg = assistData.error;
            assistSection.innerHTML = msg;
          }
        }

        const lastSubmit: any = card.querySelector(`.last_submit_time`);
        if (ticketRunning) {
          BaseApp.setHTML(assistSection, `<div class="pending_message">Prompt sent to OpenAI for processing...</div>`);
          card.classList.add("ticket_running");
          lastSubmit.dataset.showseconds = "1";
          this.ticketIsPending = true;
        } else {
          card.classList.remove("ticket_running");
          lastSubmit.dataset.showseconds = "0";
        }
      }
    });

    if (this.ticketIsPending) document.body.classList.add("ticket_sent_api_pending");
    else document.body.classList.remove("ticket_sent_api_pending");

    this.updatePromptTokenStatus();
    if (scrollToBottom) {
      this.scrollTicketListBottom();
      setTimeout(() => this.scrollTicketListBottom(), 100);
      setTimeout(() => this.scrollTicketListBottom(), 150);
    }
    this._updateGameMembersList();
  }
  /** tests if dom scroll is at bottom
   * @param { any } ele element to test
   * @return { boolean } true is scrolled to bottom
   */
  atBottom(ele: any): boolean {
    if (ele.scrollTop + ele.offsetHeight >= ele.scrollHeight) return true;
    return false;
  }
  /** */
  scrollTicketListBottom() {
    this.tickets_list.offsetHeight;
    this.tickets_list.scrollTop = this.tickets_list.scrollHeight;
    setTimeout(() => this.tickets_list.scrollTop = this.tickets_list.scrollHeight, 20);
    setTimeout(() => this.tickets_list.scrollTop = this.tickets_list.scrollHeight, 50);
  }
  /** paint user message feed
   * @param { any } snapshot firestore query data snapshot
   */
  updateTicketsFeed(snapshot: any = null) {
    if (!this.sessionDocumentData) {
      setTimeout(() => this.updateTicketsFeed(snapshot), 50);
      return;
    }
    if (snapshot) this.lastTicketsSnapshot = snapshot;
    else if (this.lastTicketsSnapshot) snapshot = this.lastTicketsSnapshot;
    else return;

    const scrollToBottom = this.atBottom(this.tickets_list);
    const oldKeys = Object.keys(this.ticketsLookup);
    this.ticketsLookup = {};
    this.selectedTicketCount = 0;
    this.ticketCount = 0;
    snapshot.forEach((doc: any) => {
      this.ticketCount++;
      let card: any = this.tickets_list.querySelector(`div[ticketid="${doc.id}"]`);
      if (!card) {
        card = this.getTicketCardDom(doc.id, doc.data());
      }
      this.tickets_list.insertBefore(card, this.tickets_list.firstChild);
      this.ticketsLookup[doc.id] = doc.data();

      if (this.ticketsLookup[doc.id].includeInMessage) this.selectedTicketCount++;

      const chkBox: any = card.querySelector(`input[ticketid="${doc.id}"]`);
      const submittedTime: any = card.querySelector(".last_submit_time");
      submittedTime.setAttribute("data-timesince", doc.data().submitted);

      let name = this.sessionDocumentData.memberNames[this.ticketsLookup[doc.id].uid];
      if (!name) name = "Anonymous";
      const ele1: any = card.querySelector(".ticket_owner_name");
      if (ele1.innerHTML !== name) {
        ele1.innerHTML = name;
        ele1.setAttribute("ticketowneruid", this.ticketsLookup[doc.id].uid);
      }

      let img = this.sessionDocumentData.memberImages[this.ticketsLookup[doc.id].uid];
      if (!img) img = "/images/defaultprofile.png";
      const ele: any = card.querySelector(".ticket_owner_image");
      if (ele.style.backgroundImage !== `url(${img})`) {
        ele.style.backgroundImage = ``;
        ele.style.backgroundImage = `url(${img})`;
        ele.setAttribute("ticketowneruid", this.ticketsLookup[doc.id].uid);
      }

      if (this.ticketsLookup[doc.id].includeInMessage === true) {
        chkBox.checked = true;
        card.classList.add("ticket_selected");
        card.classList.remove("ticket_not_selected");
      } else {
        chkBox.checked = false;
        card.classList.remove("ticket_selected");
        card.classList.add("ticket_not_selected");
      }
    });

    oldKeys.forEach((key: string) => {
      if (!this.ticketsLookup[key]) {
        const card: any = this.tickets_list.querySelector(`div[ticketid="${key}"]`);
        if (card) card.remove();
      }
    });

    const tempCards = this.tickets_list.querySelectorAll(`.temp_ticket_card`);
    tempCards.forEach((card: any) => card.remove());

    this.updateTimeSince(this.tickets_list);
    this.updatePromptTokenStatus();
    this.updateAssistsFeed(null);

    this.ticket_count_span.innerHTML = this.ticketCount;
    this.selected_ticket_count_span.innerHTML = this.selectedTicketCount;
    this.ticket_stats.innerHTML = this.selectedTicketCount;

    if (scrollToBottom) this.scrollTicketListBottom();
  }
  /** send rerun request to api
   * @param { any } reRunBtn dom button
   * @param { string } ticketId doc id
   * @param { any } card card dom
   */
  async reRunTicket(reRunBtn: any, ticketId: string, card: any): Promise<void> {
    let removedTickets: Array<any> = [];
    if (this.isOverSendThreshold()) {
      if (this.profile.autoExclude) {
        this.excludingTicketsRunning = false;
        removedTickets = this.autoExcludeTicketsToMeetThreshold();
      }
    }
    const includeTickets = this.generateSubmitList(ticketId, removedTickets);
    card.classList.add("running_ticket");
    card.remove();
    const ticket = this.ticketsLookup[ticketId];
    ticket.uid = this.uid;
    ticket.memberName = this.profile.displayName;
    ticket.memberImage = this.profile.memberImage;
    const tempCard = this.getTicketCardDom(new Date().toISOString(), ticket, true);
    this.tickets_list.appendChild(tempCard);

    this.scrollTicketListBottom();

    const body = {
      gameNumber: this.documentId,
      includeTickets,
      reRunTicket: ticketId.toString(),
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/session/message", {
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
      console.log("ticket rerun post", json);
      alert(json.errorMessage);
    }

    // refresh the counts
    this.scrollTicketListBottom();
  }
  /** api call for delete user message
   * @param { any } btn dom control
   * @param { string } gameNumber firestore game document id
   * @param { string } ticketId firestore message id
   */
  async deleteTicket(btn: any, gameNumber: string, ticketId: string) {
    if (!confirm("Are you sure you want to delete this ticket?")) {
      return;
    }

    const card: any = this.tickets_list.querySelector(`div[ticketid="${ticketId}"]`);
    if (card) card.remove();

    const body = {
      gameNumber,
      ticketId,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/session/message/delete", {
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
      alert("Delete ticket failed");
    }
  }
  /** query dom for all ticket_owner_image and ticket_owner_name elements and update */
  updateUserNamesImages() {
    const imgCtls = document.querySelectorAll(".ticket_owner_image");
    const nameCtls = document.querySelectorAll(".ticket_owner_name");

    imgCtls.forEach((imgCtl: any) => {
      const uid: any = imgCtl.getAttribute("ticketowneruid");
      if (uid !== undefined) {
        let imgPath = this.sessionDocumentData.memberImages[uid];
        if (!imgPath) imgPath = "/images/defaultprofile.png";
        imgCtl.style.backgroundImage = "url(" + imgPath + ")";
      }
    });

    nameCtls.forEach((nameCtl: any) => {
      const uid: any = nameCtl.getAttribute("ticketowneruid");
      if (uid !== undefined) {
        let name = this.sessionDocumentData.memberNames[uid];
        if (!name) name = "Anonymous";
        BaseApp.setHTML(nameCtl, name);
      }
    });
  }
  /** generate html for message card
   * @param { string } ticketId doc id
   * @param { any } data firestore message document
   * @param { boolean } tempTicket remove on next document refresh
   * @return { any } card
   */
  getTicketCardDom(ticketId: string, data: any, tempTicket = false): any {
    const gameOwnerClass = data.isGameOwner ? " ticket_game_owner" : "";
    const ownerClass = data.uid === this.uid ? " ticket_owner" : "";

    const tempTicketClass = tempTicket ? " temp_ticket_card" : "";
    const cardWrapper = document.createElement("div");
    const cardClass = `mt-1 game_message_list_item${gameOwnerClass}${ownerClass}${tempTicketClass} ticket_running`;
    const cardHTML =
      `<div class="${cardClass}" ticketid="${ticketId}" chatroomid="${ticketId}">
      <span class="tokens_prompt"></span>
      <div class="m-1 user_assist_request_header">
        <div style="flex:1;" class="ticket_user_display_header d-flex flex-column">
            <div class="user_assist_request_header_user" >
              <span class="ticket_owner_image" ticketowneruid=""></span>
              <span class="ticket_owner_name" ticketowneruid=""></span>
            </div>
          </div>
          <button class="rerun_ticket btn btn-secondary" data-ticketid="${ticketId}"><i
                  class="material-icons">loop</i></button>
          <button class="delete_ticket btn btn-secondary" data-chatroomid="${data.gameNumber}"
              data-messageid="${ticketId}">
              <i class="material-icons">delete</i>
          </button>
          <div class="tokens_total_since_wrapper">
            <div class="time_since last_submit_time" data-timesince="${data.submitted}" data-showseconds="1"></div>
            <div class="tokens_total"></div>
          </div>
          <div>
            <input class="form-check-input ticket_item_include_checkbox" 
              type="checkbox" ticketid="${ticketId}" checked value="">
          </div>
      </div>
      <div class="ticket_header_section">
          <button class="copy_ticket_to_clipboard btn btn-secondary"><i class="material-icons">content_copy</i></button>
          <div class="message">${BaseApp.escapeHTML(data.message)}</div>
      </div>
      <div class="assist_section_wrapper">
          <div class="tokens_completion"></span></div>
          <div class="assist_section"><div class="pending_message">Prompt sent to OpenAI for processing...</div></div>
      </div>
      <hr>
  </div>`;
    cardWrapper.innerHTML = cardHTML;
    const cardDom = cardWrapper.children[0];

    const copyClipboardBtn: any = cardDom.querySelector(".copy_ticket_to_clipboard");
    copyClipboardBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(data.message);
      const buttonText = `<i class="material-icons">content_copy</i>`;
      copyClipboardBtn.innerHTML = "✅ " + buttonText;
      setTimeout(() => copyClipboardBtn.innerHTML = buttonText, 1200);
    });

    const deleteBtn: any = cardDom.querySelector("button.delete_ticket");
    deleteBtn.addEventListener("click", () =>
      this.deleteTicket(deleteBtn, deleteBtn.dataset.chatroomid, deleteBtn.dataset.messageid));

    const reRunBtn: any = cardDom.querySelector("button.rerun_ticket");
    reRunBtn.addEventListener("click", () => this.reRunTicket(reRunBtn, reRunBtn.dataset.ticketid, cardDom));

    const includeChkBox: any = cardDom.querySelector(".ticket_item_include_checkbox");
    includeChkBox.addEventListener("input", async () => {
      if (!this.sessionDocumentData) return;
      if (!this.sessionDocumentData.archived) {
        this.includeTicketSendToAPI(reRunBtn.dataset.ticketid, includeChkBox.checked);
      } else {
        includeChkBox.checked = data.includeInMessage;
      }
    });

    return cardDom;
  }
  /** send include update to api
   * @param { string } ticketId doc id
   * @param { include } include whether to include in messages
  */
  async includeTicketSendToAPI(ticketId: string, include: boolean) {
    const body = {
      gameNumber: this.documentId,
      ticketId,
      include,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/session/message/include", {
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
      console.log("ticket include fail post", json);
    }
  }
  /** api user send message
   * @param { boolean } ignoreThreshold true to send regardless of size
   * @param { string } message optional - read from ticket_content_input if not provided
  */
  async sendTicketToAPI(ignoreThreshold = false, message = "") {
    let removedTickets: Array<any> = [];
    if (this.isOverSendThreshold() && !ignoreThreshold) {
      if (this.profile.autoExclude) {
        this.excludingTicketsRunning = false;
        removedTickets = this.autoExcludeTicketsToMeetThreshold();
      } else {
        if (!ignoreThreshold) {
          this.showOverthresholdToSendModal();
          return;
        }
      }
    }

    if (!message) message = this.ticket_content_input.value.trim();
    if (message === "") {
      alert("Please supply a message");
      return;
    }
    if (this.profile.prefixName) {
      let displayName = this.profile.displayName;
      if (!displayName) displayName = "Anonymous";
      message = displayName + ": " + message;
    }
    if (message.length > 10000) message = message.substr(0, 10000);
    this.ticket_content_input.value = "";
    this.autoSizeTextArea();

    const tempTicket = {
      uid: this.uid,
      message,
      isGameOwner: this.uid === this.sessionDocumentData.createUser,
      gameNumber: this.documentId,
      submitted: new Date().toISOString(),
    };

    const tempCard = this.getTicketCardDom(new Date().toISOString(), tempTicket, true);
    this.tickets_list.appendChild(tempCard);
    this.scrollTicketListBottom();

    this.updatePromptTokenStatus();
    const includeTickets = this.generateSubmitList("", removedTickets);

    const body = {
      gameNumber: this.documentId,
      message,
      includeTickets,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/session/message", {
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
      console.log("message post", json);
      alert(json.errorMessage);
    }

    this.scrollTicketListBottom();
    setTimeout(() => this.scrollTicketListBottom(), 150);
  }
  /** process exisiting tickets and return list of ids to submit
   * @param { string } ticketId doc id
   * @param { Array<any> } removedTickets tickets to exclude
   * @return { Array<string> } list of ticket ids
  */
  generateSubmitList(ticketId = "", removedTickets: Array<any> = []): Array<string> {
    const tickets: Array<string> = [];
    this.includeTotalTokens = 0;
    this.includeMessageTokens = 0;
    this.includeAssistTokens = 0;
    // return reverse order for submission
    this.lastTicketsSnapshot.forEach((doc: any) => {
      const ticket: any = this.ticketsLookup[doc.id];
      if (removedTickets.indexOf(doc.id) === -1) {
        let include = false;
        if (ticket && ticket.includeInMessage) include = true;
        if (ticketId !== doc.id && include) {
          const tokenCountCompletion = this.tokenCountForCompletion(doc.id);
          const promptTokens = window.gpt3tokenizer.encode(ticket.message);
          if (tokenCountCompletion > 0) {
            this.includeMessageTokens += promptTokens.length;
            this.includeAssistTokens += tokenCountCompletion;
            this.includeTotalTokens += tokenCountCompletion + promptTokens.length;
            tickets.push(doc.id);
          }
        }
      }
    });
    return tickets.reverse();
  }
  /** lookup token usage
   * @param { string } assistId ticket id to check for assist
   * @return { any } assist usage data or null
  */
  tokenCountForCompletion(assistId: string): any {
    try {
      const assistData: any = this.assistsLookup[assistId];
      if (!assistData || !assistData.assist || !assistData.assist.choices ||
        !assistData.assist.choices["0"] || !assistData.assist.choices["0"].message ||
        !assistData.assist.choices["0"].message.content) return 0;

      return window.gpt3tokenizer.encode(assistData.assist.choices["0"].message.content).length;
    } catch (assistError: any) {
      console.log(assistError);
      return 0;
    }
  }
  /** BaseApp override to paint profile specific authorization parameters */
  authUpdateStatusUI() {
    super.authUpdateStatusUI();
    this.documentId = null;

    if (this.profile) {
      this.initRTDBPresence();
      if (this.profile.textOptionsLarge) document.body.classList.add("profile_text_option_large");
      else document.body.classList.remove("profile_text_option_large");
      if (this.profile.textOptionsMonospace) document.body.classList.add("profile_text_option_monospace");
      else document.body.classList.remove("profile_text_option_monospace");
      if (this.profile.lessTokenDetails) document.body.classList.add("profile_text_less_token_details");
      else document.body.classList.remove("profile_text_less_token_details");

      const gameId = this.urlParams.get("id");
      if (gameId && !this.documentId) {
        this.gameAPIJoin(gameId);
        this.documentId = gameId;
        let reloading = false;
        if (this.gameSubscription) this.gameSubscription();
        this.gameSubscription = firebase.firestore().doc(`Games/${this.documentId}`)
          .onSnapshot((doc: any) => {
            if (!doc.data() && !reloading) {
              alert("Session not found, returning to home");
              reloading = true;
              location.href = "/";
              return;
            }
            this.paintDocumentData(doc);
          });

        this.initTicketFeed();
        this.initRecentDocumentsFeed();
      }

      setTimeout(() => this._updateGameMembersList(), 50);
    }
  }
  /** paint game data (game document change handler)
   * @param { any } gameDoc firestore query snapshot
   */
  paintDocumentData(gameDoc: any = null) {
    if (gameDoc) this.sessionDocumentData = gameDoc.data();
    if (!this.sessionDocumentData) return;

    document.body.classList.add("loaded");

    BaseApp.setHTML(this.document_menutop_usage_stats_line, `<span class="usage">${this.sessionDocumentData.totalTokens}</span> Usage`);
    BaseApp.setHTML(this.last_activity_display, this.showGmailStyleDate(new Date(this.sessionDocumentData.lastActivity), true));
    BaseApp.setHTML(this.sidebar_document_title, BaseApp.escapeHTML(this.sessionDocumentData.title));
    BaseApp.setHTML(this.menu_bar_doc_title, BaseApp.escapeHTML(this.sessionDocumentData.title));

    let windowTitle = this.sessionDocumentData.title;
    if (!windowTitle) windowTitle = "New Prompt+ Session";
    document.title = windowTitle;

    this.paintDocumentOptions();
    setTimeout(() => {
      this.paintDocumentOptions();
      this._updateGameMembersList();
    }, 100);
    this.updatePromptTokenStatus();
    this.updateTicketsFeed();
  }
  /** paint game members list */
  _updateGameMembersList() {
    let html = "";
    if (this.sessionDocumentData) {
      let members: any = {};

      if (this.sessionDocumentData.members) members = this.sessionDocumentData.members;
      let membersList = Object.keys(members);
      membersList = membersList.sort((a: string, b: string) => {
        if (this.sessionDocumentData.members[a] > this.sessionDocumentData.members[b]) return -1;
        if (this.sessionDocumentData.members[a] < this.sessionDocumentData.members[b]) return 1;
        return 0;
      });

      const ticketList = Object.keys(this.ticketsLookup);
      const memberTicketCounts: any = {};
      const memberSelectedCounts: any = {};
      const memberRunningsTickets: any = {};

      ticketList.forEach((id: any) => {
        const ticketData: any = this.ticketsLookup[id];
        if (!memberTicketCounts[ticketData.uid]) memberTicketCounts[ticketData.uid] = 0;
        if (!memberSelectedCounts[ticketData.uid]) memberSelectedCounts[ticketData.uid] = 0;
        if (!memberRunningsTickets[ticketData.uid]) memberRunningsTickets[ticketData.uid] = 0;

        memberTicketCounts[ticketData.uid]++;
        if (ticketData.includeInMessage) memberSelectedCounts[ticketData.uid]++;

        const assistData = this.assistsLookup[id];
        const ticketRunning = ChatDocument.isTicketRunning(ticketData, assistData);
        if (ticketRunning) memberRunningsTickets[ticketData.uid]++;
      });

      membersList.forEach((member: string) => {
        this.addUserPresenceWatch(member);
        const data = this._gameMemberData(member);

        const timeSince = this.timeSince(new Date(members[member]));
        const isOwner = member === this.sessionDocumentData.createUser ? " is_document_owner" : "";
        let selected = memberSelectedCounts[member];
        if (selected === undefined) selected = 0;
        let ticketCount = memberTicketCounts[member];
        if (ticketCount === undefined) ticketCount = 0;
        const ticketRunningClass = memberRunningsTickets[member] > 0 ? " ticket_running_in_queue" : "";

        html += `<li class="member_list_item ${ticketRunningClass}">
        <div class="members_feed_line_wrapper${isOwner}">
            <span class="members_feed_profile_image" style="background-image:url(${data.img})"></span>
            <div class="members_feed_online_status member_online_status" data-uid="${member}"></div>
            <div class="member_name_wrapper">
              <span class="members_feed_profile_name">${data.name}</span>
            </div>
            <div class="member_activity_wrapper">
              <div class="member_prompt_count">${selected} / ${ticketCount}</div>
              <div class="member_list_time_since members_feed_profile_lastactivity">${timeSince}</div>
            </div>
          </div>
        </li>`;
      });
    }

    if (this.lastMembersHTMLCache !== html) {
      this.lastMembersHTMLCache = html;
      BaseApp.setHTML(this.members_list, html);
    }
    this.updateUserNamesImages();
    this.updateUserPresence();
  }
  /** save a single field to document
   * @param { string } field document field name
   * @param { any } value written to field
  */
  async saveDocumentOption(field: string, value: any) {
    const body: any = {
      gameNumber: this.documentId,
      [field]: value,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/games/options", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(body),
    });
    if (this.verboseLog) {
      const json = await fResult.json();
      console.log("change game options result", json);
    }
  }
  /** member data for a user
   * @param { string } uid user id
   * @return { any } name, img
   */
  _gameMemberData(uid: string) {
    let name = this.sessionDocumentData.memberNames[uid];
    let img = this.sessionDocumentData.memberImages[uid];
    if (!name) name = "Anonymous";
    if (!img) img = "/images/defaultprofile.png";

    return {
      name,
      img,
    };
  }
  /** paint user editable game options
  */
  paintDocumentOptions() {
    if (this.sessionDocumentData.createUser === this.uid) document.body.classList.add("game_owner");
    else document.body.classList.remove("game_owner");

    if (this.sessionDocumentData.archived) document.body.classList.add("archived_chat_document");
    else document.body.classList.remove("archived_chat_document");

    if (this.testForEngineNotDefault()) document.body.classList.add("engine_settings_not_default");
    else document.body.classList.remove("engine_settings_not_default");

    if (this.testForEngineTweaked()) document.body.classList.add("engine_settings_tweaked");
    else document.body.classList.remove("engine_settings_tweaked");

    const debounce = (this.lastDocumentOptionChange + 500 > new Date().getTime());

    this.docfield_model.value = this.sessionDocumentData.model;

    this.__debounceSliderPaint("max_tokens", debounce, "Completion Tokens: ");
    this.__debounceSliderPaint("temperature", debounce, "Temperature: ");
    this.__debounceSliderPaint("top_p", debounce, "Top P: ");
    this.__debounceSliderPaint("presence_penalty", debounce, "Presence Penalty: ");
    this.__debounceSliderPaint("frequency_penalty", debounce, "Frequency Penalty: ");
  }
  /** debounce painting slider so doesn't interfere with user input
   *
   * @param { string } field doc field name
   * @param { boolean } debounce true to debounce painting (delay and paint oafter slider timeout)
   * @param { string } label label to paint for value prefix
   */
  __debounceSliderPaint(field: string, debounce: boolean, label: string) {
    if (debounce && this.sliderChangeDebounceTimeout[field]) {
      clearTimeout(this.sliderPaintDebounceTimeout[field]);
      this.sliderPaintDebounceTimeout[field] = setTimeout(() => {
        this.__debounceSliderPaint(field, debounce, label);
        this.sliderPaintDebounceTimeout[field] = null;
      }, 50);
      return;
    }

    const ele: any = (this as any)["docfield_" + field];
    const labelEle: any = (this as any)[field + "_slider_label"];
    ele.value = this.sessionDocumentData[field];
    this.optionSliderChange(false, field, ele, labelEle, label);
  }
  /** update the splitter if needed */
  updateMobileLayout() {
    let desktopView = true;
    if (window.document.body.scrollWidth <= 990) {
      desktopView = false;
    }

    if (this.mobileLayoutCache !== desktopView) {
      if (desktopView) {
        this.desktop_sidebar_menu_wrapper.appendChild(this.sidebar_tree_menu);
        this.left_panel_view.insertBefore(this.menu_nav_bar, this.left_panel_view.firstChild);
        document.body.classList.remove("mobile_layout_mode");
        this.menu_nav_bar.classList.remove("fixed-top");
      } else {
        this.mobile_sidebar_Menu_Layout_container.appendChild(this.sidebar_tree_menu);
        document.body.insertBefore(this.menu_nav_bar, document.body.firstChild);
        this.menu_nav_bar.classList.add("fixed-top");
        document.body.classList.add("mobile_layout_mode");
      }
      this.mobileLayoutCache = desktopView;
    }
  }
  /** count input token */
  updatePromptTokenStatus() {
    if (!this.sessionDocumentData) return;
    // generate fresh buffer numbers
    this.generateSubmitList();

    const tokens = window.gpt3tokenizer.encode(this.ticket_content_input.value);

    let html = "";
    let totalChars = 0;
    let tokensUsed = 0;
    for (let c = tokens.length - 1; c >= 0; c--) {
      const token = tokens[c];
      const text = window.gpt3tokenizer.decode([token]);

      if (totalChars + text.length <= this.maxTokenPreviewChars) {
        tokensUsed++;
        totalChars += text.length;
        const tokenClass = (c % 2 === 0) ? "token_even" : "token_odd";
        html = `<span class="${tokenClass}">${text}</span>` + html;
      } else {
        break;
      }
    }

    if (tokensUsed < tokens.length) html = "..." + html;

    this.token_visualizer_preview.innerHTML = html;

    this.prompt_token_count.innerHTML = tokens.length;
    this.lastInputTokenCount = tokens.length;
    this.total_prompt_token_count.innerHTML = this.includeTotalTokens + tokens.length + this.sessionDocumentData.max_tokens;
    this.chat_history_tokens.innerHTML = this.includeTotalTokens;
    this.chat_completion_tokens.innerHTML = this.sessionDocumentData.max_tokens;
    this.chat_new_prompt_tokens.innerHTML = this.lastInputTokenCount;
    this.chat_threshold_total_tokens.innerHTML =
      (this.includeTotalTokens + this.sessionDocumentData.max_tokens + this.lastInputTokenCount).toString();

    if (this.isOverSendThreshold()) {
      document.body.classList.add("over_token_sendlimit");
    } else {
      document.body.classList.remove("over_token_sendlimit");
    }
  }
  /**
   *
   * @return { boolean } true if over 4096 for submit token count
   */
  isOverSendThreshold(): boolean {
    return this.includeTotalTokens + this.sessionDocumentData.max_tokens + this.lastInputTokenCount > 4096;
  }
  /** shows over threshold modal */
  showOverthresholdToSendModal() {
    this.show_overthreshold_dialog.click();
  }
  /**
   * @param { any } currentTicketId ticketid to ignore (optional)
   * @return { any } exlcudedTickets array
   */
  autoExcludeTicketsToMeetThreshold(currentTicketId: any = null): Array<any> {
    if (!this.isOverSendThreshold()) return [];
    if (this.excludingTicketsRunning) return [];
    this.excludingTicketsRunning = true;
    document.body.classList.add("exclude_tickets_running");
    let tokenReduction = this.includeTotalTokens + this.sessionDocumentData.max_tokens + this.lastInputTokenCount - 4050;

    const tickets: Array<any> = [];
    this.lastTicketsSnapshot.forEach((doc: any) => tickets.unshift(doc));
    const ticketsRemoved: Array<any> = [];
    tickets.forEach((doc: any) => {
      if (tokenReduction > 0) {
        const ticket = doc.data();
        const ticketId = doc.id;

        let include = false;
        if (ticket && ticket.includeInMessage) include = true;
        if (currentTicketId !== ticketId && include) {
          ticket.includeInMessage = false;
          this.includeTicketSendToAPI(ticketId, false);

          const tokenCountCompletion = this.tokenCountForCompletion(doc.id);
          const promptTokens = window.gpt3tokenizer.encode(ticket.message);
          tokenReduction -= tokenCountCompletion + promptTokens.length;

          ticketsRemoved.push(ticket);
        }
      }
    });

    setTimeout(() => {
      this.excludingTicketsRunning = false;
      document.body.classList.remove("exclude_tickets_running");
    }, 500);

    this.auto_run_overthreshold_ticket.focus();

    return ticketsRemoved;
  }
  /**
   * @return { boolean } true if engine is not default
  */
  testForEngineNotDefault(): boolean {
    let fieldChanged = false;
    Object.keys(this.defaultUIEngineSettings).forEach((key) => {
      const value = this.defaultUIEngineSettings[key];
      if (value.toString() !== this.sessionDocumentData[key].toString()) fieldChanged = true;
    });
    return fieldChanged;
  }
  /**
   * @return { boolean } true if engine is not default
  */
  testForEngineTweaked(): boolean {
    let fieldChanged = false;
    Object.keys(this.defaultUIEngineSettings).forEach((key) => {
      const value = this.defaultUIEngineSettings[key];
      if (key !== "model" && key !== "max_tokens") {
        if (value.toString() !== this.sessionDocumentData[key].toString()) fieldChanged = true;
      }
    });
    return fieldChanged;
  }
  /** */
  async resetEngineDefaults() {
    if (!this.testForEngineNotDefault()) return;

    const body: any = {
      gameNumber: this.documentId,
    };
    Object.assign(body, this.defaultUIEngineSettings);
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/games/options", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(body),
    });
    if (this.verboseLog) {
      const json = await fResult.json();
      console.log("reset options failed", json);
    }
    this.sliderChangeDebounceTimeout = {};
    this.paintDocumentOptions();
  }
}
