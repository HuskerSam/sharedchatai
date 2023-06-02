import BaseApp from "./baseapp.js";
import LoginHelper from "./loginhelper.js";
import DocOptionsHelper from "./docoptionshelper.js";
import DocCreateHelper from "./doccreatehelper.js";
import ProfileHelper from "./profilehelper.js";
declare const firebase: any;

/** Dashboard Document Management App - for listing, joining and creating games  */
export class DashboardApp extends BaseApp {
  dashboard_documents_view: any = document.querySelector(".dashboard_documents_view");
  new_game_type_wrappers: any = document.querySelectorAll(".new_game_type_wrapper");
  basic_options: any = document.querySelector(".basic_options");
  userprofile_description: any = document.querySelector(".userprofile_description");
  dashboard_create_game: any = document.querySelector(".dashboard_create_game");
  editedDocumentId = "";
  gameFeedSubscription: any;
  lastGamesFeedSnapshot: any;
  gameFeedInited = false;
  documentsLookup: any = {};
  lastTicketsSnapshot: any = null;
  lastAssistsSnapshot: any = null;
  assistsLookup: any = {};
  document_label_filter: any = document.querySelector(".document_label_filter");
  profile_menu_anchor: any = document.querySelector(".profile_menu_anchor");

  login = new LoginHelper(this);
  documentCreate = new DocCreateHelper(this);
  documentOptions = new DocOptionsHelper(this, "dashboard_options_view");
  profileHelper = new ProfileHelper(this);

