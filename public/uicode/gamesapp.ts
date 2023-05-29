import BaseApp from "./baseapp.js";
declare const window: any;
declare const firebase: any;

/** Game Lobby App - for listing, joining and creating games  */
export class GamesApp extends BaseApp {
  create_new_game_btn: any = document.querySelector(".create_new_game_btn");
  game_history_view: any = document.querySelector(".game_history_view");
  join_game_btn: any = document.querySelector(".join_game_btn");
  create_game_afterfeed_button: any = document.querySelector(".create_game_afterfeed_button");
  menu_create_game: any = document.querySelector(".menu_create_game");
  new_game_type_wrappers: any = document.querySelectorAll(".new_game_type_wrapper");
  basic_options: any = document.querySelector(".basic_options");
  userprofile_description: any = document.querySelector(".userprofile_description");
  recentExpanded: any = {};
  gameFeedSubscription: any;
  publicFeedSubscription: any;
  lastGamesFeedSnapshot: any;
  lastPublicFeedSnapshot: any;
  gameFeedInited = false;
  creatingNewRecord = false;

  /** */
  constructor() {
    super();


    this.join_game_btn.addEventListener("click", () => this.joinGame(null));
    this.menu_create_game.addEventListener("click", () => this.createNewGame());
    this.create_game_afterfeed_button.addEventListener("click", () => this.createNewGame());
 


    this.initRTDBPresence();

    // redraw feeds to update time since values
    setInterval(() => this.updateGamesFeed(null), this.timeSinceRedraw);

    this.init();
  }
  /** async init to be called at end of constructor */
  async init() {
    const gameId: any = this.urlParams.get("game");
    if (gameId && await this._handlePassedInGameID(gameId)) return;
  }
  /** handle gameid passed as query string and navigate to game
   * @param { string } gameId storage record id of game to load
   * @return { Promise<boolean> } true if navigating, false if invalid game id
   */
  async _handlePassedInGameID(gameId: any): Promise<boolean> {
    const gameQuery = await firebase.firestore().doc(`Games/${gameId}`).get();
    const gameData = gameQuery.data();

    if (!gameData) {
      alert("game not found");
      return false;
    }

    window.history.replaceState({
      state: 1,
    }, "", `/${gameData.gameType}/?game=${gameId}`);
    location.reload();

    return true;
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
      this.userprofile_description.innerHTML = this.__getUserTemplate("", name, img);
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

    let html = "";
    snapshot.forEach((doc: any) => html += this._renderGameFeedLine(doc));
    this.game_history_view.innerHTML = html;

    this.game_history_view.querySelectorAll("button.delete_game")
      .forEach((btn: any) => btn.addEventListener("click", (e: any) => {
        e.stopPropagation();
        e.preventDefault();
        this.deleteGame(btn, btn.dataset.gamenumber);
      }));

    this.game_history_view.querySelectorAll("button.leave_game")
      .forEach((btn: any) => btn.addEventListener("click", (e: any) => {
        e.stopPropagation();
        e.preventDefault();
        this.logoutGame(btn, btn.dataset.gamenumber);
      }));

    this.game_history_view.querySelectorAll(".code_link")
      .forEach((btn: any) => btn.addEventListener("click", () => this.copyGameLink(btn)));

    this.refreshOnlinePresence();
  }
  /** compact html block to display user
   * @param { string } member uid of firebase user
   * @param { string } name display name
   * @param { string } img url path of display image
   * @param { boolean } onlineStatus
   * @param { boolean } impact use impact font (shows selected)
   * @return { string } raw html containing user specific values
  */
  __getUserTemplate(member: string, name: string, img: string, onlineStatus = false, impact = false) {
    const impactFont = impact ? " impact-font" : "";
    let innerHTML = `<span style="background-image:url(${img});display: inline-block;"></span>
      <span class="name${impactFont}">${name}</span>`;
    if (onlineStatus) {
      this.addUserPresenceWatch(member);
      innerHTML += `<div class="member_online_status" data-uid="${member}"></div>`;
    }

    return innerHTML;
  }
  /** paint html list card
   * @param { any } doc Firestore doc for game
   * @param { boolean } publicFeed true if this is public open games feed
   * @return { string } html for card
  */
  _renderGameFeedLine(doc: any, publicFeed = false) {
    const data = doc.data();
    let ownerClass = "";
    const gnPrefix = publicFeed ? "public_" : "";
    if (data.createUser === this.uid) ownerClass += " feed_game_owner";
    const modeClass = " gameitem_" + data.mode;

    const ownerHTML = this.__getUserTemplate(data.createUser, data.memberNames[data.createUser], data.memberImages[data.createUser], true);

    const title = "AI Chat";
    const img = `url(/images/logo_aichat.png)`;
    const timeSince = this.timeSince(new Date(data.lastActivity));
    let timeStr = this.isoToLocal(data.created).toISOString().substr(11, 5);
    let hour = Number(timeStr.substr(0, 2));
    const suffix = hour < 12 ? "am" : "pm";

    hour = hour % 12;
    if (hour === 0) hour = 12;
    timeStr = hour.toString() + timeStr.substr(2) + " " + suffix;

    return `<div class="gamelist_item${ownerClass} gametype_${data.gameType} ${modeClass}"
          data-gamenumber="${gnPrefix}${doc.id}">
      <div class="gamefeed_item_header">
        <div style="background-image:${img}" class="game_type_image"></div>
        <div class="game_name">
          <span class="title">
          ${title}
          </span>
        </div>
        <div class="open_button_wrapper">
          <a href="/${data.gameType}/?game=${data.gameNumber}" class="game_number_open btn btn-secondary">
            <span class="">Open</span>
          </a>
          <button class="delete_game btn btn-secondary" data-gamenumber="${data.gameNumber}">
          Delete
          </button>
          <button class="leave_game btn btn-secondary" data-gamenumber="${data.gameNumber}">
          Leave
         </button>
        </div>
      </div>
      <div class="gamefeed_timesince"><span class="timesince">${timeSince}</span></div>
      <div style="display:flex;flex-direction:row">
        <button class="code_link game" data-url="/${data.gameType}/?game=${data.gameNumber}">
          <i class="material-icons">content_copy</i> <span>${data.gameNumber}</span></button>
        <div style="flex:1"></div>
      </div>
        <span class="game_owner_label owner_wrapper">Game<br>Owner</span>
        <div class="owner_wrapper game_user_wrapper">
           ${ownerHTML}
        </div>
      <div style="clear:both"></div>
    </div>`;
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

    this.create_new_game_btn.setAttribute("disabled", true);
    this.create_new_game_btn.innerHTML = "Creating...";

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
