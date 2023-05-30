import BaseApp from "./baseapp.js";
import Split from "./split.js";

declare const firebase: any;
declare const window: any;

/** Guess app class */
export class AIChatApp extends BaseApp {
  apiType = "aichat";
  currentGame: any;
  lastTicketsSnapshot: any = null;
  gameSubscription: any;
  assistsSubscription: any;
  ticketsSubscription: any;
  lastAssistsSnapShot: any;
  ticketFeedRegistered = false;
  gameData: any;
  alertErrors = false;
  splitHorizontalCache: any = null;
  ticketsLookup: any = {};

  tickets_list: any = document.querySelector(".tickets_list");
  document_options_toggle: any = document.querySelector(".document_options_toggle");

  members_list: any = document.querySelector(".members_list");

  send_ticket_button: any = document.querySelector(".send_ticket_button");
  ticket_content_input: any = document.querySelector(".ticket_content_input");
  prompt_token_count: any = document.querySelector(".prompt_token_count");
  token_visualizer_preview: any = document.querySelector(".token_visualizer_preview");
  code_link_href: any = document.querySelector(".code_link_href");
  code_link_copy: any = document.querySelector(".code_link_copy");
  gameid_span: any = document.querySelector(".gameid_span");
  main_view_splitter: any = document.querySelector(".main_view_splitter");
  splitInstance: any = null;

