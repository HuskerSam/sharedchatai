import BaseApp from "./baseapp.js";
import Split from "./split.js";
import LoginHelper from "./loginhelper.js";
import DocOptionsHelper from "./docoptionshelper.js";
import DocCreateHelper from "./doccreatehelper.js";
import ProfileHelper from "./profilehelper.js";

declare const firebase: any;
declare const window: any;

/** Guess app class */
export class AIChatApp extends BaseApp {
  apiType = "aichat";
  maxTokenPreviewChars = 30;
  currentGame: any;
  lastTicketsSnapshot: any = [];
  gameSubscription: any;
  assistsSubscription: any;
  ticketsSubscription: any;
  lastAssistsSnapShot: any;
  ticketFeedRegistered = false;
  recentDocumentFeedRegistered = false;
  recentDocumentsSubscription: any = null;
  lastDocumentsSnapshot: any = null;
  gameData: any;
  alertErrors = false;
  splitHorizontalCache: any = null;
  ticketsLookup: any = {};
  ticketsTokenCounts: any = {};
  assistsLookup: any = {};
  includeTotalTokens = 0;
  includeMessageTokens = 0;
  includeAssistTokens = 0;
  ticketCount = 0;
  selectedTicketCount = 0;
  login = new LoginHelper(this);
  documentOptions = new DocOptionsHelper(this);
  documentCreate = new DocCreateHelper(this);
  profileHelper = new ProfileHelper(this);
  editedDocumentId = -1;
  documentsLookup: any = {};
  lastDocumentOptionChange = 0;
  debounceTimeout: any = null;
  splitInstance: any = null;

  tickets_list: any = document.querySelector(".tickets_list");
  members_list: any = document.querySelector(".members_list");

  send_ticket_button: any = document.querySelector(".send_ticket_button");
  ticket_content_input: any = document.querySelector(".ticket_content_input");
  prompt_token_count: any = document.querySelector(".prompt_token_count");
  total_prompt_token_count: any = document.querySelector(".total_prompt_token_count");
  token_visualizer_preview: any = document.querySelector(".token_visualizer_preview");

  main_view_splitter: any = document.querySelector(".main_view_splitter");
  show_document_options_modal: any = document.querySelector(".show_document_options_modal");

  show_profile_modal: any = document.querySelector(".show_profile_modal");
  show_create_modal: any = document.querySelector(".show_create_modal");

  docfield_model: any = document.querySelector(".docfield_model");
  docfield_max_tokens: any = document.querySelector(".docfield_max_tokens");
  docfield_temperature: any = document.querySelector(".docfield_temperature");
  docfield_top_p: any = document.querySelector(".docfield_top_p");
  docfield_presence_penalty: any = document.querySelector(".docfield_presence_penalty");
  docfield_frequency_penalty: any = document.querySelector(".docfield_frequency_penalty");
  document_usage_stats_line: any = document.querySelector(".document_usage_stats_line");
  last_activity_display: any = document.querySelector(".last_activity_display");
  document_export_button: any = document.querySelector(".document_export_button");
  document_import_button: any = document.querySelector(".document_import_button");
  ticket_count_span: any = document.querySelector(".ticket_count_span");
  selected_ticket_count_span: any = document.querySelector(".selected_ticket_count_span");
  selected_token_count_span: any = document.querySelector(".selected_token_count_span");

  show_document_options_popup: any = document.getElementById("show_document_options_popup");
  temperature_slider_label: any = document.querySelector(".temperature_slider_label");
  top_p_slider_label: any = document.querySelector(".top_p_slider_label");
  presence_penalty_slider_label: any = document.querySelector(".presence_penalty_slider_label");
  frequency_penalty_slider_label: any = document.querySelector(".frequency_penalty_slider_label");
  max_tokens_slider_label: any = document.querySelector(".max_tokens_slider_label");
  recent_documents_list: any = document.querySelector(".recent_documents_list");
  sidebar_document_title: any = document.querySelector(".sidebar_document_title");

