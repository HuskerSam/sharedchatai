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

  tickets_list: any = document.querySelector(".tickets_list");
  document_options_toggle: any = document.querySelector(".document_options_toggle");

  members_list: any = document.querySelector(".members_list");
  visibility_display: any = document.querySelector(".visibility_display");
  visibility_select: any = document.querySelector(".visibility_select");

  send_ticket_button: any = document.querySelector(".send_ticket_button");
  ticket_content_input: any = document.querySelector(".ticket_content_input");
  code_link_href: any = document.querySelector(".code_link_href");
  code_link_copy: any = document.querySelector(".code_link_copy");
  gameid_span: any = document.querySelector(".gameid_span");
  main_view_splitter: any = document.querySelector(".main_view_splitter");
  splitInstance: any = null;

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
    setInterval(() => this.updateTicketsFeed(null), this.baseRedrawFeedTimer);

    document.addEventListener("visibilitychange", () => this.refreshOnlinePresence());
  }
  /** setup data listender for user messages */
  async initTicketFeed() {
    if (this.ticketFeedRegistered) return;
    this.ticketFeedRegistered = true;
    const gameId = this.urlParams.get("game");
    if (!gameId) return;

    if (this.ticketsSubscription) this.ticketsSubscription();

    this.ticketsSubscription = firebase.firestore().collection(`Games/${gameId}/tickets`)
      .orderBy(`created`, "desc")
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

    snapshot.forEach((doc: any) => {
      const assistSection: any = document.querySelector(`div[ticketid="${doc.id}"] .assist_section`);

      if (assistSection) {
        const data: any = doc.data();
        console.log(data);
        if (data.success) {
          if (data.assist.error) {
            assistSection.innerHTML = data.assist.error.code;
          } else {
            assistSection.innerHTML = data.assist.choices["0"].message.content;
          }
        } else assistSection.innerHTML = "API Error";
      }
    });
  }
  /** paint user message feed
   * @param { any } snapshot firestore query data snapshot
   */
  updateTicketsFeed(snapshot: any) {
    if (snapshot) this.lastTicketsSnapshot = snapshot;
    else if (this.lastTicketsSnapshot) snapshot = this.lastTicketsSnapshot;
    else return;

    let html = "";
    snapshot.forEach((doc: any) => html += this._renderTicketFeedLine(doc));

    this.tickets_list.innerHTML = html;

    this.tickets_list.querySelectorAll("button.delete_game")
      .forEach((btn: any) => btn.addEventListener("click", (e: any) => {
        e.stopPropagation();
        e.preventDefault();
        this.deleteTicket(btn, btn.dataset.gamenumber, btn.dataset.messageid);
      }));

    this.refreshOnlinePresence();
    this.updateAssistsFeed(null);
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
   * @return { string } html for card
   */
  _renderTicketFeedLine(doc: any) {
    const data = doc.data();
    const gameOwnerClass = data.isGameOwner ? " message_game_owner" : "";
    const ownerClass = data.uid === this.uid ? " message_owner" : "";

    let name = "Anonymous";
    if (data.memberName) name = data.memberName;

    let img = "/images/defaultprofile.png";
    if (data.memberImage) img = data.memberImage;

    let deleteHTML = "";

    deleteHTML = `<button class="delete_game" data-gamenumber="${data.gameNumber}" data-messageid="${doc.id}">
            <i class="material-icons">delete</i>
            </button>`;

    let message = data.message;

    const timeSince = this.timeSince(new Date(data.created)).replaceAll(" ago", "");
    return `<div class="card game_message_list_item${gameOwnerClass}${ownerClass}" ticketid="${doc.id}">
    <div style="display:flex;flex-direction:row">
        <div class="game_user_wrapper member_desc">
            <span style="background-image:url(${img})"></span>
        </div>
        <span style="flex:1">${name}</span>
        <div class="game_date">
            <div style="flex:1"></div>
            <div>${timeSince}</div>
            <div style="flex:1"></div>
        </div>
        ${deleteHTML}
    </div>
    <div class="message" style="flex:1">${message}</div>
    <div class="assist_section">pending...</div>
</div>`;
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
   * @return { Array<string> } list of ticket ids
  */
  generateSubmitList(): Array<string> {
    const tickets: Array<string> = [];
    this.lastTicketsSnapshot.forEach((doc: any) => tickets.push(doc.id));
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


    this.paintOptions(false);
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
          <div class="game_user_wrapper">
            <span style="background-image:url(${data.img})"></span>
            <span>${data.name}</span>
          </div>
          <span class="member_list_time_since">${timeSince}</span>
        </div>`;
      });
    }
    this.members_list.innerHTML = html;
  }
  /** scrape options from UI and call api */
  async gameAPIOptions() {
    const visibility = this.visibility_select.value;
    const body: any = {
      gameNumber: this.currentGame,
      visibility,
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
   * @param { boolean } defaultOptions initalizes game options
  */
  paintOptions(defaultOptions = true) {
    if (this.gameData.createUser === this.uid) document.body.classList.add("game_owner");
    else document.body.classList.remove("game_owner");

    if (defaultOptions) {
      this.visibility_display.innerHTML = this.gameData.visibility;
      this.visibility_select.value = this.gameData.visibility;
    }

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
}
