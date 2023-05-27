import BaseApp from "./baseapp.js";
declare const window: any;
declare const firebase: any;

/** common logic for game apps and game lobby */
export default class GameBaseApp extends BaseApp {
  apiType = "invalid";
  userPresenceStatus: any = {};
  userPresenceStatusRefs: any = {};
  verboseLog = false;
  userStatusDatabaseRef: any;
  rtdbPresenceInited = false;
  isOfflineForDatabase: any;
  isOnlineForDatabase: any;
  ticketFeedRegistered = false;
  gameData: any;
  currentGame = "";
  alertErrors = false;

  gameid_span: any = document.querySelector(".gameid_span");
  members_list: any = document.querySelector(".members_list");
  visibility_display: any = document.querySelector(".visibility_display");
  visibility_select: any = document.querySelector(".visibility_select");

  send_ticket_button: any = document.querySelector(".send_ticket_button");
  ticket_content_input: any = document.querySelector(".ticket_content_input");
  code_link_href: any = document.querySelector(".code_link_href");
  code_link_copy: any = document.querySelector(".code_link_copy");

  /** */
  constructor() {
    super();

    // redraw message feed to update time since values
    setInterval(() => this.updateTicketsFeed(null), this.baseRedrawFeedTimer);

    document.addEventListener("visibilitychange", () => this.refreshOnlinePresence());
  }
  /** update storage to show online for current user */
  refreshOnlinePresence() {
    if (this.userStatusDatabaseRef) {
      this.userStatusDatabaseRef.set({
        state: "online",
        last_changed: firebase.database.ServerValue.TIMESTAMP,
      });
    }
  }
  /** init rtdb for online persistence status */
  initRTDBPresence() {
    if (!this.uid) return;
    if (this.rtdbPresenceInited) return;

    this.rtdbPresenceInited = true;
    this.userStatusDatabaseRef = firebase.database().ref("/OnlinePresence/" + this.uid);

    this.isOfflineForDatabase = {
      state: "offline",
      last_changed: firebase.database.ServerValue.TIMESTAMP,
    };

    this.isOnlineForDatabase = {
      state: "online",
      last_changed: firebase.database.ServerValue.TIMESTAMP,
    };

    firebase.database().ref(".info/connected").on("value", (snapshot: any) => {
      if (snapshot.val() == false) return;

      this.userStatusDatabaseRef.onDisconnect().set(this.isOfflineForDatabase).then(() => {
        this.userStatusDatabaseRef.set(this.isOnlineForDatabase);
      });
    });
  }
  /** register a uid to watch for online state
   * @param { string } uid user id
  */
  addUserPresenceWatch(uid: string) {
    if (!this.userPresenceStatusRefs[uid]) {
      this.userPresenceStatusRefs[uid] = firebase.database().ref("OnlinePresence/" + uid);
      this.userPresenceStatusRefs[uid].on("value", (snapshot: any) => {
        this.userPresenceStatus[uid] = false;
        const data = snapshot.val();
        if (data && data.state === "online") this.userPresenceStatus[uid] = true;

        this.updateUserPresence();
      });
    }
  }
  /** paint users online status */
  updateUserPresence() {
    document.querySelectorAll(".member_online_status")
      .forEach((div: any) => {
        if (this.userPresenceStatus[div.dataset.uid]) div.classList.add("online");
        else div.classList.remove("online");
      });

    document.body.classList.remove("seat_user_online0");
    document.body.classList.remove("seat_user_online1");
    document.body.classList.remove("seat_user_online2");
    document.body.classList.remove("seat_user_online3");

    if (this.gameData) {
      if (this.userPresenceStatus[this.gameData["seat0"]]) document.body.classList.add("seat_user_online0");
      if (this.userPresenceStatus[this.gameData["seat1"]]) document.body.classList.add("seat_user_online1");
      if (this.userPresenceStatus[this.gameData["seat2"]]) document.body.classList.add("seat_user_online2");
      if (this.userPresenceStatus[this.gameData["seat3"]]) document.body.classList.add("seat_user_online3");
    }
  }
  /** static data for guess and match (name, logo)
   * @return { any } map for lookup game details
  */
  get docTypeMetaData(): any {
    return {
         aichat: {
        name: "AI Chat",
        icon: "/images/logo_aichat.png",
      },
    };
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
  /** call join game api
   * @param { string } gameNumber doc id for game
   */
  async gameAPIJoin(gameNumber: string) {
    if (!this.profile) return;

    const body = {
      gameNumber,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/games/join", {
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
      console.log("join", json);
    }
    return;
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
  updateTicketsFeed(snapshot: any) {
    return;
  }
  /** paint user editable game options 
   * @param { boolean } defaultOptions initalizes game options
  */
  paintOptions(defaultOptions: boolean = true) {
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
}