  /** */
  constructor() {
    super();

    this.initRTDBPresence();

    this.dashboard_create_game.addEventListener("click", () => this.documentCreate.show());

    // redraw feeds to update time since values
    setInterval(() => this.updateTimeSince(this.dashboard_documents_view, true), 30000);

    this.document_label_filter.addEventListener("input", () => this.updateGamesFeed(null));

    this.profile_menu_anchor.addEventListener("click", (event: any) => {
      event.stopPropagation();
      event.preventDefault();
      this.profileHelper.show();
    });
  }
  /** load tickets for options/export dialog
   * @param { any } documentId firestore record id
  */
  async loadAndShowOptionsDialog(documentId: any) {
    const btn: any = document.getElementById("show_document_options_popup");
    btn.click();
    this.editedDocumentId = documentId;
    this.lastTicketsSnapshot = {};

    this.lastTicketsSnapshot = await firebase.firestore().collection(`Games/${documentId}/tickets`).get();
    this.lastAssistsSnapshot = await firebase.firestore().collection(`Games/${documentId}/assists`).get();
    this.assistsLookup = {};
    this.lastAssistsSnapshot.forEach((assistDoc: any) => this.assistsLookup[assistDoc.id] = assistDoc.data());
    this.documentOptions.show();
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
      this.userprofile_description.innerHTML = `<img class="user_dashboard_img" src="${img}">
      <span class="user_name">${name}</span>`;
    }
  }
  /** query dom for all chat_user_image and chat_user_name elements and update */
  updateUserNamesImages() {
    const imgCtls = document.querySelectorAll(".chat_user_image");
    const nameCtls = document.querySelectorAll(".chat_user_name");
    imgCtls.forEach((imgCtl: any) => {
      const uid: any = imgCtl.dataset.chatuserid;
      const docid: any = imgCtl.dataset.docid;
      if (uid !== undefined && docid != undefined) {
        const imgPath = this.documentsLookup[docid].memberImages[uid];
        imgCtl.setAttribute("src", imgPath);
      }
    });

    nameCtls.forEach((nameCtl: any) => {
      const uid: any = nameCtl.dataset.chatuserid;
      const docid: any = nameCtl.dataset.docid;
      if (uid !== undefined && docid != undefined) {
        const name = this.documentsLookup[docid].memberNames[uid];
        nameCtl.innerHTML = name;
      }
    });
  }
  /** init listening events on games store to populate feeds in realtime */
  async initGameFeeds() {
    if (this.gameFeedInited || !this.profile) return;
    this.gameFeedInited = true;

    if (this.gameFeedSubscription) this.gameFeedSubscription();

    this.gameFeedSubscription = firebase.firestore().collection(`Games`)
      .orderBy(`members.${this.uid}`, "desc")
      .limit(500)
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

        const titleDom = card.querySelector(".document_name");
        let title = doc.data().title;
        if (!title) title = "";
        if (title === "") title = `<span class="unused_chatroom_title_placeholder">unused</span>`;
        titleDom.innerHTML = title;

        const sharedStatus = this.getDocumentSharedStatus(doc.data());
        const sharedIcon = card.querySelector(".document_shared_status_icon");
        if (sharedStatus === 0) sharedIcon.style.color = "rgb(50, 50, 50)";
        if (sharedStatus === 1) sharedIcon.style.color = "rgb(80, 80, 255)";
        if (sharedStatus === 2) sharedIcon.style.color = "rgb(20, 200, 20)";
      }
      this.documentsLookup[doc.id] = doc.data();
    });

    oldKeys.forEach((key: string) => {
      if (!localLookup[key]) {
        const card: any = this.dashboard_documents_view.querySelector(`a[gamenumber="${key}"]`);
        if (card) card.remove();
      }
    });
    this.updateTimeSince(this.dashboard_documents_view, true);
    this.paintLabelSelect();
    this.refreshOnlinePresence();
    this.updateUserNamesImages();
  }
  /** return document shared status for a aichat doc
   * @param { any } doc aichat document
   * @return { number } 0 for owner, not shared, 1 for shared not owner, 2 for owner and shared
   */
  getDocumentSharedStatus(doc: any) {
    let sharedStatus = 0;
    let memberCount = 0;
    if (doc.members) memberCount = Object.keys(doc.members).length;

    if (memberCount > 1) {
      if (doc.createUser === this.uid) sharedStatus = 1;
      else sharedStatus = 2;
    }

    return sharedStatus;
  }
  /** paint html list card
   * @param { any } doc Firestore doc for game
   * @return { string } html for card
  */
  getDocumentCardElement(doc: any) {
    const data = doc.data();

    let ownerClass = "";
    if (data.createUser === this.uid) ownerClass += " dashboard_feed_owner_user";
    else ownerClass += " dashboard_feed_shared_user";

    let timeStr = this.isoToLocal(data.created).toISOString().substr(11, 5);
    let hour = Number(timeStr.substr(0, 2));
    const suffix = hour < 12 ? "am" : "pm";

    hour = hour % 12;
    if (hour === 0) hour = 12;
    timeStr = hour.toString() + timeStr.substr(2) + " " + suffix;
    const html = `<a href="/${data.gameType}/?game=${data.gameNumber}"
       class="list-group-item list-group-item-action document_list_item card shadow-sm my-1 rounded card_shadow_sm ${ownerClass}"
     data-gamenumber="${doc.id}" gamenumber="${doc.id}">
    <div class="d-flex justify-content-end">
        <div>
          <span class="material-symbols-outlined document_shared_status_icon">
            group
          </span>
        </div>
        <div class="document_name" data-docid="${doc.id}"></div>
        <div>
          <button class="details_game btn btn-secondary" data-gamenumber="${data.gameNumber}">
            <i class="material-icons">settings</i>
          </button>
        </div>  
        <div class="document_status time_since last_submit_time" data-timesince="${data.lastActivity}"
        data-showseconds="0"></div>
    </div></a>`;
    const ctl = document.createElement("div");
    ctl.innerHTML = html;
    const card = ctl.children[0];


    const details: any = card.querySelector("button.details_game");
    details.addEventListener("click", (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      this.loadAndShowOptionsDialog(details.dataset.gamenumber);
    });

    return card;
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
}
