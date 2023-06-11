import BaseApp from "./baseapp.js";
import LoginHelper from "./loginhelper.js";
import DocOptionsHelper from "./docoptionshelper.js";
import DocCreateHelper from "./doccreatehelper.js";
declare const firebase: any;
import {
  HelpHelper,
} from "./helphelper.js";
import {
  ChatDocument,
} from "./chatdocument.js";

/** Dashboard Document Management App - for listing, joining and creating games  */
export class DashboardApp extends BaseApp {
  dashboard_documents_view: any = document.querySelector(".dashboard_documents_view");
  new_game_type_wrappers: any = document.querySelectorAll(".new_game_type_wrapper");
  basic_options: any = document.querySelector(".basic_options");
  dashboard_create_game: any = document.querySelector(".dashboard_create_game");
  gameFeedSubscription: any;
  lastGamesFeedSnapshot: any;
  gameFeedInited = false;
  documentsLookup: any = {};
  lastTicketsSnapshot: any = null;
  lastAssistsSnapshot: any = null;
  assistsLookup: any = {};
  document_label_filter: any = document.querySelector(".document_label_filter");
  profile_menu_anchor: any = document.querySelector(".profile_menu_anchor");
  show_dashboard_help_button: any = document.querySelector(".show_dashboard_help_button");
  login = new LoginHelper(this);
  documentCreate = new DocCreateHelper(this);
  documentOptions = new DocOptionsHelper(this, "dashboard_options_view");
  helpHelper = new HelpHelper(this);
  help_show_modal: any = document.querySelector(".help_show_modal");
  sessionDeleting = false;

