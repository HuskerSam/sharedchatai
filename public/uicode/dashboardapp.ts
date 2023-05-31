import BaseApp from "./baseapp.js";
import LoginHelper from "./loginhelper.js";
declare const window: any;
declare const firebase: any;

/** Dashboard Document Management App - for listing, joining and creating games  */
export class DashboardApp extends BaseApp {
  dashboard_documents_view: any = document.querySelector(".dashboard_documents_view");
  join_game_btn: any = document.querySelector(".join_game_btn");
  create_game_afterfeed_button: any = document.querySelector(".create_game_afterfeed_button");
  new_game_type_wrappers: any = document.querySelectorAll(".new_game_type_wrapper");
  basic_options: any = document.querySelector(".basic_options");
  userprofile_description: any = document.querySelector(".userprofile_description");
  owner_note_field: any = document.querySelector("#owner_note_field");
  editedDocumentId = "";
  gameFeedSubscription: any;
  publicFeedSubscription: any;
  lastGamesFeedSnapshot: any;
  lastPublicFeedSnapshot: any;
  gameFeedInited = false;
  creatingNewRecord = false;
  documentsLookup: any = {};
  document_label_filter: any = document.querySelector(".document_label_filter");
  owner_note_field_edit: any = document.querySelector("#owner_note_field_edit");
  save_game_afterfeed_button: any = document.querySelector(".save_game_afterfeed_button");
  close_edit_modal_button: any = document.querySelector(".close_edit_modal_button");
  login = new LoginHelper(this);

