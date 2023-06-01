import BaseApp from "./baseapp.js";
import LoginHelper from "./loginhelper.js";
import DocOptionsHelper from "./docoptionshelper.js";
declare const window: any;
declare const firebase: any;

/** Dashboard Document Management App - for listing, joining and creating games  */
export class DashboardApp extends BaseApp {
  dashboard_documents_view: any = document.querySelector(".dashboard_documents_view");
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

  login = new LoginHelper(this);
  documentOptions = new DocOptionsHelper(this);

  /** */
  constructor() {
    super();

    this.create_game_afterfeed_button.addEventListener("click", () => this.createNewGame());

    this.initRTDBPresence();

    // redraw feeds to update time since values
    setInterval(() => this.updateTimeSince(this.dashboard_documents_view), 30000);

    window.$(".document_label_picker").select2({
      tags: true,
      placeHolder: "Add labels...",
    });

    this.document_label_filter.addEventListener("input", () => this.updateGamesFeed(null));
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
        let card: any = this.dashboard_documents_view.querySelector(`a[gamenumber="${doc.id}"]`);
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
        const card: any = this.dashboard_documents_view.querySelector(`a[gamenumber="${key}"]`);
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
    const html = `<a href="/${data.gameType}/?game=${data.gameNumber}"
       class="list-group-item list-group-item-action document_list_item card card_shadow_sm ${ownerClass}"
     data-gamenumber="${doc.id}" gamenumber="${doc.id}">
    <div class="d-flex justify-content-end">
        <div class="document_name">${title}</div>
        <div class="document_status d-flex flex-row justify-content-between">
            <div class="user_img_wrapper">
                <div class="d-flex flex-row">
                    <span class="align-self-center pe-2"><img class="owner_img" src="${data.memberImages[data.createUser]}"></span>
                    <span class="owner_name">${data.memberNames[data.createUser]}</span>
                </div>
            </div>
            <div class="mx-4 time_since last_submit_time text-center text-md-end" data-timesince="${data.lastActivity}"
             data-showseconds="0"></div>
        </div>
        <button class="details_game btn btn-secondary" data-gamenumber="${data.gameNumber}">
            Details
        </button>
    </div></a>`;
    const ctl = document.createElement("div");
    ctl.innerHTML = html;
    const card = ctl.children[0];


    const details: any = card.querySelector("button.details_game");
    details.addEventListener("click", (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      const btn: any = document.getElementById("show_document_options_popup");
      btn.click();
      this.editedDocumentId = details.dataset.gamenumber;
      this.documentOptions.show();
    });

    return card;
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

    const ids = Object.keys(this.documentsLookup);
    ids.forEach((id: string) => {
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
}
