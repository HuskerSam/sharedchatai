import BaseApp from "./baseapp.js";
import DocOptionsHelper from "./docoptionshelper.js";
import ChatDocument from "./chatdocument.js";

declare const firebase: any;
declare const window: any;

/** Guess app class */
export class SessionApp extends BaseApp {
  isSessionApp = true;
  maxTokenPreviewChars = 30;
  documentId: any = null;
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
  alertErrors = false;
  mobileLayoutCache: any = null;
  ticketsLookup: any = {};
  ticketsTokenCounts: any = {};
  assistsLookup: any = {};
  includeTotalTokens = 0;
  lastSystemMessageTokenCount = 0;
  includeMessageTokens = 0;
  includeAssistTokens = 0;
  ticketCount = 0;
  ticketIsPending = false;
  selectedTicketCount = 0;
  documentOptions = new DocOptionsHelper(this);
  markdownConverter = new window.showdown.Converter();
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
  modelLimit = 0;
  excludeErrorMargin = 0.97;
  defaultUIEngineSettings: any = {
    model: "gpt-3.5-turbo",
    max_tokens: 500,
    temperature: 1,
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
  };
  systemMessageListElement: any = null;

  threshold_dialog_context_limit: any = document.querySelector(".threshold_dialog_context_limit");
  chat_history_tokens: any = document.querySelector(".chat_history_tokens");
  chat_completion_tokens: any = document.querySelector(".chat_completion_tokens");
  chat_new_prompt_tokens: any = document.querySelector(".chat_new_prompt_tokens");
  chat_system_message_tokens: any = document.querySelector(".chat_system_message_tokens");
  chat_threshold_total_tokens: any = document.querySelector(".chat_threshold_total_tokens");
  exclude_tickets_button: any = document.querySelector(".exclude_tickets_button");
  sidebar_tree_menu: any = document.querySelector(".sidebar_tree_menu");
  mobile_sidebar_menu_Layout_container: any = document.querySelector(".mobile_sidebar_menu_Layout_container");
  desktop_sidebar_menu_wrapper: any = document.querySelector(".desktop_sidebar_menu_wrapper");
  menu_nav_bar: any = document.querySelector(".menu_nav_bar");
  left_panel_view: any = document.querySelector(".left_panel_view");
  session_sidebar_splitter_div: any = document.querySelector(".session_sidebar_splitter_div");
  sidebarusers_link_copy: any = document.querySelector(".sidebarusers_link_copy");
  threshold_auto_exclude_checkbox: any = document.querySelector(".threshold_auto_exclude_checkbox");

  tickets_list: any = document.querySelector(".tickets_list");
  members_list: any = document.querySelector(".members_list");

  send_ticket_button: any = document.querySelector(".send_ticket_button");
  ticket_content_input: any = document.querySelector(".ticket_content_input");
  prompt_token_count: any = document.querySelector(".prompt_token_count");
  total_prompt_token_count: any = document.querySelector(".total_prompt_token_count");
  token_visualizer_preview: any = document.querySelector(".token_visualizer_preview");

  show_document_options_modal: any = document.querySelector(".show_document_options_modal");
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
  engine_sidebar_menu_button: any = document.querySelector(".engine_sidebar_menu_button");
  users_sidebar_menu_button: any = document.querySelector(".users_sidebar_menu_button");
  recent_sidebar_menu_button: any = document.querySelector(".recent_sidebar_menu_button");
  sidebar_engine_panel: any = document.querySelector("#sidebar_engine_panel");
  sidebar_users_panel: any = document.querySelector("#sidebar_users_panel");
  sidebar_recent_panel: any = document.querySelector("#sidebar_recent_panel");

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
  show_create_modal_on_bar: any = document.querySelector(".show_create_modal_on_bar");

  auto_run_overthreshold_ticket: any = document.querySelector(".auto_run_overthreshold_ticket");
  overthresholdModalDialog: any = document.querySelector("#overthresholdModalDialog");
  navbarSupportedContent: any = document.querySelector("#navbarSupportedContent");

  select_all_tickets_button: any = document.querySelector(".select_all_tickets_button");
  firstDocumentLoad = true;

  tokenizedStringCache: any = {};

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

