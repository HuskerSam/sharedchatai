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
  checkTemplateURL = false;
  lastTicketsSnapshot: any = null;
  lastAssistsSnapshot: any = null;
  assistsLookup: any = {};
  document_label_filter: any = document.querySelector(".document_label_filter");
  profile_menu_anchor: any = document.querySelector(".profile_menu_anchor");
  documentOptions = new DocOptionsHelper(this, "dashboard_options_view");
  help_show_modal: any = document.querySelector(".help_show_modal");
  menu_toggle_button: any = document.querySelector(".menu_toggle_button");
  show_create_modal: any = document.querySelector(".show_create_modal");
  news_tab_button: any = document.querySelector("#news_tab_button");
  content_tab_button: any = document.querySelector("#content_tab_button");
  dashboard_tab_button: any = document.querySelector("#dashboard_tab_button");
  news_tab_view: any = document.querySelector("#news_tab_view");
  footer_container_div: any = null;

  /** */
  constructor() {
    super(true, true);
    this.showLoginModal = false;

    this.initRTDBPresence();

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
    this.show_create_modal.addEventListener("click", (event: any) => {
      event.stopPropagation();
      event.preventDefault();
      this.documentCreate.show(this.getCustomSelectedLabel());
    });

    this.news_tab_button.addEventListener("click", () => this.saveProfileField("homePageTabIndex", 0));
    this.content_tab_button.addEventListener("click", () => this.saveProfileField("homePageTabIndex", 1));
    this.dashboard_tab_button.addEventListener("click", () => this.saveProfileField("homePageTabIndex", 2));

    this.footer_container_div = document.querySelector(".footer_container_div");
    this.news_tab_view.appendChild(this.footer_container_div);

    if (location.hash === "#moreinfo") this.content_tab_button.click();
  }
  /**
   * @return { string } label if custom, "" if not (all or unlabeled)
   */
  getCustomSelectedLabel(): string {
    if (this.document_label_filter.selectedIndex < 2) return "";

    return this.document_label_filter.value;
  }
  /** load tickets for options/export dialog
   * @param { any } documentId firestore record id
  */
  async prepDocumentOptionsHelper(documentId: string) {
    this.lastTicketsSnapshot = {};

    this.lastTicketsSnapshot = await firebase.firestore().collection(`Games/${documentId}/tickets`)
      .orderBy(`submitted`, "desc").get();
    this.lastAssistsSnapshot = await firebase.firestore().collection(`Games/${documentId}/assists`).get();
    this.assistsLookup = {};
    this.lastAssistsSnapshot.forEach((assistDoc: any) => this.assistsLookup[assistDoc.id] = assistDoc.data());

    this.documentOptions.chatDocumentId = documentId;
    this.documentOptions.documentData = this.documentsLookup[documentId];
  }
  /** show create dialog if a url "templatepath" is passed in
 * @param { string } templatePath url to json tickets import
*/
  async showCreateDialog(templatePath: string) {
    const templateData = await BaseApp.readJSONFile(templatePath);
    const pathParts = templatePath.split("/");
    const fileName = pathParts[pathParts.length - 1];
    const file = new File([JSON.stringify(templateData)], fileName, {
      type: "application/json",
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    this.documentCreate.create_modal_template_file.files = transfer.files;
    const templateRows = await this.documentCreate.updateParsedFileStatus();
    if (!templateRows || templateRows.length === 0) {
      this.documentCreate.create_modal_template_file.value = "";
      alert("no importable rows round");
    } else {
      this.documentCreate.show("", true);
    }
  }

  /** BaseApp override to update additional use profile status */
  authUpdateStatusUI() {
    super.authUpdateStatusUI();
    this.initGameFeeds();
    this.initRTDBPresence();
    if (!this.checkTemplateURL) {
      this.checkTemplateURL = true;
      const templatePath = this.urlParams.get("templatepath");
      const title = this.urlParams.get("title");
      if (title) this.documentCreate.create_modal_title_field.value = title;
      if (templatePath) this.showCreateDialog(templatePath);
    }
  }
  /** init listening events on games store to populate feeds in realtime */
  async initGameFeeds() {
    if (this.gameFeedInited || !this.profile) return;
    this.gameFeedInited = true;

    if (this.gameFeedSubscription) this.gameFeedSubscription();

    if (location.hash !== "#moreinfo") {
      if (this.profile.homePageTabIndex === 0) {
        this.news_tab_button.click();
      } else if (this.profile.homePageTabIndex === 1) {
        this.content_tab_button.click();
      } else if (this.profile.homePageTabIndex === 2) {
        this.dashboard_tab_button.click();
      }
    }
    document.body.classList.add("session_feed_inited");
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
  /**
   * @param { any } lbl menu label dom element
   * @param { any } card session list item dom
   * @param { any } e event
   * @param { string } id session
   */
  _handleMenuLabelClick(lbl: any, card: any, e: any, id: string) {
    lbl.classList.toggle("selected");
    this.saveLabels(card.labelMenuContainer, id);
    e.preventDefault();
    e.stopPropagation();
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
    let labelFilter = this.document_label_filter.value;
    snapshot.forEach((doc: any) => {
      let labels = doc.data().label;
      if (!labels) labels = "";
      labels = labels.trim();
      const labelsArray = labels.split(",");
      let includeSession = false;
      if (labelFilter === "All Sessions") includeSession = true;
      else if (labelFilter === "Not Labelled" && labels === "") includeSession = true;
      else if (labelsArray.indexOf(labelFilter) !== -1) includeSession = true;

      if (includeSession) {
        let card: any = this.dashboard_documents_view.querySelector(`a[gamenumber="${doc.id}"]`);
        if (!card) {
          card = this.getDocumentCardElement(doc);
        }
        this.dashboard_documents_view.appendChild(card);
        localLookup[doc.id] = doc.data();

        const titleDom = card.querySelector(".document_name");
        let title = BaseApp.escapeHTML(doc.data().title);
        if (!title) title = "";
        if (title === "") title = `<span class="unused_chatroom_title_placeholder">untitled</span>`;
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

        card.labelMenuContainer.innerHTML = this._getLabelsSubMenu(doc.data().label);
        const labelMenuItems: any = card.labelMenuContainer.querySelectorAll("li");
        labelMenuItems.forEach((lbl: any) =>
          lbl.addEventListener("click", (e: any) => this._handleMenuLabelClick(lbl, card, e, doc.id)));
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

    labelFilter = this.document_label_filter.value;
    if (labelFilter === "All Sessions" || labelFilter === "Not Labelled") document.body.classList.remove("show_clear_label_filter");
    else document.body.classList.add("show_clear_label_filter");
  }
  /**
   * @param { string } labels comma delimited label list
   * @return { string } html li
   */
  _getLabelsSubMenu(labels: string): string {
    let html = "";
    let labelString = labels;
    if (!labelString) labelString = "";
    const labelArray = labelString.split(",");
    labelArray.forEach((label: string) => {
      if (label !== "") {
        html += `<li class="selected" data-label="${encodeURIComponent(label)}">
          <label class="dropdown-item">
            <i class="material-icons">done</i>${BaseApp.escapeHTML(label)}
          </label>
        </li>`;
      }
    });

    let profileLabelString = this.profile.documentLabels;
    if (!profileLabelString) profileLabelString = "";
    const profileLabelArray = profileLabelString.split(",");
    profileLabelArray.forEach((label: string) => {
      if (label !== "" && labelArray.indexOf(label) === -1) {
        html += `<li class="" data-label="${encodeURIComponent(label)}">
          <label class="dropdown-item">
            <i class="material-icons">done</i>${label}
          </label>
        </li>`;
      }
    });

    return html;
  }
  /**
   * @param { any } menu dom
   * @param { string } id session id
   */
  async saveLabels(menu: any, id: string) {
    const items = menu.querySelectorAll("li");
    const labels: Array<string> = [];
    items.forEach((item: any) => {
      if (item.classList.contains("selected")) {
        const label = decodeURIComponent(item.dataset.label);
        if (label) labels.push(label);
      }
    });

    this.documentsLookup[id].label = labels.join(",");
    await this.saveDocumentOwnerOption(id, "label", this.documentsLookup[id]);
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
        <div class="btn-group dropstart hover_yellow">
          <button type="button" class="btn btn-secondary dropdown-toggle dashboard_menu_toggle" 
            data-bs-toggle="dropdown" aria-expanded="false">
            <i class="material-icons">more_vert</i>
          </button>
          <ul class="dropdown-menu dropdown-menu-dark">
            <li><button class="dropdown-item options">
              <i class="material-icons">settings</i>
              Session Options</button></li>
            <li><button class="dropdown-item clone">
            <i class="material-icons">import_export</i>
            Clone to new</button></li>
            <li><button class="dropdown-item share_email">
            <i class="material-icons">email</i>
            Email Invitation</button></li>
            <li><button class="dropdown-item delete">
              <i class="material-icons">delete_forever</i>
            Delete Session</button></li>
            <li><button class="dropdown-item leave">
            <i class="material-icons">logout</i>
            Leave Session</button></li>
            <li><hr class="dropdown-divider"></li>
            <div class="label_menu dashboard_menus_list"></div>
          </ul>
        </div>      
    </a>`;
    const ctl = document.createElement("div");
    ctl.innerHTML = html;
    const card: any = ctl.children[0];

    const details: any = card.querySelector("button.options");
    details.addEventListener("click", async (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      await this.prepDocumentOptionsHelper(doc.id);
      this.documentOptions.show(doc.id, this.documentsLookup[doc.id]);
    });

    const clone: any = card.querySelector("button.clone");
    clone.addEventListener("click", async (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      await this.prepDocumentOptionsHelper(doc.id);
      this.documentOptions.cloneDocument();
    });

    const deleteBtn: any = card.querySelector("button.delete");
    deleteBtn.addEventListener("click", async (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      await this.prepDocumentOptionsHelper(doc.id);
      this.documentOptions.deleteGame();
    });

    const leave: any = card.querySelector("button.leave");
    leave.addEventListener("click", async (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      await this.prepDocumentOptionsHelper(doc.id);
      this.documentOptions.logoutGame();
    });

    const sendEmail: any = card.querySelector("button.share_email");
    sendEmail.addEventListener("click", async (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      await this.prepDocumentOptionsHelper(doc.id);
      this.documentOptions.paintDocumentData();
      this.documentOptions.modal_send_email_button.click();
    });

    const linkCopy: any = card.querySelector(".document_shared_status_icon_wrapper");
    linkCopy.addEventListener("click", (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      BaseApp.copyGameLink(data.gameNumber, linkCopy);
    });

    card.labelMenuContainer = card.querySelector(".dashboard_menus_list");
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

    let labelString = this.profile.documentLabels;
    if (!labelString) labelString = "";
    const profileLabels = labelString.split(",");
    profileLabels.forEach((label: string) => {
      const str = BaseApp.escapeHTML(label.trim());
      if (str) labels[str] = true;
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
    let html = "<option>All Sessions</option><option>Not Labelled</option>";
    const startingValue = this.document_label_filter.value;

    labels.forEach((label: string) => html += `<option>${label}</option>`);

    if (BaseApp.setHTML(this.document_label_filter, html)) {
      if (firstLoad) this.document_label_filter.value = this.profile.defaultDashboardLabel;
      else this.document_label_filter.value = startingValue;
      if (this.document_label_filter.selectedIndex === -1) {
        this.document_label_filter.selectedIndex = 0;
        this.document_label_filter.dispatchEvent(new Event("input"));
      }
    }
  }
}