  /** */
  constructor() {
    super();

    this.initRTDBPresence();

    this.dashboard_create_game.addEventListener("click", () => this.documentCreate.show());
    this.document_label_filter.addEventListener("input", () => {
      firebase.firestore().doc(`Users/${this.uid}`).set({
        defaultDashboardLabel: this.document_label_filter.value,
      }, {
        merge: true,
      });
      this.updateGamesFeed(null);
    });

    this.show_dashboard_help_button.addEventListener("click", () => this.helpHelper.show("session"));
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
    this.lastTicketsSnapshot = {};

    this.lastTicketsSnapshot = await firebase.firestore().collection(`Games/${documentId}/tickets`).get();
    this.lastAssistsSnapshot = await firebase.firestore().collection(`Games/${documentId}/assists`).get();
    this.assistsLookup = {};
    this.lastAssistsSnapshot.forEach((assistDoc: any) => this.assistsLookup[assistDoc.id] = assistDoc.data());
    this.documentOptions.show(documentId, this.documentsLookup[documentId]);
  }
  /** BaseApp override to update additional use profile status */
  authUpdateStatusUI() {
    super.authUpdateStatusUI();
    this.initGameFeeds();
    this.initRTDBPresence();
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
        BaseApp.setHTML(nameCtl, name);
      }
    });
  }
  /** init listening events on games store to populate feeds in realtime */
  async initGameFeeds() {
    if (this.gameFeedInited || !this.profile) return;
    this.gameFeedInited = true;

    if (this.gameFeedSubscription) this.gameFeedSubscription();

    let firstLoad = true;
    this.gameFeedSubscription = firebase.firestore().collection(`Games`)
      .orderBy(`members.${this.uid}`, "desc")
      .limit(500)
      .onSnapshot((snapshot: any) => {
        if (firstLoad) {
          this.refreshDocumentsLookup(snapshot);
          this.paintLabelSelect(true);
          setTimeout(() => document.body.classList.add("list_loaded"), 100);
        }
        this.updateGamesFeed(snapshot);
        firstLoad = false;
      });
  }
  /**
   * @param { any } snapshot firestore query result snapshot for session documents
  */
  refreshDocumentsLookup(snapshot: any) {
    this.documentsLookup = {};
    snapshot.forEach((doc: any) => {
      this.documentsLookup[doc.id] = doc.data();
    });
  }
  /** paint games feed from firestore snapshot
   * @param { any } snapshot event driven feed data from firestore
  */
  updateGamesFeed(snapshot: any) {
    if (snapshot) this.lastGamesFeedSnapshot = snapshot;
    else if (this.lastGamesFeedSnapshot) snapshot = this.lastGamesFeedSnapshot;
    else return;

    if (snapshot.size === 0) document.body.classList.add("no_documents_in_feed");
    else document.body.classList.remove("no_documents_in_feed");

    document.body.classList.add("documents_feed_loaded");

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
        let title = BaseApp.escapeHTML(doc.data().title);
        if (!title) title = "";
        if (title === "") title = `<span class="unused_chatroom_title_placeholder">unused</span>`;
        BaseApp.setHTML(titleDom, title);

        const usageDom = card.querySelector(".document_usage");
        // let usage: string = doc.data().completionTokens;
        let usage: string = doc.data().totalTickets;
        if (!usage) usage = "0";
        BaseApp.setHTML(usageDom, usage);

        const sharedStatus = ChatDocument.getDocumentSharedStatus(doc.data(), this.uid);
        const sharedIcon = card.querySelector(".document_shared_status_icon_wrapper");
        sharedIcon.classList.remove("shared_status_not");
        sharedIcon.classList.remove("shared_status_withusers");
        sharedIcon.classList.remove("shared_status_withothers");

        if (sharedStatus === 0) sharedIcon.classList.add("shared_status_not");
        if (sharedStatus === 1) sharedIcon.classList.add("shared_status_withusers");
        if (sharedStatus === 2) sharedIcon.classList.add("shared_status_withothers");
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
  /** paint html list card
   * @param { any } doc Firestore doc for game
   * @return { string } html for card
  */
  getDocumentCardElement(doc: any) {
    const data = doc.data();

    let ownerClass = "";
    if (data.createUser === this.uid) ownerClass += " dashboard_feed_owner_user";
    else ownerClass += " dashboard_feed_shared_user";

    let timeStr = this.isoToLocal(data.created).toISOString().substring(11, 16);
    let hour = Number(timeStr.substring(0, 2));
    const suffix = hour < 12 ? "am" : "pm";

    hour = hour % 12;
    if (hour === 0) hour = 12;
    timeStr = hour.toString() + timeStr.substring(2) + " " + suffix;
    const html = `<a href="/session/?id=${data.gameNumber}"
       class="list-group-item list-group-item-action document_list_item card shadow-sm my-1 rounded card_shadow_sm ${ownerClass}"
     data-gamenumber="${doc.id}" gamenumber="${doc.id}">
    <div class="dashboard_item_flex_wrapper">
        <div>
          <button class="btn btn-secondary document_shared_status_icon_wrapper">
            <span class="material-symbols-outlined">link</span>
          </button>
        </div>
        <div class="document_name" data-docid="${doc.id}"></div>
        <div>
        <button class="details_game btn btn-secondary" data-gamenumber="${data.gameNumber}">
          <div class="document_usage" data-docid="${doc.id}"></div> 
          <div class="document_status time_since last_submit_time" data-timesince="${data.lastActivity}"
            data-showseconds="0"></div>
        </button>
      </div> 
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

    const linkCopy: any = card.querySelector(".document_shared_status_icon_wrapper");
    linkCopy.addEventListener("click", (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      navigator.clipboard.writeText(window.location.origin + "/session/?id=" + data.gameNumber);
      const buttonText = `<span class="material-icons">link</span>`;
      linkCopy.innerHTML = "✅ " + buttonText;
      setTimeout(() => linkCopy.innerHTML = buttonText, 1200);
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
        const str = BaseApp.escapeHTML(label.trim());
        if (str) labels[str] = true;
      });
    });
    const arr = Object.keys(labels).sort((a: string, b: string) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
    return arr;
  }
  /** paint label select
   * @param { boolean } firstLoad true if firstload to set profile value to control
  */
  paintLabelSelect(firstLoad = false) {
    const labels = this.getLabelsList();
    let html = "<option>All</option>";
    const startingValue = this.document_label_filter.value;

    labels.forEach((label: string) => html += `<option>${label}</option>`);

    if (BaseApp.setHTML(this.document_label_filter, html)) {
      if (firstLoad) this.document_label_filter.value = this.profile.defaultDashboardLabel;
      else this.document_label_filter.value = startingValue;
      if (this.document_label_filter.selectedIndex === -1) {
        this.document_label_filter.selectedIndex = 0;
        if (!firstLoad) this.updateGamesFeed(null);
      }
    }
  }
}