    this.docfield_temperature.addEventListener("input", () => this.optionSliderChange(true, "temperature",
      this.docfield_temperature, this.temperature_slider_label, "Temperature: "));
    this.docfield_top_p.addEventListener("input", () => this.optionSliderChange(true, "top_p",
      this.docfield_top_p, this.top_p_slider_label, "Top P: "));
    this.docfield_presence_penalty.addEventListener("input", () => this.optionSliderChange(true, "presence_penalty",
      this.docfield_presence_penalty, this.presence_penalty_slider_label, "Presence Penalty: "));
    this.docfield_frequency_penalty.addEventListener("input", () => this.optionSliderChange(true, "frequency_penalty",
      this.docfield_frequency_penalty, this.frequency_penalty_slider_label, "Frequency Penalty: "));
    this.docfield_max_tokens.addEventListener("input", () => this.optionSliderChange(true, "max_tokens",
      this.docfield_max_tokens, this.max_tokens_slider_label, "Max Response Tokens: "));

    this.docfield_model.addEventListener("change", () => {
      if (this.sessionDocumentData.archived || this.docfield_model.value.indexOf("gpt-3.5") === -1) {
        this.docfield_model.value = this.sessionDocumentData.model;
        return;
      }
      this.saveDocumentOption(this.documentId, "model", this.docfield_model.value);
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

    this.overthresholdModalDialog.addEventListener("shown.bs.modal",
      () => this.exclude_tickets_button.focus());

    this.select_all_tickets_button.addEventListener("click", () => this.selectAllTickets());

    this.engine_sidebar_menu_button.addEventListener("click", () => {
      if (this.engine_sidebar_menu_button.getAttribute("aria-expanded") === "false") {
        this.saveProfileField("sidebarEngineExpanded", false);
      } else {
        this.saveProfileField("sidebarEngineExpanded", true);
      }
    });
    this.users_sidebar_menu_button.addEventListener("click", () => {
      if (this.users_sidebar_menu_button.getAttribute("aria-expanded") === "false") {
        this.saveProfileField("sidebarUsersExpanded", false);
      } else {
        this.saveProfileField("sidebarUsersExpanded", true);
      }
    });
    this.recent_sidebar_menu_button.addEventListener("click", () => {
      if (this.recent_sidebar_menu_button.getAttribute("aria-expanded") === "false") {
        this.saveProfileField("sidebarRecentExpanded", false);
      } else {
        this.saveProfileField("sidebarRecentExpanded", true);
      }
    });
    this.sidebarusers_link_copy.addEventListener("click", () => BaseApp.copyGameLink(this.documentId, this.sidebarusers_link_copy));

    this.threshold_auto_exclude_checkbox.addEventListener("input", () => {
      this.saveProfileField("autoExclude", this.threshold_auto_exclude_checkbox.checked);
    });

    this.scrollTicketListBottom();
  }
  /** expand prompt input textarea */
  autoSizeTextArea() {
    const el = this.ticket_content_input;
    setTimeout(() => {
      el.style.height = "auto";
      let height = el.scrollHeight;
      if (this.profile.textOptionsLarge) {
        if (height < 105) {
          el.style.height = "91px";
          if (el.scrollHeight < 96) height = 91;
        }
      } else {
        if (height < 80) {
          el.style.height = "60px";
          if (el.scrollHeight < 65) height = 60;
        }
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
    this.lastDocumentOptionChange = new Date().getTime();
    if (saveToAPI) {
      if (this.sliderChangeDebounceTimeout[sliderField]) clearTimeout(this.sliderChangeDebounceTimeout[sliderField]);
      this.sliderChangeDebounceTimeout[sliderField] = setTimeout(() => {
        this.saveDocumentOption(this.documentId, sliderField, Number(sliderCtl.value));
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
        if (!title) title = "untitled";
        // const activityDate = data.created.substring(5, 16).replace("T", " ").replace("-", "/");
        title = title.substring(0, 100);
        const activityDate = this.showGmailStyleDate(new Date(data.lastActivity));
        const rowHTML = `<li>
        <a href="/session/${doc.id}">
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

        const lastSubmit: any = card.querySelector(`.last_submit_time`);
        if (ticketRunning) {
          BaseApp.setHTML(assistSection, `<div class="pending_message">Prompt sent to OpenAI for processing...</div>`);
          card.classList.add("ticket_running");
          lastSubmit.dataset.showseconds = "1";
          this.ticketIsPending = true;
        } else {
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
                  btn.innerHTML = `<i class="material-icons copy_green">done</i>` + buttonText;
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
                btn.innerHTML = `<i class="material-icons copy_green">done</i>` + buttonText;
                setTimeout(() => btn.innerHTML = buttonText, 1200);
              });

              const continueButton = document.createElement("button");
              continueButton.setAttribute("class", "continue_previous_response btn btn-primary");
              continueButton.innerHTML = `Continue`;
              assistSection.appendChild(continueButton);
              continueButton.addEventListener("click", () => this.sendTicketToAPI(true, "Continue Previous"));

              totalSpan.innerHTML = assistData.assist.usage.total_tokens;
              promptSpan.innerHTML = assistData.assist.usage.prompt_tokens;
              let responseTime = assistData.runTime;
              if (!responseTime) responseTime = 0;
              completionSpan.innerHTML = assistData.assist.usage.completion_tokens +
                "<br>" + Math.round(responseTime / 1000) + "s";

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

          card.classList.remove("ticket_running");
          lastSubmit.dataset.showseconds = "0";
        }
      }
    });

    if (this.ticketIsPending) document.body.classList.add("ticket_sent_api_pending");
    else document.body.classList.remove("ticket_sent_api_pending");

    this.updatePromptTokenStatus();
    this._updateGameMembersList();
    if (scrollToBottom) this.scrollTicketListBottom();
  }
  /** tests if dom scroll is at bottom
   * @param { any } ele element to test
   * @return { boolean } true is scrolled to bottom
   */
  atBottom(ele: any): boolean {
    if (ele.scrollTop + ele.offsetHeight >= ele.scrollHeight - 10) return true;
    return false;
  }
  /**
   * @param { boolean } setTimeouts set true if calling, false when this routine calls itself
  */
  scrollTicketListBottom(setTimeouts = true) {
    this.tickets_list.offsetHeight;
    this.tickets_list.scrollTop = this.tickets_list.scrollHeight + 10000;
    if (setTimeouts) {
      setTimeout(() => this.scrollTicketListBottom(false), 20);
      setTimeout(() => this.scrollTicketListBottom(false), 50);
    }
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
    let newUserTicketInFeed = false;
    snapshot.forEach((doc: any) => {
      this.ticketCount++;
      let card: any = this.tickets_list.querySelector(`div[ticketid="${doc.id}"]`);
      if (!card) {
        if (doc.data().uid === this.uid) newUserTicketInFeed = true;
        card = this.getTicketCardDom(doc.id, doc.data());
      }
      this.tickets_list.insertBefore(card, this.tickets_list.firstChild);
      this.ticketsLookup[doc.id] = doc.data();

      if (this.ticketsLookup[doc.id].includeInMessage) this.selectedTicketCount++;

      const chkBox: any = card.querySelector(`input[ticketid="${doc.id}"]`);
      const submittedTime: any = card.querySelector(".last_submit_time");
      submittedTime.setAttribute("data-timesince", doc.data().submitted);


      const ele1: any = card.querySelector(".ticket_owner_name");
      ele1.setAttribute("uid", this.ticketsLookup[doc.id].uid);
      const ele2: any = card.querySelector(".ticket_owner_image");
      ele2.setAttribute("uid", this.ticketsLookup[doc.id].uid);

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

    if (newUserTicketInFeed) {
      const tempCards = this.tickets_list.querySelectorAll(`.temp_ticket_card`);
      tempCards.forEach((card: any) => card.remove());
    }


    this.refreshSystemMessageElement();
    this.updateTimeSince(this.tickets_list);
    this.updatePromptTokenStatus();
    this.updateAssistsFeed(null);

    this.ticket_count_span.innerHTML = this.ticketCount;
    this.selected_ticket_count_span.innerHTML = this.selectedTicketCount;
    this.ticket_stats.innerHTML = `<span class="selected_tickets">` +
      this.selectedTicketCount + `</span>/<span class="total_tickets">` + this.ticketCount + "</span> Responses";

    if (scrollToBottom) this.scrollTicketListBottom();
  }
  /** */
  refreshSystemMessageElement() {
    let systemMessage = this.sessionDocumentData.systemMessage;
    if (systemMessage === undefined) systemMessage = "";

    if (this.systemMessageListElement) this.systemMessageListElement.remove();
    this.systemMessageListElement = null;
    if (systemMessage !== "") {
      this.systemMessageListElement = document.createElement("div");
      this.systemMessageListElement.setAttribute("class", "game_message_list_item system_message_block");
      this.systemMessageListElement.innerHTML = `<div class="system_message_label">System Message</div>
        <div class="system_message_content">${systemMessage}</div>`;

      this.tickets_list.insertBefore(this.systemMessageListElement, this.tickets_list.firstChild);
    }
  }
  /** send rerun request to api
   * @param { any } reRunBtn dom button
   * @param { string } ticketId doc id
   * @param { any } card card dom
   */
  async reRunTicket(reRunBtn: any, ticketId: string, card: any): Promise<void> {
    let removedTickets: Array<string> = [];
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

    tempCard.scrollIntoView(false);
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
  /** */
  updateContextualLimit() {
    if (this.sessionDocumentData.model === "gpt-3.5-turbo-16k") this.modelLimit = 16394;
    else this.modelLimit = 4096;

    this.docfield_max_tokens.setAttribute("max", this.modelLimit);

    const responseLimit = Math.floor(this.modelLimit / 20) * 20;
    this.threshold_dialog_context_limit.innerHTML = this.modelLimit;

    if (this.sessionDocumentData.max_tokens > responseLimit) {
      this.saveDocumentOption(this.documentId, "max_tokens", 500);
    }
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
  /** generate html for message card
   * @param { string } ticketId doc id
   * @param { any } data firestore message document
   * @param { boolean } tempTicket remove on next document refresh
   * @return { any } card
   */
  getTicketCardDom(ticketId: string, data: any, tempTicket = false): any {
    const gameOwnerClass = data.isGameOwner ? " ticket_game_owner" : "";
    const ownerClass = data.uid === this.uid ? " ticket_owner" : "";
    const oldSubmitted = new Date(data.submitted).getTime() < Date.now() + 5 * 3600 * 1000;
    const oldTicketClass = oldSubmitted ? " old_ticket" : "";
    const tempTicketClass = tempTicket ? " temp_ticket_card" : "";
    const cardWrapper = document.createElement("div");
    const classes = gameOwnerClass + ownerClass + tempTicketClass + oldTicketClass;
    const cardClass = `mt-1 game_message_list_item${classes} ticket_running`;
    const cardHTML =
      `<div class="${cardClass}" ticketid="${ticketId}" chatroomid="${ticketId}">
      <span class="tokens_prompt"></span>
      <div class="m-1 user_assist_request_header">
        <div style="flex:1;" class="ticket_user_display_header d-flex flex-column">
            <div class="user_assist_request_header_user" >
              <span class="ticket_owner_image member_profile_image" uid=""></span>
              <span class="ticket_owner_name member_profile_name" uid=""></span>
            </div>
          </div>
          <button class="rerun_ticket btn btn-secondary" data-ticketid="${ticketId}"><i
                  class="material-icons">loop</i></button>
          <button class="delete_ticket btn btn-secondary" data-chatroomid="${data.gameNumber}"
              data-messageid="${ticketId}">
              <svg xmlns="http://www.w3.org/2000/svg" height="30" viewBox="0 -960 960 960" width="30">
                <path fill="currentColor" d="M261-120q-24.75 0-42.375-17.625T201-180v-570h-41v-60h188v-30h264v30h188v60h-41v570q0 
                24-18 42t-42 18H261Zm438-630H261v570h438v-570ZM367-266h60v-399h-60v399Zm166 0h60v-399h-60v399ZM261-750v570-570Z"/>
              </svg>
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
      copyClipboardBtn.innerHTML = `<i class="material-icons copy_green">done</i>` + buttonText;
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

    if (this.ticketsLookup[ticketId]) {
      this.ticketsLookup[ticketId].includeInMessage = include;
      this.updatePromptTokenStatus();
    }
  }
  /** api user send message
   * @param { boolean } ignoreThreshold true to send regardless of size
   * @param { string } message optional - read from ticket_content_input if not provided
  */
  async sendTicketToAPI(ignoreThreshold = false, message = "") {
    if (!message) message = this.ticket_content_input.value.trim();
    if (message === "") {
      alert("Please supply a message");
      return;
    }

    let removedTickets: Array<string> = [];
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
    const ele1: any = tempCard.querySelector(".ticket_owner_name");
    ele1.setAttribute("uid", this.uid);
    const ele2: any = tempCard.querySelector(".ticket_owner_image");
    ele2.setAttribute("uid", this.uid);

    this.tickets_list.appendChild(tempCard);
    tempCard.scrollIntoView(false);
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

    this.updateUserNamesImages();

    this.scrollTicketListBottom();
    setTimeout(() => this.scrollTicketListBottom(), 150);
  }
  /** process exisiting tickets and return list of ids to submit
   * @param { string } ticketId doc id
   * @param { Array<string> } removedTickets ticket ids to exclude
   * @return { Array<string> } list of ticket ids
  */
  generateSubmitList(ticketId = "", removedTickets: Array<string> = []): Array<string> {
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
          const promptTokenCount = this.getEncodedToken(ticket.message).length;
          if (tokenCountCompletion > 0) {
            this.includeMessageTokens += promptTokenCount;
            this.includeAssistTokens += tokenCountCompletion;
            this.includeTotalTokens += tokenCountCompletion + promptTokenCount;
            tickets.push(doc.id);
          }
        }
      }
    });
    return tickets.reverse();
  }
  /**
   * @param { string } value text fragment
   * @return { any } length and token array
  */
  getEncodedToken(value: any): any {
    let str = "";
    if (value !== undefined) str = value;
    if (!this.tokenizedStringCache[str]) {
      this.tokenizedStringCache[str] = window.gpt3tokenizer.encode(str);
      if (!this.tokenizedStringCache[str]) this.tokenizedStringCache[str] = [];
    }

    return this.tokenizedStringCache[str];
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

      return this.getEncodedToken(assistData.assist.choices["0"].message.content).length;
    } catch (assistError: any) {
      console.log(assistError);
      return 0;
    }
  }
  /** BaseApp override to paint profile specific authorization parameters */
  authUpdateStatusUI() {
    super.authUpdateStatusUI();

    if (this.profile) {
      this.initRTDBPresence();

      const urlSessionId = window.location.pathname.replace("/session/", "");
      if (this.documentId === null && urlSessionId) {
        this.gameAPIJoin(urlSessionId);
        this.documentId = urlSessionId;
        let reloading = false;
        if (this.gameSubscription) this.gameSubscription();
        this.gameSubscription = firebase.firestore().doc(`Games/${this.documentId}`)
          .onSnapshot((doc: any) => {
            if (this.sessionDeleting) return;
            if (!doc.data() && !reloading) {
              alert("Session not found, returning to home");
              reloading = true;
              location.href = "/";
              return;
            }

            this.paintDocumentData(doc);

            if (this.firstDocumentLoad) {
              setTimeout(() => {
                this.ticket_content_input.focus();
              }, 50);
              this.setSidebarTreeState();
            }
            this.firstDocumentLoad = false;
          });

        this.initTicketFeed();
        this.initRecentDocumentsFeed();
      }

      this.threshold_auto_exclude_checkbox.checked = this.profile.autoExclude;

      this.autoSizeTextArea();
      setTimeout(() => this._updateGameMembersList(), 50);
    }
  }
  /** */
  setSidebarTreeState() {
    this.engine_sidebar_menu_button.classList.add("suppress_transition");
    this.users_sidebar_menu_button.classList.add("suppress_transition");
    this.recent_sidebar_menu_button.classList.add("suppress_transition");

    if (this.profile.sidebarEngineExpanded === false) {
      this.engine_sidebar_menu_button.classList.add("collapsed");
      this.engine_sidebar_menu_button.setAttribute("aria-expanded", "false");
      this.sidebar_engine_panel.classList.remove("show");
    } else {
      this.engine_sidebar_menu_button.classList.remove("collapsed");
      this.engine_sidebar_menu_button.setAttribute("aria-expanded", "true");
      this.sidebar_engine_panel.classList.add("show");
    }
    if (this.profile.sidebarUsersExpanded === false) {
      this.users_sidebar_menu_button.classList.add("collapsed");
      this.users_sidebar_menu_button.setAttribute("aria-expanded", "false");
      this.sidebar_users_panel.classList.remove("show");
    } else {
      this.users_sidebar_menu_button.classList.remove("collapsed");
      this.users_sidebar_menu_button.setAttribute("aria-expanded", "true");
      this.sidebar_users_panel.classList.add("show");
    }
    if (this.profile.sidebarRecentExpanded === false) {
      this.recent_sidebar_menu_button.classList.add("collapsed");
      this.recent_sidebar_menu_button.setAttribute("aria-expanded", "false");
      this.sidebar_recent_panel.classList.remove("show");
    } else {
      this.recent_sidebar_menu_button.classList.remove("collapsed");
      this.recent_sidebar_menu_button.setAttribute("aria-expanded", "true");
      this.sidebar_recent_panel.classList.add("show");
    }
    setTimeout(() => {
      this.engine_sidebar_menu_button.classList.remove("suppress_transition");
      this.users_sidebar_menu_button.classList.remove("suppress_transition");
      this.recent_sidebar_menu_button.classList.remove("suppress_transition");
    }, 50);
  }
  /** paint game data (game document change handler)
   * @param { any } gameDoc firestore query snapshot
   */
  paintDocumentData(gameDoc: any = null) {
    if (gameDoc) this.sessionDocumentData = gameDoc.data();
    if (!this.sessionDocumentData) return;

    document.body.classList.add("loaded");

    BaseApp.setHTML(this.document_menutop_usage_stats_line,
      `<span class="usage">${BaseApp.numberWithCommas(this.sessionDocumentData.totalTokens)}</span> Usage`);
    BaseApp.setHTML(this.last_activity_display, this.showGmailStyleDate(new Date(this.sessionDocumentData.lastActivity), true));
    BaseApp.setHTML(this.sidebar_document_title, BaseApp.escapeHTML(this.sessionDocumentData.title));
    BaseApp.setHTML(this.menu_bar_doc_title, BaseApp.escapeHTML(this.sessionDocumentData.title));

    let windowTitle = this.sessionDocumentData.title;
    if (!windowTitle) windowTitle = "New Prompt+ Session";
    document.title = windowTitle;

    const sharedStatus = ChatDocument.getDocumentSharedStatus(this.sessionDocumentData, this.uid);
    this.sidebarusers_link_copy.classList.remove("shared_status_not");
    this.sidebarusers_link_copy.classList.remove("shared_status_withusers");
    this.sidebarusers_link_copy.classList.remove("shared_status_withothers");

    this.users_sidebar_menu_button.classList.remove("shared_status_not");
    this.users_sidebar_menu_button.classList.remove("shared_status_withusers");
    this.users_sidebar_menu_button.classList.remove("shared_status_withothers");

    if (sharedStatus === 0) {
      this.sidebarusers_link_copy.classList.add("shared_status_not");
      this.users_sidebar_menu_button.classList.add("shared_status_not");
    }
    if (sharedStatus === 1) {
      this.users_sidebar_menu_button.classList.add("shared_status_withusers");
      this.sidebarusers_link_copy.classList.add("shared_status_withusers");
    }
    if (sharedStatus === 2) {
      this.users_sidebar_menu_button.classList.add("shared_status_withothers");
      this.sidebarusers_link_copy.classList.add("shared_status_withothers");
    }

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

        const timeSince = this.timeSince(new Date(members[member]));
        const isOwner = member === this.sessionDocumentData.createUser ? " is_document_owner" : "";
        let selected = memberSelectedCounts[member];
        if (selected === undefined) selected = 0;
        let ticketCount = memberTicketCounts[member];
        if (ticketCount === undefined) ticketCount = 0;
        const ticketRunningClass = memberRunningsTickets[member] > 0 ? " ticket_running_in_queue" : "";

        html += `<li class="member_list_item ${ticketRunningClass}">
        <div class="members_feed_line_wrapper${isOwner}">
            <span class="members_feed_profile_image member_profile_image" uid="${member}"></span>
            <div class="members_feed_online_status member_online_status" data-uid="${member}"></div>
            <div class="member_name_wrapper">
              <span class="members_feed_profile_name member_profile_name" uid="${member}"></span>
            </div>
            <div class="member_activity_wrapper">
              <div class="member_prompt_count">${ticketCount}</div>
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
  /** paint user editable game options
  */
  paintDocumentOptions() {
    if (this.sessionDocumentData.createUser === this.uid) document.body.classList.add("game_owner");
    else document.body.classList.remove("game_owner");

    if (this.sessionDocumentData.archived) document.body.classList.add("archived_session");
    else document.body.classList.remove("archived_session");

    const notDefault = this.testForEngineNotDefault();
    if (notDefault) document.body.classList.add("engine_settings_not_default");
    else document.body.classList.remove("engine_settings_not_default");

    const tweaked = this.testForEngineTweaked();
    if (tweaked) document.body.classList.add("engine_settings_tweaked");
    else document.body.classList.remove("engine_settings_tweaked");

    if (notDefault && !tweaked) document.body.classList.add("engine_settings_minor_tweaked");
    else document.body.classList.remove("engine_settings_minor_tweaked");

    const debounce = (this.lastDocumentOptionChange + 750 < new Date().getTime());

    this.docfield_model.value = this.sessionDocumentData.model;
    this.updateContextualLimit();

    this.__debounceSliderPaint("max_tokens", debounce, "Max Response Tokens: ");
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
      }, 500);
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
    if (window.document.body.scrollWidth < 992) {
      desktopView = false;
    }

    if (this.mobileLayoutCache !== desktopView) {
      if (desktopView) {
        this.desktop_sidebar_menu_wrapper.appendChild(this.sidebar_tree_menu);
        this.left_panel_view.insertBefore(this.menu_nav_bar, this.left_panel_view.firstChild);
        document.body.classList.remove("mobile_layout_mode");
        this.menu_nav_bar.classList.remove("fixed-top");
      } else {
        this.mobile_sidebar_menu_Layout_container.appendChild(this.sidebar_tree_menu);
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

    const inputValue = this.ticket_content_input.value.trim();

    if (inputValue === "") document.body.classList.add("empty_prompt_input");
    else document.body.classList.remove("empty_prompt_input");

    const tokens = this.getEncodedToken(inputValue);
    const systemMessageTokens = this.getEncodedToken(this.sessionDocumentData.systemMessage);
    this.lastSystemMessageTokenCount = systemMessageTokens.length;

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
    this.total_prompt_token_count.innerHTML = this.includeTotalTokens + tokens.length +
      this.sessionDocumentData.max_tokens + this.lastSystemMessageTokenCount;
    this.chat_history_tokens.innerHTML = this.includeTotalTokens;
    this.chat_completion_tokens.innerHTML = this.sessionDocumentData.max_tokens;
    this.chat_system_message_tokens.innerHTML = this.lastSystemMessageTokenCount;
    this.chat_new_prompt_tokens.innerHTML = this.lastInputTokenCount;
    this.chat_threshold_total_tokens.innerHTML =
      (this.includeTotalTokens + this.sessionDocumentData.max_tokens +
        this.lastInputTokenCount + this.lastSystemMessageTokenCount).toString();

    if (this.isOverSendThreshold()) {
      document.body.classList.add("over_token_sendlimit");
    } else {
      document.body.classList.remove("over_token_sendlimit");
    }
  }
  /**
   *
   * @return { boolean } true if over this.modelLimit for submit token count
   */
  isOverSendThreshold(): boolean {
    return this.includeTotalTokens + this.sessionDocumentData.max_tokens +
      this.lastInputTokenCount + this.lastSystemMessageTokenCount > this.modelLimit;
  }
  /** shows over threshold modal */
  showOverthresholdToSendModal() {
    this.show_overthreshold_dialog.click();
  }
  /**
   * @param { any } currentTicketId ticketid to ignore (optional)
   * @return { Array<string> } exlcudedTickets id list
   */
  autoExcludeTicketsToMeetThreshold(currentTicketId: any = null): Array<string> {
    if (!this.isOverSendThreshold()) return [];
    if (this.excludingTicketsRunning) return [];
    this.excludingTicketsRunning = true;
    document.body.classList.add("exclude_tickets_running");
    let tokenReduction = this.includeTotalTokens + this.sessionDocumentData.max_tokens +
      this.lastInputTokenCount + this.lastSystemMessageTokenCount - (this.modelLimit * this.excludeErrorMargin);

    const tickets: Array<any> = [];
    this.lastTicketsSnapshot.forEach((doc: any) => tickets.unshift(doc));
    const ticketsRemoved: Array<string> = [];
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
          const promptTokens = this.getEncodedToken(ticket.message);
          tokenReduction -= tokenCountCompletion + promptTokens.length;

          ticketsRemoved.push(doc.id);
        }
      }
    });

    setTimeout(() => {
      this.excludingTicketsRunning = false;
      document.body.classList.remove("exclude_tickets_running");
    }, 500);

    // this.auto_run_overthreshold_ticket.focus();

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
  /** */
  selectAllTickets() {
    const tickets: Array<any> = [];
    this.lastTicketsSnapshot.forEach((doc: any) => tickets.unshift(doc));
    tickets.forEach((doc: any) => {
      let data = doc.data;
      if (!data) data = {};
      if (!data.includeInMessage) this.includeTicketSendToAPI(doc.id, true);
    });
  }
}