  /** */
  constructor() {
    super();

    this.join_game_btn.addEventListener("click", () => this.joinGame(null));
    this.create_game_afterfeed_button.addEventListener("click", () => this.createNewGame());

    this.initRTDBPresence();

    // redraw feeds to update time since values
    setInterval(() => this.updateTimeSince(this.dashboard_documents_view), 30000);

    window.$(".document_label_picker").select2({
      tags: true,
      placeHolder: "Add labels...",
    });

    window.$(".document_label_picker_edit").select2({
      tags: true,
      placeHolder: "Add labels...",
    });

    this.document_label_filter.addEventListener("input", () => this.updateGamesFeed(null));
    this.save_game_afterfeed_button.addEventListener("click", () => this.saveDocumentOptions());
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

      const queryLabelSelect2 = window.$(".document_label_picker");
      queryLabelSelect2.val(null).trigger("change");

      let labelString = this.profile.documentLabels;
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
    const localLookup: any = {};
    const labelFilter = this.document_label_filter.value;
    snapshot.forEach((doc: any) => {
      let labels = doc.data().label;
      if (!labels) labels = "";
      const labelsArray = labels.split(",");
      if (labelFilter === "All" || labelsArray.indexOf(labelFilter) !== -1) {
        let card: any = this.dashboard_documents_view.querySelector(`div[gamenumber="${doc.id}"]`);
        if (!card) {
          card = this.getDocumentCardElement(doc);
        }
        this.dashboard_documents_view.appendChild(card);
        localLookup[doc.id] = doc.data();
      }
      this.documentsLookup[doc.id] = doc.data();
    });

    oldKeys.forEach((key: string) => {
      if (!localLookup[key]) {
        const card: any = this.dashboard_documents_view.querySelector(`div[gamenumber="${key}"]`);
        if (card) card.remove();
      }
    });
    this.updateTimeSince(this.dashboard_documents_view);
    this.paintLabelSelect();
    this.refreshOnlinePresence();
  }
  /** paint html list card
   * @param { any } doc Firestore doc for game
   * @return { string } html for card
  */
  getDocumentCardElement(doc: any) {
    const data = doc.data();
    let title = "";
    if (doc.data().title) title = doc.data().title;
    if (!title) title = "unused";
    let ownerClass = "";
    if (data.createUser === this.uid) ownerClass += " feed_game_owner";

    //  const ownerHTML = this.__getUserTemplate(data.createUser,
    // data.memberNames[data.createUser], data.memberImages[data.createUser], true);

    let timeStr = this.isoToLocal(data.created).toISOString().substr(11, 5);
    let hour = Number(timeStr.substr(0, 2));
    const suffix = hour < 12 ? "am" : "pm";

    hour = hour % 12;
    if (hour === 0) hour = 12;
    timeStr = hour.toString() + timeStr.substr(2) + " " + suffix;
    const html = `<div class="accordion-item document_list_item card card_shadow_sm document_list_item${ownerClass}
           gametype_${data.gameType}"
    data-gamenumber="${doc.id}" gamenumber="${doc.id}">
    <div class="accordion-header">
        <button class="accordion-button d-flex justify-content-end collasped" type="button" 
                data-bs-toggle="collapse" data-bs-target="#collapse${doc.id}"
            aria-expanded="true" aria-controls="collapse${doc.id}">
            <div class="document_name">${title}</div>
            <div class="document_status d-flex flex-row justify-content-between">
            <div class="user_img_wrapper">
              <div class="d-flex flex-row">
               <span class="align-self-center pe-2"><img class="owner_img" src="${data.memberImages[data.createUser]}"></span>
                <span class="owner_name">${data.memberNames[data.createUser]}</span>
              </div>  
            </div>
            <div class="mx-4 time_since last_submit_time text-center text-md-end"
               data-timesince="${data.lastActivity}" data-showseconds="0"></div>
            </div>
        </button>
    </div>
    <div id="collapse${doc.id}" class="accordion-collapse collapse" aria-labelledby="headingOne"
        data-bs-parent="#dashboard_documents_view">
        <div class="accordion-body">
            <a href="/${data.gameType}/?game=${data.gameNumber}" class="game_number_open btn btn-secondary">
                <span class="">Open</span>
            </a>
            <button class="details_game btn btn-secondary" data-gamenumber="${data.gameNumber}">
                Details
            </button>
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

    const details: any = card.querySelector("button.details_game");
    details.addEventListener("click", (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      const btn: any = document.getElementById("show_document_options_popup");
      btn.click();
      this.showDetailsPopup(details.dataset.gamenumber);
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
  /** show document details modal
   * @param { string } gameNumber doc id
  */
  showDetailsPopup(gameNumber: string) {
    this.editedDocumentId = gameNumber;
    const doc = this.documentsLookup[gameNumber];
    if (doc.createUser === this.uid) {
      (<any>document.getElementById("owner_note_field_edit")).value = doc.note;
      (<any>document.querySelector(".owner_options_edit_section")).style.display = "block";
    } else {
      (<any>document.getElementById("owner_note_field_edit")).value = "Shared Document";
      (<any>document.querySelector(".owner_options_edit_section")).style.display = "none";
    }

    if (doc.createUser === this.uid) {
      const queryLabelSelect2 = window.$(".document_label_picker_edit");
      queryLabelSelect2.val(null).trigger("change");

      try {
        let labelString = doc.label;
        if (!labelString) labelString = "";
        const labelArray = labelString.split(",");
        labelArray.forEach((label: string) => {
          if (label !== "") {
            if (queryLabelSelect2.find("option[value='" + label + "']").length) {
              queryLabelSelect2.val(label).trigger("change");
            } else {
              // Create a DOM Option and pre-select by default
              const newOption = new Option(label, label, true, true);
              // Append it to the select
              queryLabelSelect2.append(newOption).trigger("change");
            }
          }
        });
      } catch (error) {
        console.log(error);
      }
    }
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
      label: this.scrapeLabels(),
      note: this.owner_note_field.value,
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
  /** get labels across app
   * @return { Array<any> } array of label strings
  */
  getLabelsList(): Array<any> {
    const labels: any = [];
    if (!this.documentsLookup) return [];
   this.documentsLookup.forEach((id: string) => {
      const doc = this.documentsLookup[id];
      let commaLabels = "";
      if (doc.label) commaLabels = doc.label;
      const docLabels = commaLabels.split(",");
      docLabels.forEach((label: string) => {
        const str = label.trim();
        if (str) labels[str] = true;
      });
    });
    const arr = Object.keys(labels).sort();
    return arr;
  }
  /** paint label select */
  paintLabelSelect() {
    const labels = this.getLabelsList();
    let html = "<option>All</option>";
    const startingValue = this.document_label_filter.value;

    labels.forEach((label: string) => html += `<option>${label}</option>`);
    this.document_label_filter.innerHTML = html;
    this.document_label_filter.value = startingValue;
    if (this.document_label_filter.selectedIndex === -1) {
      this.document_label_filter.selectedIndex = 0;
      this.updateGamesFeed(null);
    }
  }
  /** scrape labels from dom and return comma delimited list
   * @return { string } comma delimited list
  */
  scrapeLabels(): string {
    const data = window.$(".document_label_picker").select2("data");
    const labels: Array<string> = [];
    data.forEach((item: any) => {
      if (item.text.trim()) labels.push(item.text.trim());
    });

    return labels.join(",");
  }
  /** use jquery to extract label list from select2
   * @return { string } comma delimited list of labels
    */
  scrapeDocumentEditLabels(): string {
    const data = window.$(".document_label_picker_edit").select2("data");
    const labels: Array<string> = [];
    data.forEach((item: any) => {
      if (item.text.trim()) labels.push(item.text.trim());
    });

    return labels.join(",");
  }
  /** send user (optional owner) settings for document to api */
  async saveDocumentOptions() {
    const docId = this.editedDocumentId;
    const label = this.scrapeDocumentEditLabels();
    const note = this.owner_note_field_edit.value;

    const body: any = {
      gameNumber: docId,
      label,
      note,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/games/owner/options", {
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
      alert("Unable to save options " + json.errorMessage);
    }
    this.close_edit_modal_button.click();
  }
}
