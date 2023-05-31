import BaseApp from "./baseapp.js";
declare const window: any;
declare const firebase: any;

/** Game Lobby App - for listing, joining and creating games  */
export class GamesApp extends BaseApp {
  dashboard_documents_view: any = document.querySelector(".dashboard_documents_view");
  join_game_btn: any = document.querySelector(".join_game_btn");
  create_game_afterfeed_button: any = document.querySelector(".create_game_afterfeed_button");
  new_game_type_wrappers: any = document.querySelectorAll(".new_game_type_wrapper");
  basic_options: any = document.querySelector(".basic_options");
  userprofile_description: any = document.querySelector(".userprofile_description");
  gameFeedSubscription: any;
  publicFeedSubscription: any;
  lastGamesFeedSnapshot: any;
  lastPublicFeedSnapshot: any;
  gameFeedInited = false;
  creatingNewRecord = false;
  documentsLookup: any = {};

  /** */
  constructor() {
    super();


    this.join_game_btn.addEventListener("click", () => this.joinGame(null));
    this.create_game_afterfeed_button.addEventListener("click", () => this.createNewGame());

    this.initRTDBPresence();

    // redraw feeds to update time since values
    setInterval(() => this.updateTimeSince(this.dashboard_documents_view), 30000);

  
  }
  /** BaseApp override to update additional use profile status */
  authUpdateStatusUI() {
    super.authUpdateStatusUI();
    this.initGameFeeds();
    this.initRTDBPresence();

    if (this.profile) {
      let name = this.profile.displayName;
      let img = this.profile.displayImage;
      if (!name) name = "Anonymous";
      if (!img) img = "/images/defaultprofile.png";
    // TO DO - put profile icon in navbar
   //   this.userprofile_description.innerHTML = this.__getUserTemplate("", name, img);
    }
  }
  /** init listening events on games store to populate feeds in realtime */
  async initGameFeeds() {
    if (this.gameFeedInited || !this.profile) return;
    this.gameFeedInited = true;

    if (this.gameFeedSubscription) this.gameFeedSubscription();
    if (this.publicFeedSubscription) this.publicFeedSubscription();

    this.gameFeedSubscription = firebase.firestore().collection(`Games`)
      .orderBy(`members.${this.uid}`, "desc")
      .limit(20)
      .onSnapshot((snapshot: any) => this.updateGamesFeed(snapshot));
  }
  /** paint games feed from firestore snapshot
   * @param { any } snapshot event driven feed data from firestore
  */
  updateGamesFeed(snapshot: any) {
    if (snapshot) this.lastGamesFeedSnapshot = snapshot;
    else if (this.lastGamesFeedSnapshot) snapshot = this.lastGamesFeedSnapshot;
    else return;

    const oldKeys = Object.keys(this.documentsLookup);
    this.documentsLookup = {};
    snapshot.forEach((doc: any) => {
      let card: any = this.dashboard_documents_view.querySelector(`div[gamenumber="${doc.id}"]`);
      if (!card) {
        card = this.getDocumentCardElement(doc);
      }
      this.dashboard_documents_view.appendChild(card);
      this.documentsLookup[doc.id] = doc.data();
    });

    oldKeys.forEach((key: string) => {
      if (!this.documentsLookup[key]) {
        const card: any = this.dashboard_documents_view.querySelector(`div[gamenumber="${key}"]`);
        if (card) card.remove();
      }
    });
    this.updateTimeSince(this.dashboard_documents_view);
    this.refreshOnlinePresence();
  }
  /** paint html list card
   * @param { any } doc Firestore doc for game
   * @return { string } html for card
  */
  getDocumentCardElement(doc: any) {
    const data = doc.data();
    let ownerClass = "";
    if (data.createUser === this.uid) ownerClass += " feed_game_owner";

  //  const ownerHTML = this.__getUserTemplate(data.createUser, data.memberNames[data.createUser], data.memberImages[data.createUser], true);

    let timeStr = this.isoToLocal(data.created).toISOString().substr(11, 5);
    let hour = Number(timeStr.substr(0, 2));
    const suffix = hour < 12 ? "am" : "pm";

    hour = hour % 12;
    if (hour === 0) hour = 12;
    timeStr = hour.toString() + timeStr.substr(2) + " " + suffix;
    const html = `<div class="accordion-item document_list_item card card_shadow_sm document_list_item${ownerClass} gametype_${data.gameType}"
    data-gamenumber="${doc.id}" gamenumber="${doc.id}">
    <div class="accordion-header">
        <button class="accordion-button d-flex justify-content-end collasped" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${doc.id}"
            aria-expanded="true" aria-controls="collapse${doc.id}">
            <div class="document_name">Name of this document</div>
            <div class="document_status d-flex flex-row justify-content-between">
            <div class="user_img_wrapper">
              <div class="d-flex flex-row">
               <span class="align-self-center pe-2"><img class="owner_img" src="${data.memberImages[data.createUser]}"></span>
                <span class="owner_name">${data.memberNames[data.createUser]}</span>
              </div>  
            </div>
            <div class="mx-4 time_since last_submit_time text-center text-md-end" data-timesince="${data.lastActivity}" data-showseconds="0"></div>
            </div>
        </button>
    </div>
    <div id="collapse${doc.id}" class="accordion-collapse collapse" aria-labelledby="headingOne"
        data-bs-parent="#dashboard_documents_view">
        <div class="accordion-body">
            <a href="/${data.gameType}/?game=${data.gameNumber}" class="game_number_open btn btn-secondary">
                <span class="">Open</span>
            </a>
            <button class="delete_game btn btn-secondary" data-gamenumber="${data.gameNumber}">
                Delete
            </button>
            <button class="leave_game btn btn-secondary" data-gamenumber="${data.gameNumber}">
                Leave
            </button>
            <button class="code_link game" data-url="/${data.gameType}/?game=${data.gameNumber}">
                <i class="material-icons">content_copy</i> <span>${data.gameNumber}</span></button>
        </div>
    </div>
</div>`;

    const ctl = document.createElement("div");
    ctl.innerHTML = html;
    const card = ctl.children[0];
    const del: any = card.querySelector("button.delete_game");
    del.addEventListener("click", (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      this.deleteGame(del, del.dataset.gamenumber);
    });

    const leave: any = card.querySelector("button.leave_game");
    leave.addEventListener("click", (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      this.logoutGame(leave, leave.dataset.gamenumber);
    });

    const link: any = card.querySelector(".code_link");
    link.addEventListener("click", () => this.copyGameLink(link));
    return card;
  }
  /** copy game url link to clipboard
   * @param { any } btn dom control
   */
  copyGameLink(btn: any) {
    navigator.clipboard.writeText(window.location.origin + btn.dataset.url);
  }
  /** join game api call
   * @param { any } gameNumber
   * @param { string } gameType match or guess
   */
  async joinGame(gameNumber: any, gameType = "games"): Promise<void> {
    if (!gameNumber) gameNumber = (<any>document.querySelector(".game_code_start")).value;
    const a = document.createElement("a");
    a.setAttribute("href", `/${gameType}/?game=${gameNumber}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  /** create new game api call */
  async createNewGame() {
    if (this.creatingNewRecord) return;
    if (!this.profile) return;
    this.creatingNewRecord = true;

    this.create_game_afterfeed_button.setAttribute("disabled", true);
    this.create_game_afterfeed_button.innerHTML = "Creating...";

    const gameType = "aichat";
    const body = {
      gameType,
    };

    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/games/create", {
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

    const a = document.createElement("a");
    a.setAttribute("href", `/${gameType}/?game=${json.gameNumber}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  /** delete game api call
   * @param { any } btn dom control
   * @param { string } gameNumber
   */
  async deleteGame(btn: any, gameNumber: string) {
    if (!confirm("Are you sure you want to delete this game?")) return;

    btn.setAttribute("disabled", "true");
    if (!gameNumber) {
      alert("Game Number not found - error");
      return;
    }

    const body = {
      gameNumber,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/games/delete", {
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
      console.log("delete error", result);
      alert("Delete failed");
    }
  }
  /** logout api call
   * @param { any } btn dom control
   * @param { string } gameNumber
   */
  async logoutGame(btn: any, gameNumber: string) {
    btn.setAttribute("disabled", "true");
    if (!gameNumber) {
      alert("Game Number not found - error");
      return;
    }

    const body = {
      gameNumber,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/games/leave", {
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
    if (!result.success) alert("Logout failed");
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
}
