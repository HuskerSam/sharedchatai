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
        <div class="session_ticket_count" data-docid="${doc.id}"></div> 
        <div class="document_status time_since last_submit_time" data-timesince="${data.lastActivity}"
          data-showseconds="0"></div>
        <div class="session_labels_column" data-docid="${doc.id}"></div>
        <div class="session_shared_column" data-docid="${doc.id}"></div>
        <button class="details_game btn btn-secondary hover_yellow" data-gamenumber="${data.gameNumber}">
          <svg class="Xy" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
            <path fill="currentColor" d="M13.85 22.25h-3.7c-.74 0-1.36-.54-1.45-1.27l-.27-1.89c-.27-.14-.53-.29-.79-.46l-1.8.72c-.7.26-1.47-.03-1.81-.65L2.2 15.53c-.35-.66-.2-1.44.36-1.88l1.53-1.19c-.01-.15-.02-.3-.02-.46 0-.15.01-.31.02-.46l-1.52-1.19c-.59-.45-.74-1.26-.37-1.88l1.85-3.19c.34-.62 1.11-.9 1.79-.63l1.81.73c.26-.17.52-.32.78-.46l.27-1.91c.09-.7.71-1.25 1.44-1.25h3.7c.74 0 1.36.54 1.45 1.27l.27 1.89c.27.14.53.29.79.46l1.8-.72c.71-.26 1.48.03 1.82.65l1.84 3.18c.36.66.2 1.44-.36 1.88l-1.52 1.19c.01.15.02.3.02.46s-.01.31-.02.46l1.52 1.19c.56.45.72 1.23.37 1.86l-1.86 3.22c-.34.62-1.11.9-1.8.63l-1.8-.72c-.26.17-.52.32-.78.46l-.27 1.91c-.1.68-.72 1.22-1.46 1.22zm-3.23-2h2.76l.37-2.55.53-.22c.44-.18.88-.44 1.34-.78l.45-.34 2.38.96 1.38-2.4-2.03-1.58.07-.56c.03-.26.06-.51.06-.78s-.03-.53-.06-.78l-.07-.56 2.03-1.58-1.39-2.4-2.39.96-.45-.35c-.42-.32-.87-.58-1.33-.77l-.52-.22-.37-2.55h-2.76l-.37 2.55-.53.21c-.44.19-.88.44-1.34.79l-.45.33-2.38-.95-1.39 2.39 2.03 1.58-.07.56a7 7 0 0 0-.06.79c0 .26.02.53.06.78l.07.56-2.03 1.58 1.38 2.4 2.39-.96.45.35c.43.33.86.58 1.33.77l.53.22.38 2.55z"></path>
            <circle fill="currentColor" cx="12" cy="12" r="3.5"></circle>
          </svg>
        </button>         
    </a>`;
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