  docfield_model: any = document.querySelector(".docfield_model");
  docfield_max_tokens: any = document.querySelector(".docfield_max_tokens");
  docfield_temperature: any = document.querySelector(".docfield_temperature");
  docfield_top_p: any = document.querySelector(".docfield_top_p");
  docfield_presence_penalty: any = document.querySelector(".docfield_presence_penalty");
  docfield_frequency_penalty: any = document.querySelector(".docfield_frequency_penalty");
  docfield_logit_bias: any = document.querySelector(".docfield_logit_bias");
  docfield_stops: any = document.querySelector(".docfield_stops");
  save_options_buttons: any = document.querySelectorAll(".save_options_button");
  document_usage_stats_line: any = document.querySelector(".document_usage_stats_line");
  last_activity_display: any = document.querySelector(".last_activity_display");
  docfield_archived_checkbox: any = document.querySelector(".docfield_archived_checkbox");
  docfield_usage_limit: any = document.querySelector(".docfield_usage_limit");
  /**  */
  constructor() {
    super();

    this.send_ticket_button.addEventListener("click", () => this.sendTicketToAPI());
    this.ticket_content_input.addEventListener("keyup", (e: any) => {
      if (e.key === "Enter") this.sendTicketToAPI();
    });
    this.document_options_toggle.addEventListener("click", (e: any) => this.toggleOptionsView(e));
    this.toggleOptionsView(null);

    this.initTicketFeed();
    this.updateSplitter();

    // redraw message feed to update time since values
    setInterval(() => this.updateTimeSince(this.tickets_list), this.timeSinceRedraw);

    document.addEventListener("visibilitychange", () => this.refreshOnlinePresence());
    this.ticket_content_input.addEventListener("input", () => this.updatePromptTokenStatus());

    this.save_options_buttons.forEach((btn: any) => {
      btn.addEventListener("click", () => this.scrapeDocumentOptions(btn));
    });
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
  /** paint user message feed
 * @param { any } snapshot firestore query data snapshot
 */
  updateAssistsFeed(snapshot: any) {
    if (snapshot) this.lastAssistsSnapShot = snapshot;
    else if (this.lastAssistsSnapShot) snapshot = this.lastAssistsSnapShot;
    else return;
    const scrollToBottom = this.atBottom(this.tickets_list);

    snapshot.forEach((doc: any) => {
      const assistSection: any = document.querySelector(`div[ticketid="${doc.id}"] .assist_section`);
      const lastSubmit: any = document.querySelector(`div[ticketid="${doc.id}"] .last_submit_time`);
      lastSubmit.dataset.showseconds = "0";

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
      setTimeout(() => this.tickets_list.scrollTop = this.tickets_list.scrollHeight, 10);
    }
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
    if (snapshot) this.lastTicketsSnapshot = snapshot;
    else if (this.lastTicketsSnapshot) snapshot = this.lastTicketsSnapshot;
    else return;

    const scrollToBottom = this.atBottom(this.tickets_list);
    const oldKeys = Object.keys(this.ticketsLookup);
    this.ticketsLookup = {};
    snapshot.forEach((doc: any) => {
      let card: any = this.tickets_list.querySelector(`div[gamenumber="${doc.id}"]`);
      if (!card) {
        card = this.getTicketCardDom(doc);
      }
      this.tickets_list.insertBefore(card, this.tickets_list.firstChild);
      this.ticketsLookup[doc.id] = doc.data();
    });

    oldKeys.forEach((key: string) => {
      if (!this.ticketsLookup[key]) {
        const card: any = this.tickets_list.querySelector(`div[gamenumber="${key}"]`);
        if (card) card.remove();
      }
    });

    if (scrollToBottom) {
      setTimeout(() => this.tickets_list.scrollTop = this.tickets_list.scrollHeight, 10);
    }

    this.updateTimeSince(this.tickets_list);

    this.refreshOnlinePresence();
    this.updateAssistsFeed(null);
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
  /** generate html for message card
   * @param { any } doc firestore message document
   * @return { any } card
   */
  getTicketCardDom(doc: any): any {
    const data = doc.data();
    const gameOwnerClass = data.isGameOwner ? " message_game_owner" : "";
    const ownerClass = data.uid === this.uid ? " message_owner" : "";

    let name = "Anonymous";
    if (data.memberName) name = data.memberName;

    let img = "/images/defaultprofile.png";
    if (data.memberImage) img = data.memberImage;

    const cardWrapper = document.createElement("div");
    const deleteHTML = `<button class="delete_game" data-gamenumber="${data.gameNumber}" data-messageid="${doc.id}">
            <i class="material-icons">delete</i>
            </button>`;
    cardWrapper.innerHTML =
      `<div class="mt-1 m-1 mx-md-2 mx-sm-1 card game_message_list_item${gameOwnerClass}${ownerClass}" ticketid="${doc.id}"
      gamenumber="${doc.id}">
    <div class="m-1 user_assist_request_header">
        <div class="user_img_wrapper member_desc">
            <span style="background-image:url(${img})"></span>
        </div>
        <span class="name" style="flex:1">${name}</span>
        <button class="rerun_ticket btn btn-secondary" data-ticketid="${doc.id}">Running...</button>
        <span class="tokens_total"></span>
        <span class="tokens_prompt"></span>
        <span class="tokens_completion"></span>
        <div class="game_date">
            <div style="flex:1"></div>
            <div class="time_since last_submit_time" data-timesince="${data.submitted}" data-showseconds="1"></div>
            <div style="flex:1"></div>
        </div>
        ${deleteHTML}
    </div>
    <div class="message" style="flex:1">${data.message}</div>
    <div class="assist_section">pending...</div>
</div>`;
    const cardDom = cardWrapper.children[0];

    const deleteBtn: any = cardDom.querySelector("button.delete_game");
    deleteBtn.addEventListener("click", (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      this.deleteTicket(deleteBtn, deleteBtn.dataset.gamenumber, deleteBtn.dataset.messageid);
    });

    const reRunBtn: any = cardDom.querySelector("button.rerun_ticket");

    reRunBtn.addEventListener("click", async (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      reRunBtn.innerHTML = "Running...";
      await this.reRunTicket(reRunBtn.dataset.ticketid);
    });

    return cardDom;
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
  }
  /** process exisiting tickets and return list of ids to submit
   * @param { string } ticketId doc id
   * @return { Array<string> } list of ticket ids
  */
  generateSubmitList(ticketId = ""): Array<string> {
    const tickets: Array<string> = [];
    this.lastTicketsSnapshot.forEach((doc: any) => {
      if (ticketId !== doc.id) tickets.push(doc.id);
    });
    return tickets;
  }
  /** BaseApp override to paint profile specific authorization parameters */
  authUpdateStatusUI() {
    super.authUpdateStatusUI();
    this.currentGame = null;
    if (this.gameid_span) this.gameid_span.innerHTML = "";
    this.initRTDBPresence();

    const gameId = this.urlParams.get("game");
    if (gameId) {
      this.gameAPIJoin(gameId);
      this.currentGame = gameId;
      if (this.gameid_span) this.gameid_span.innerHTML = this.currentGame;

      if (this.gameSubscription) this.gameSubscription();
      this.gameSubscription = firebase.firestore().doc(`Games/${this.currentGame}`)
        .onSnapshot((doc: any) => this.paintGameData(doc));
    }
  }
  /** paint game data (game document change handler)
   * @param { any } gameDoc firestore query snapshot
   */
  paintGameData(gameDoc: any = null) {
    if (gameDoc) this.gameData = gameDoc.data();
    if (!this.gameData) return;

    this.document_usage_stats_line.innerHTML = `
      <span>${this.gameData.totalTokens}</span>
      <span>${this.gameData.promptTokens}</span>
      <span>${this.gameData.completionTokens}</span>
    `;

    this.last_activity_display.innerHTML = this.isoToLocal(<string>
      this.gameData.lastActivity)
      .toISOString().substring(0, 19).replace("T", " ");

    this.paintDocumentOptions();
    this._updateGameMembersList();
    this.updateUserPresence();
  }
  /** show/hide members list
   * @param { any } e event to prevent default
   */
  toggleOptionsView(e: any) {
    if (document.body.classList.contains("show_document_feed")) {
      document.body.classList.remove("show_document_feed");
      document.body.classList.add("show_document_options");
      this.document_options_toggle.innerHTML = "Chat";
    } else {
      document.body.classList.add("show_document_feed");
      document.body.classList.remove("show_document_options");
      this.document_options_toggle.innerHTML = "Options";
    }
    if (e) e.preventDefault();
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
        html += `<div class="member_list_item">
          <div class="member_online_status" data-uid="${member}"></div>
          <div class="user_img_wrapper">
            <span style="background-image:url(${data.img})"></span>
            <span>${data.name}</span>
          </div>
          <span class="member_list_time_since">${timeSince}</span>
        </div>`;
      });
    }
    this.members_list.innerHTML = html;
  }
  /** scrape options from UI and call api
   * @param { any } btn so the label can be changed while busy
  */
  async scrapeDocumentOptions(btn: any) {
    /* eslint-disable camelcase */
    const model = this.docfield_model.value;
    const max_tokens = this.docfield_max_tokens.value;
    const temperature = this.docfield_temperature.value;
    const top_p = this.docfield_top_p.value;
    const presence_penalty = this.docfield_presence_penalty.value;
    const frequency_penalty = this.docfield_frequency_penalty.value;
    const logit_bias = this.docfield_logit_bias.value;
    const stop = this.docfield_stops.value;
    const archived = this.docfield_archived_checkbox.checked ? "1" : "0";
    const tokenUsageLimit = this.docfield_usage_limit.value;

    const body: any = {
      gameNumber: this.currentGame,
      model,
      max_tokens,
      temperature,
      top_p,
      presence_penalty,
      frequency_penalty,
      logit_bias,
      stop,
      archived,
      tokenUsageLimit,
    };
    btn.innerHTML = "Saving...";
    setTimeout(() => btn.innerHTML = "Save Profile", 1000);
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

    this.docfield_model.value = this.gameData.model;
    this.docfield_max_tokens.value = this.gameData.max_tokens;
    this.docfield_temperature.value = this.gameData.temperature;
    this.docfield_top_p.value = this.gameData.top_p;
    this.docfield_presence_penalty.value = this.gameData.presence_penalty;
    this.docfield_frequency_penalty.value = this.gameData.frequency_penalty;
    this.docfield_logit_bias.value = this.gameData.logit_bias;
    this.docfield_stops.value = this.gameData.stop;
    this.docfield_usage_limit.value = this.gameData.tokenUsageLimit;
    this.docfield_archived_checkbox.checked = this.gameData.archived;

    if (this.code_link_href) {
      const path = window.location.href;
      this.code_link_href.setAttribute("href", path);
    }
  }
  /** copy game link to global clipboard */
  copyGameLinkToClipboard() {
    const path = this.code_link_href.getAttribute("href");
    navigator.clipboard.writeText(path);
  }
  /** update the splitter if needed */
  updateSplitter() {
    let horizontal = true;
    let minSize = 30;
    if (window.document.body.scrollWidth <= 500) {
      horizontal = false;
    }

    if (this.splitHorizontalCache !== horizontal) {
      let direction = "vertical";
      this.main_view_splitter.style.flexDirection = "column";
      if (horizontal) {
        this.main_view_splitter.style.flexDirection = "row";
        direction = "horizontal";
        minSize = 150;
      }

      if (this.splitInstance) this.splitInstance.destroy();
      this.splitInstance = <any>Split([".left_panel_view", ".right_panel_view"], {
        sizes: [25, 75],
        direction,
        minSize,
      });
      this.splitHorizontalCache = horizontal;
    }
  }
  /** count input token */
  updatePromptTokenStatus() {
    const tokens = window.gpt3tokenizer.encode(this.ticket_content_input.value);

    let html = "";
    tokens.forEach((token: any, index: number) => {
      const text = window.gpt3tokenizer.decode([token]);
      const tokenClass = (index % 2 === 0) ? "token_even" : "token_odd";
      html += `<span class="${tokenClass}">${text}</span>`;
    });
    this.token_visualizer_preview.innerHTML = html;

    this.prompt_token_count.innerHTML = tokens.length;
  }
}
