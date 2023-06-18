import BaseApp from "./baseapp.js";
import DocOptionsHelper from "./docoptionshelper.js";
import ChatDocument from "./chatdocument.js";

declare const firebase: any;

/** Dashboard Document Management App - for listing, joining and creating games  */
export class DashboardApp extends BaseApp {
  dashboard_documents_view: any = document.querySelector(".dashboard_documents_view");
  new_game_type_wrappers: any = document.querySelectorAll(".new_game_type_wrapper");
  basic_options: any = document.querySelector(".basic_options");
  dashboard_create_game: any = document.querySelector(".dashboard_create_game");
  dashboard_create_game_mobile: any = document.querySelector(".dashboard_create_game_mobile");
  gameFeedSubscription: any;
  lastGamesFeedSnapshot: any;
  gameFeedInited = false;
  lastTicketsSnapshot: any = null;
  lastAssistsSnapshot: any = null;
  assistsLookup: any = {};
  document_label_filter: any = document.querySelector(".document_label_filter");
  profile_menu_anchor: any = document.querySelector(".profile_menu_anchor");
  documentOptions = new DocOptionsHelper(this, "dashboard_options_view");
  help_show_modal: any = document.querySelector(".help_show_modal");

  /** */
  constructor() {
    super();

    this.initRTDBPresence();

    this.dashboard_create_game.addEventListener("click", (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      this.documentCreate.show();
    });
    this.dashboard_create_game_mobile.addEventListener("click", (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      this.documentCreate.show();
    });

    this.document_label_filter.addEventListener("input", () => {
      firebase.firestore().doc(`Users/${this.uid}`).set({
        defaultDashboardLabel: this.document_label_filter.value,
      }, {
        merge: true,
      });
      this.updateSessionFeed(null);
    });

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
    this.lastTicketsSnapshot = {};

    this.lastTicketsSnapshot = await firebase.firestore().collection(`Games/${documentId}/tickets`).get();
    this.lastAssistsSnapshot = await firebase.firestore().collection(`Games/${documentId}/assists`).get();
    this.assistsLookup = {};
    this.lastAssistsSnapshot.forEach((assistDoc: any) => this.assistsLookup[assistDoc.id] = assistDoc.data());
    this.documentOptions.show(documentId, this.documentsLookup[documentId]);

    const btn: any = document.getElementById("show_document_options_popup");
    btn.click();
  }
  /** BaseApp override to update additional use profile status */
  authUpdateStatusUI() {
    super.authUpdateStatusUI();
    this.initGameFeeds();
    this.initRTDBPresence();
  }
  /** init listening events on games store to populate feeds in realtime */
  async initGameFeeds() {
    if (this.gameFeedInited || !this.profile) return;
    this.gameFeedInited = true;

    if (this.gameFeedSubscription) this.gameFeedSubscription();

    let firstLoad = true;
    this.gameFeedSubscription = firebase.firestore().collection(`Games`)
      .orderBy(`members.${this.uid}`, "desc")
      .limit(100)
      .onSnapshot((snapshot: any) => {
        if (firstLoad) {
          this.refreshDocumentsLookup(snapshot);
          this.paintLabelSelect(true);
          setTimeout(() => document.body.classList.add("list_loaded"), 100);
        }
        this.updateSessionFeed(snapshot);
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
  updateSessionFeed(snapshot: any) {
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
      if (labelFilter === "All Sessions" || labelsArray.indexOf(labelFilter) !== -1) {
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

        const labelsDom = card.querySelector(".session_labels_column");
        let label = BaseApp.escapeHTML(doc.data().label);
        if (!label) label = "";
        let html = "";
        const labels = label.split(",");
        labels.forEach((l: string) => {
          if (l) html += `<span class="dashboard_session_chip">${l}</span>`;
        });
        labelsDom.innerHTML = html;

        const countDom = card.querySelector(".session_ticket_count");
        let count: string = doc.data().totalTickets;
        if (!count) count = "0";
        BaseApp.setHTML(countDom, count);

        const sharedStatus = ChatDocument.getDocumentSharedStatus(doc.data(), this.uid);
        const sharedIcon = card.querySelector(".document_shared_status_icon_wrapper");
        const sharedStatusDom = card.querySelector(".session_shared_column");

        sharedIcon.classList.remove("shared_status_not");
        sharedIcon.classList.remove("shared_status_withusers");
        sharedIcon.classList.remove("shared_status_withothers");
        sharedStatusDom.classList.remove("shared_status_not");
        sharedStatusDom.classList.remove("shared_status_withusers");
        sharedStatusDom.classList.remove("shared_status_withothers");

        const sharedBlockData = ChatDocument.getSharedUser(doc.id, doc.data(), this.uid);
        if (sharedBlockData.uid) this.addUserPresenceWatch(sharedBlockData.uid);
        sharedStatusDom.innerHTML = sharedBlockData.html;
        if (sharedStatus === 0) {
          sharedIcon.classList.add("shared_status_not");
          sharedStatusDom.classList.add("shared_status_not");
        }
        if (sharedStatus === 1) {
          sharedIcon.classList.add("shared_status_withusers");
          sharedStatusDom.classList.add("shared_status_withusers");
        }
        if (sharedStatus === 2) {
          sharedIcon.classList.add("shared_status_withothers");
          sharedStatusDom.classList.add("shared_status_withothers");
        }
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
    this.updateUserNamesImages();
    this.updateUserPresence();
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

    let timeStr = BaseApp.isoToLocal(data.created).toISOString().substring(11, 16);
    let hour = Number(timeStr.substring(0, 2));
    const suffix = hour < 12 ? "am" : "pm";

    hour = hour % 12;
    if (hour === 0) hour = 12;
    timeStr = hour.toString() + timeStr.substring(2) + " " + suffix;
    const html = `<a href="/session/${data.gameNumber}"
       class="list-group-item list-group-item-action document_list_item card shadow-sm my-1 rounded card_shadow_sm ${ownerClass}"
     data-gamenumber="${doc.id}" gamenumber="${doc.id}">
        <button class="btn btn-secondary document_shared_status_icon_wrapper hover_yellow">
          <span class="material-icons">link</span>
        </button>
        <div class="document_name" data-docid="${doc.id}"></div>
        <div class="count_status_wrapper">
          <div class="session_ticket_count" data-docid="${doc.id}"></div> 
          <div class="document_status time_since last_submit_time" data-timesince="${data.lastActivity}"
            data-showseconds="0"></div>
        </div>
        <div class="session_labels_column" data-docid="${doc.id}"></div>
        <div class="session_shared_column" data-docid="${doc.id}"></div>
        <button class="session_details_button btn btn-secondary hover_yellow" data-gamenumber="${data.gameNumber}">
          <svg xmlns="http://www.w3.org/2000/svg" height="30" viewBox="0 -960 960 960" width="30">
          <path fill="currentColor" d="m388-80-20-126q-19-7-40-19t-37-25l-118 54-93-164 108-79q-2-9-2.5-20.5T185-480q0-9
          .5-20.5T188-521L80-600l93-164 118 54q16-13 37-25t40-18l20-127h184l20 126q19 7
            40.5 18.5T669-710l118-54 93 164-108 77q2 10 2.5 21.5t.5 21.5q0 10-.5 21t-2.5 21l108 78-93 164-118-54q-16 13-36.5
            25.5T592-206L572-80H388Zm92-270q54 0 92-38t38-92q0-54-38-92t-92-38q-54 0-92 38t-38 92q0
              54 38 92t92 38Zm0-60q-29 0-49.5-20.5T410-480q0-29 20.5-49.5T480-550q29 0 49.5 20.5T550-480q0
              29-20.5 49.5T480-410Zm0-70Zm-44 340h88l14-112q33-8 62.5-25t53.5-41l106 46 40-72-94-69q4-17
                6.5-33.5T715-480q0-17-2-33.5t-7-33.5l94-69-40-72-106 46q-23-26-52-43.5T538-708l-14-112h-88l-14
                112q-34 7-63.5 24T306-642l-106-46-40 72 94 69q-4 17-6.5 33.5T245-480q0 17 2.5 33.5T254-413l-94
                  69 40 72 106-46q24 24 53.5 41t62.5 25l14 112Z"/></svg>
        </button>         
    </a>`;
    const ctl = document.createElement("div");
    ctl.innerHTML = html;
    const card = ctl.children[0];

    const details: any = card.querySelector("button.session_details_button");
    details.addEventListener("click", (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      this.loadAndShowOptionsDialog(details.dataset.gamenumber);
    });

    const linkCopy: any = card.querySelector(".document_shared_status_icon_wrapper");
    linkCopy.addEventListener("click", (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      BaseApp.copyGameLink(data.gameNumber, linkCopy);
    });

    return card;
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
    let html = "<option>All Sessions</option>";
    const startingValue = this.document_label_filter.value;

    labels.forEach((label: string) => html += `<option>${label}</option>`);

    if (BaseApp.setHTML(this.document_label_filter, html)) {
      if (firstLoad) this.document_label_filter.value = this.profile.defaultDashboardLabel;
      else this.document_label_filter.value = startingValue;
      if (this.document_label_filter.selectedIndex === -1) {
        this.document_label_filter.selectedIndex = 0;
        if (!firstLoad) this.updateSessionFeed(null);
      }
    }
  }
}