  /**  */
  constructor() {
    super();

    this.send_ticket_button.addEventListener("click", () => this.sendTicketToAPI());
    this.ticket_content_input.addEventListener("keyup", (e: any) => {
      if (e.key === "Enter" && e.shiftKey === false) this.sendTicketToAPI();
    });
    // redraw message feed to update time since values
    setInterval(() => this.updateTimeSince(this.tickets_list), this.timeSinceRedraw);

    document.addEventListener("visibilitychange", () => this.refreshOnlinePresence());
    this.ticket_content_input.addEventListener("input", () => this.updatePromptTokenStatus());
    this.show_document_options_modal.addEventListener("click", () => this.showOptionsModal());

    this.docfield_temperature.addEventListener("input", () => this.optionSliderChange(true, "temperature",
      this.docfield_temperature, this.temperature_slider_label, "Temperature: "));
    this.docfield_top_p.addEventListener("input", () => this.optionSliderChange(true, "top_p",
      this.docfield_top_p, this.top_p_slider_label, "Top p: "));
    this.docfield_presence_penalty.addEventListener("input", () => this.optionSliderChange(true, "presence_penalty",
      this.docfield_presence_penalty, this.presence_penalty_slider_label, "Presence Penalty: "));
    this.docfield_frequency_penalty.addEventListener("input", () => this.optionSliderChange(true, "frequency_penalty",
      this.docfield_frequency_penalty, this.frequency_penalty_slider_label, "Frequency Penalty: "));
    this.docfield_max_tokens.addEventListener("input", () => this.optionSliderChange(true, "max_tokens",
      this.docfield_max_tokens, this.max_tokens_slider_label, "Completion Tokens: "));
    this.docfield_model.addEventListener("change", () => {
      this.saveDocumentOption("model", this.docfield_model.value);
    });
    this.updateSplitter();

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
    this.lastDocumentOptionChange = new Date().getTime();
    sliderLabel.innerHTML = prefix + sliderCtl.value;

    if (saveToAPI) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => {
        this.saveDocumentOption(sliderField, Number(sliderCtl.value));
      }, 75);
    }
  }
  /** setup data listender for user messages */
  async initTicketFeed() {
    if (this.ticketFeedRegistered) return;
    this.ticketFeedRegistered = true;
    const gameId = this.urlParams.get("game");
    if (!gameId) return;

    if (this.ticketsSubscription) this.ticketsSubscription();

    this.ticketsSubscription = firebase.firestore().collection(`Games/${gameId}/tickets`)
      .orderBy(`submitted`, "desc")
      .limit(50)
      .onSnapshot((snapshot: any) => this.updateTicketsFeed(snapshot));

    if (this.assistsSubscription) this.assistsSubscription();

    this.assistsSubscription = firebase.firestore().collection(`Games/${gameId}/assists`)
      .orderBy(`created`, "desc")
      .limit(50)
      .onSnapshot((snapshot: any) => this.updateAssistsFeed(snapshot));
  }
  /** setup data listener for recent document feed */
  async initRecentDocumentsFeed() {
    if (this.recentDocumentFeedRegistered) return;
    this.recentDocumentFeedRegistered = true;

    if (this.recentDocumentsSubscription) this.recentDocumentsSubscription();
    this.recentDocumentsSubscription = firebase.firestore().collection(`Games`)
      .orderBy(`members.${this.uid}`, "desc")
      .limit(10)
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
      const data = doc.data();
      let title = data.title;
      if (!title) title = "unused";
      const activityDate = data.created.substring(5, 16).replace("T", " ").replace("-", "/");

      title = title.substring(0, 100);
      const rowHTML = `<li>
      <a href="/aichat/?game=${doc.id}" target="_blank">
        <div class="title">${title}</div>
        <div class="activity_date">${activityDate}</div>
      </a></li>`;
      html += rowHTML;
    });
    this.recent_documents_list.innerHTML = html;
  }
  /** paint user message feed
 * @param { any } snapshot firestore query data snapshot
 */
  updateAssistsFeed(snapshot: any) {
    if (snapshot) this.lastAssistsSnapShot = snapshot;
    else if (this.lastAssistsSnapShot) snapshot = this.lastAssistsSnapShot;
    else return;
    const scrollToBottom = this.atBottom(this.tickets_list);

    this.assistsLookup = {};
    snapshot.forEach((doc: any) => {
      this.assistsLookup[doc.id] = doc.data();
      const assistSection: any = document.querySelector(`div[ticketid="${doc.id}"] .assist_section`);
      const lastSubmit: any = document.querySelector(`div[ticketid="${doc.id}"] .last_submit_time`);
      if (lastSubmit) lastSubmit.dataset.showseconds = "0";

      if (assistSection) {
        const totalSpan: any = document.querySelector(`div[ticketid="${doc.id}"] .tokens_total`);
        const promptSpan: any = document.querySelector(`div[ticketid="${doc.id}"] .tokens_prompt`);
        const completionSpan: any = document.querySelector(`div[ticketid="${doc.id}"] .tokens_completion`);
        const reRunTicket: any = document.querySelector(`div[ticketid="${doc.id}"] .rerun_ticket`);

        const data: any = doc.data();
        if (data.success) {
          if (data.assist.error) {
            let result = "";
            if (data.assist.error.code) {
              result += data.assist.error.code + " ";
            }
            if (data.assist.error.message) {
              result += data.assist.error.message + " ";
            }
            assistSection.innerHTML = result;
          } else {
            assistSection.innerHTML = data.assist.choices["0"].message.content;

            totalSpan.innerHTML = data.assist.usage.total_tokens;
            promptSpan.innerHTML = data.assist.usage.prompt_tokens;
            completionSpan.innerHTML = data.assist.usage.completion_tokens;
          }
        } else {
          let msg = "API Error";
          if (data.error) msg = data.error;
          assistSection.innerHTML = msg;
        }

        const ticketData = this.ticketsLookup[doc.id];
        if (ticketData && data.submitted === ticketData.submitted) {
          reRunTicket.innerHTML = "Rerun";
        } else {
          reRunTicket.innerHTML = "Running";
          lastSubmit.dataset.showseconds = "1";
        }
      }
    });

    if (scrollToBottom) {
      setTimeout(() => this.tickets_list.scrollTop = this.tickets_list.scrollHeight, 100);
    }

    this.generateSubmitList();
    this.updatePromptTokenStatus();
  }
  /** tests if dom scroll is at bottom
   * @param { any } ele element to test
   * @return { boolean } true is scrolled to bottom
   */
  atBottom(ele: any): boolean {
    const sh = ele.scrollHeight;
    const st = ele.scrollTop;
    const ht = ele.offsetHeight;
    if (ht == 0) {
      return true;
    }
    if (st == sh - ht) return true;
    else return false;
  }
  /** paint user message feed
   * @param { any } snapshot firestore query data snapshot
   */
  updateTicketsFeed(snapshot: any) {
    if (!this.gameData) {
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
      let card: any = this.tickets_list.querySelector(`div[gamenumber="${doc.id}"]`);
      if (!card) {
        card = this.getTicketCardDom(doc);
      }
      this.tickets_list.insertBefore(card, this.tickets_list.firstChild);
      this.ticketsLookup[doc.id] = doc.data();

      const chkBox: any = card.querySelector(`input[ticketid="${doc.id}"]`);
      chkBox.checked = this.ticketsLookup[doc.id].includeInMessage;
      if (this.ticketsLookup[doc.id].includeInMessage) this.selectedTicketCount++;

      const submittedTime: any = card.querySelector(".last_submit_time");
      submittedTime.setAttribute("data-timesince", doc.data().submitted);
    });

    oldKeys.forEach((key: string) => {
      if (!this.ticketsLookup[key]) {
        const card: any = this.tickets_list.querySelector(`div[gamenumber="${key}"]`);
        if (card) card.remove();
      }
    });

    if (scrollToBottom) {
      setTimeout(() => this.tickets_list.scrollTop = this.tickets_list.scrollHeight, 100);
    }

    this.updateTimeSince(this.tickets_list);

    this.refreshOnlinePresence();
    this.updateAssistsFeed(null);

    this.ticket_count_span.innerHTML = this.ticketCount;
    this.selected_ticket_count_span.innerHTML = this.selectedTicketCount;
  }
  /** send rerun request to api
   * @param { string } ticketId doc id
   */
  async reRunTicket(ticketId: string): Promise<void> {
    const includeTickets = this.generateSubmitList(ticketId);

    const body = {
      gameNumber: this.currentGame,
      includeTickets,
      reRunTicket: ticketId.toString(),
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/aichat/message", {
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
  }
  /** api call for delete user message
   * @param { any } btn dom control
   * @param { string } gameNumber firestore game document id
   * @param { string } ticketId firestore message id
   */
  async deleteTicket(btn: any, gameNumber: string, ticketId: string) {
    btn.setAttribute("disabled", "true");

    const body = {
      gameNumber,
      ticketId,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/aichat/message/delete", {
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
    if (!result.success) alert("Delete ticket failed");
  }
  /** query dom for all ticket_owner_image and ticket_owner_name elements and update */
  updateUserNamesImages() {
    const imgCtls = document.querySelectorAll(".ticket_owner_image");
    const nameCtls = document.querySelectorAll(".ticket_owner_name");

    imgCtls.forEach((imgCtl: any) => {
      const uid: any = imgCtl.dataset.ticketowneruid;
      if (uid !== undefined) {
        const imgPath = this.gameData.memberImages[uid];
        imgCtl.style.backgroundImage = "url(" + imgPath + ")";
      }
    });

    nameCtls.forEach((nameCtl: any) => {
      const uid: any = nameCtl.dataset.ticketowneruid;
      if (uid !== undefined) {
        const name = this.gameData.memberNames[uid];
        nameCtl.innerHTML = name;
      }
    });
  }
  /** generate html for message card
   * @param { any } doc firestore message document
   * @return { any } card
   */
  getTicketCardDom(doc: any): any {
    const data = doc.data();
    const gameOwnerClass = data.isGameOwner ? " message_game_owner" : "";
    const ownerClass = data.uid === this.uid ? " message_owner" : "";

    let name = "Anonymous";
    const ticketUserName = this.gameData.memberNames[data.uid];
    if (ticketUserName) name = ticketUserName;
    else if (data.memberName) name = data.memberName;

    let img = "/images/defaultprofile.png";
    const ticketUserImage = this.gameData.memberImages[data.uid];
    if (ticketUserImage) img = ticketUserImage;
    else if (data.memberImage) img = data.memberImage;

    const cardWrapper = document.createElement("div");

    cardWrapper.innerHTML =
      `<div class="mt-1 game_message_list_item${gameOwnerClass}${ownerClass}" ticketid="${doc.id}" gamenumber="${doc.id}">
      <div style="display:flex;flex-direction:row">
          <div style="flex:1;display:flex;flex-direction:column">
              <div style="display:flex;flex-direction:column">
                  <div class="message">${data.message}</div>
              </div>
              <div class="assist_section">pending...</div>
              <div style="display:flex;flex-direction:column">
                  <div class="m-1 user_assist_request_header">
                      <div class="user_img_wrapper member_desc">
                          <span class="ticket_owner_image" data-ticketowneruid="${data.uid}" style="background-image:url(${img})"></span>
                      </div>
                      <div>
                          <span class="name ticket_owner_name" data-ticketowneruid="${data.uid}">${name}</span>
                      </div>
                      <div style="flex:1;text-align: center;"><div class="time_since last_submit_time" data-timesince="${data.submitted}"
                      data-showseconds="1">
                      </div></div>
                      <span class="tokens_total"></span>
                      <span class="tokens_prompt"></span>
                      <span class="tokens_completion"></span>
                      <button class="rerun_ticket btn btn-secondary" data-ticketid="${doc.id}">Running...</button>
                      <button class="delete_game" data-gamenumber="${data.gameNumber}" data-messageid="${doc.id}">
                          <i class="material-icons">delete</i>
                      </button>
                  </div>
              </div>
          </div>
          <div class="ticket_item_include_wrapper">
              <input class="form-check-input ticket_item_include_checkbox" type="checkbox" ticketid="${doc.id}" value="">
          </div>
      </div>
  </div>`;
    const cardDom = cardWrapper.children[0];

    const deleteBtn: any = cardDom.querySelector("button.delete_game");
    deleteBtn.addEventListener("click", () => {
      this.deleteTicket(deleteBtn, deleteBtn.dataset.gamenumber, deleteBtn.dataset.messageid);
    });

    const reRunBtn: any = cardDom.querySelector("button.rerun_ticket");
    reRunBtn.addEventListener("click", async () => {
      reRunBtn.innerHTML = "Running...";
      await this.reRunTicket(reRunBtn.dataset.ticketid);
    });

    const includeChkBox: any = cardDom.querySelector(".ticket_item_include_checkbox");
    includeChkBox.addEventListener("input", async () => {
      await this.includeTicketSendToAPI(reRunBtn.dataset.ticketid, includeChkBox.checked);
    });

    return cardDom;
  }
  /** send include update to api
   * @param { string } ticketId doc id
   * @param { include } include whether to include in messages
  */
  async includeTicketSendToAPI(ticketId: string, include: boolean) {
    const body = {
      gameNumber: this.currentGame,
      ticketId,
      include,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/aichat/message/include", {
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
  /** api user send message */
  async sendTicketToAPI() {
    let message = this.ticket_content_input.value.trim();
    if (message === "") {
      alert("Please supply a message");
      return;
    }
    if (message.length > 10000) message = message.substr(0, 10000);
    this.ticket_content_input.value = "";

    setTimeout(() => this.tickets_list.scrollTop = this.tickets_list.scrollHeight, 100);
    // scroll to bottom
    this.tickets_list.scrollTop = this.tickets_list.scrollHeight;

    this.updatePromptTokenStatus();
    const includeTickets = this.generateSubmitList();

    const body = {
      gameNumber: this.currentGame,
      message,
      includeTickets,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/aichat/message", {
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
    this.tickets_list.scrollTop = this.tickets_list.scrollHeight;
    setTimeout(() => this.tickets_list.scrollTop = this.tickets_list.scrollHeight, 100);
  }
  /** process exisiting tickets and return list of ids to submit
   * @param { string } ticketId doc id
   * @return { Array<string> } list of ticket ids
  */
  generateSubmitList(ticketId = ""): Array<string> {
    const tickets: Array<string> = [];
    this.includeTotalTokens = 0;
    this.includeMessageTokens = 0;
    this.includeAssistTokens = 0;
    this.lastTicketsSnapshot.forEach((doc: any) => {
      const ticket: any = this.ticketsLookup[doc.id];
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
    });
    return tickets;
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
    this.currentGame = null;

    if (this.profile) {
      this.initRTDBPresence();
      this.initTicketFeed();
      this.initRecentDocumentsFeed();

      const gameId = this.urlParams.get("game");
      if (gameId) {
        this.gameAPIJoin(gameId);
        this.currentGame = gameId;

        if (this.gameSubscription) this.gameSubscription();
        this.gameSubscription = firebase.firestore().doc(`Games/${this.currentGame}`)
          .onSnapshot((doc: any) => this.paintGameData(doc));
      }
    }
  }
  /** paint game data (game document change handler)
   * @param { any } gameDoc firestore query snapshot
   */
  paintGameData(gameDoc: any = null) {
    if (gameDoc) this.gameData = gameDoc.data();
    if (!this.gameData) return;

    document.body.classList.add("loaded");
    this.document_usage_stats_line.innerHTML = `
      <span>${this.gameData.totalTokens}</span>
      <span>${this.gameData.promptTokens}</span>
      <span>${this.gameData.completionTokens}</span>
    `;

    this.last_activity_display.innerHTML = this.isoToLocal(<string>
      this.gameData.lastActivity)
      .toISOString().substring(0, 19).replace("T", " ");

    this.sidebar_document_title.innerHTML = this.gameData.title + "&nbsp;";

    this.paintDocumentOptions();
    this._updateGameMembersList();
    this.updateUserNamesImages();
    this.updateUserPresence();
  }
  /** paint game members list */
  _updateGameMembersList() {
    let html = "";
    if (this.gameData) {
      let members: any = {};
      if (this.gameData.members) members = this.gameData.members;
      let membersList = Object.keys(members);
      membersList = membersList.sort();
      membersList.forEach((member: string) => {
        this.addUserPresenceWatch(member);
        const data = this._gameMemberData(member);

        const timeSince = this.timeSince(new Date(members[member]));
        html += `<li class="member_list_item">
          <div class="member_online_status" data-uid="${member}"></div>
          <div class="user_img_wrapper">
            <span style="background-image:url(${data.img})"></span>
            <span>${data.name}</span>
          </div>
          <span class="member_list_time_since">${timeSince}</span>
        </li>`;
      });
    }
    this.members_list.innerHTML = html;
  }
  /** save a single field to document
   * @param { string } field document field name
   * @param { any } value written to field
  */
  async saveDocumentOption(field: string, value: any) {
    const body: any = {
      gameNumber: this.currentGame,
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
    let name = this.gameData.memberNames[uid];
    let img = this.gameData.memberImages[uid];
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
    if (this.gameData.createUser === this.uid) document.body.classList.add("game_owner");
    else document.body.classList.remove("game_owner");

    if (this.lastDocumentOptionChange + 2000 > new Date().getTime()) return;

    this.docfield_model.value = this.gameData.model;

    this.docfield_max_tokens.value = this.gameData.max_tokens;
    this.optionSliderChange(false, "max_tokens",
      this.docfield_max_tokens, this.max_tokens_slider_label, "Completion Tokens: ");
    this.docfield_temperature.value = this.gameData.temperature;
    this.optionSliderChange(false, "temperature",
      this.docfield_temperature, this.temperature_slider_label, "temperature: ");
    this.docfield_top_p.value = this.gameData.top_p;
    this.optionSliderChange(false, "top_p",
      this.docfield_top_p, this.top_p_slider_label, "top_p: ");
    this.docfield_presence_penalty.value = this.gameData.presence_penalty;
    this.optionSliderChange(false, "presence_penalty",
      this.docfield_presence_penalty, this.presence_penalty_slider_label, "Presence Penalty: ");
    this.docfield_frequency_penalty.value = this.gameData.frequency_penalty;
    this.optionSliderChange(false, "frequency_penalty",
      this.docfield_frequency_penalty, this.frequency_penalty_slider_label, "Frequency Penalty: ");
  }
  /** update the splitter if needed */
  updateSplitter() {
    let horizontal = true;
    let minSize: any = 30;
    if (window.document.body.scrollWidth <= 500) {
      horizontal = false;
    }

    if (this.splitHorizontalCache !== horizontal) {
      let direction = "vertical";
      let sizes: any = [];
      let gutterSize = 10;
      this.main_view_splitter.style.flexDirection = "column";
      if (horizontal) {
        this.main_view_splitter.style.flexDirection = "row";
        direction = "horizontal";
        minSize = [300, 0];
        sizes = [25, 75];
        gutterSize = 15;
      } else {
        minSize = [0, 0];
        sizes = [25, 75];
        gutterSize = 18;
      }

      if (this.splitInstance) this.splitInstance.destroy();
      this.splitInstance = <any>Split([".left_panel_view", ".right_panel_view"], {
        sizes,
        direction,
        minSize,
        gutterSize,
      });
      this.splitHorizontalCache = horizontal;
    }
  }
  /** count input token */
  updatePromptTokenStatus() {
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
    this.selected_token_count_span.innerHTML = this.includeTotalTokens;
    this.total_prompt_token_count.innerHTML = this.includeTotalTokens + tokens.length;
  }

  /** import ticket to api
   * @param { any } importData ticket data
   * @return { Promise<boolean> } returns true if error
  */
  async sendImportTicketToAPI(importData: any): Promise<boolean> {
    const body = {
      gameNumber: this.currentGame,
      prompt: importData.prompt,
      completion: importData.completion,
    };
    console.log(body);
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/aichat/message/import", {
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
    let error = false;
    if (!json.success) {
      error = true;
      console.log("message post", json);
      alert(json.errorMessage);
    }
    this.tickets_list.scrollTop = this.tickets_list.scrollHeight;
    setTimeout(() => this.tickets_list.scrollTop = this.tickets_list.scrollHeight, 100);
    return error;
  }
  /** populate and show document options popup */
  showOptionsModal() {
    this.editedDocumentId = this.currentGame;
    this.documentsLookup = {
      [this.currentGame]: this.gameData,
    };
    this.show_document_options_popup.click();
    this.documentOptions.show();
  }
}
