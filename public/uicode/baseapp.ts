import ProfileHelper from "./profilehelper.js";
import LoginHelper from "./loginhelper.js";
import DocCreateHelper from "./doccreatehelper.js";
import BuyCreditsHelper from "./buycreditshelper.js";

declare const firebase: any;
declare const window: any;

/** Base class for all pages - handles authorization and low level routing for api calls, etc */
export default class BaseApp {
  timeSinceRedraw = 300;
  feedLimit = 10;
  deferredPWAInstallPrompt: any = null;
  projectId = firebase.app().options.projectId;
  basePath = `https://us-central1-${this.projectId}.cloudfunctions.net/`;
  urlParams = new URLSearchParams(window.location.search);
  signin_show_modal: any = document.querySelector(".signin_show_modal");
  muted = false;
  uid: any = null;
  profile: any = null;
  fireUser: any = null;
  fireToken: any = null;
  profileSubscription: any = null;
  profileInited = false;
  profileDefaulted = false;
  mute_button: any = null;
  verboseLog = false;
  rtdbPresenceInited = false;
  userPresenceStatus: any = {};
  userDocumentStatus: any = {};
  documentsLookup: any = {};
  userPresenceStatusRefs: any = {};
  userDocumentStatusRefs: any = {};
  memberUpdateTimeouts: any = {};
  userStatusDatabaseRef: any;
  documentStatusDatabaseRef: any;
  sessionDocumentData: any = null;
  showLoginModal = true;
  profileHelper = new ProfileHelper(this);
  login = new LoginHelper(this);
  documentCreate = new DocCreateHelper(this);
  buyCredits = new BuyCreditsHelper(this);
  sessionDeleting = false;
  isSessionApp = false;
  documentId = "";
  memberRefreshBufferTime = 500;
  menu_profile_user_image_span: any = document.querySelector(".menu_profile_user_image_span");
  menu_profile_user_name_span: any = document.querySelector(".menu_profile_user_name_span");
  isOfflineForDatabase = {
    state: "offline",
    last_changed: firebase.database.ServerValue.TIMESTAMP,
  };
  isOnlineForDatabase = {
    state: "online",
    last_changed: firebase.database.ServerValue.TIMESTAMP,
  };
  html_body_container: any = document.querySelector(".main_container");
  content_list_container: any = document.querySelector(".recent_content_ul_list");
  flyer_list_container: any = document.querySelector(".recent_content_flyers_ul_list");
  themeIndex = 0;
  buy_credits_cta_btn: any = document.querySelector(".buy_credits_cta_btn");

  /**
 * @param { boolean } contentPage content list trimmed on other pages and footer link change
 * @param { boolean } addFooter add footer (true by default)
 */
  constructor(contentPage = false, addFooter = true) {
    window.addEventListener("beforeinstallprompt", (e: any) => {
      e.preventDefault();
      this.deferredPWAInstallPrompt = e;
    });

    if (window.location.hostname === "localhost") this.basePath = `http://localhost:5001/${this.projectId}/us-central1/`;

    firebase.auth().onAuthStateChanged((u: any) => this.authHandleEvent(u));
    this.signInWithURL();

    if (addFooter && this.html_body_container) {
      const element = document.createElement("div");
      element.classList.add("footer_container_div");
      element.innerHTML = this.getFooterTemplate();
      this.html_body_container.appendChild(element);
    }
    if (this.content_list_container) {
      this.content_list_container.innerHTML = this.getContentListTemplate(contentPage);
    }
    if (this.flyer_list_container) {
      this.flyer_list_container.innerHTML = this.getFlyerListTemplate(contentPage);
    }

    if (this.signin_show_modal) {
      this.signin_show_modal.addEventListener("click", (e: any) => {
        e.stopPropagation();
        e.preventDefault();
        this.login.show();
      });
    }

    this.themeIndex = BaseApp.initDayMode();
    document.body.classList.add("body_loaded");
    this.load();


    if (this.buy_credits_cta_btn) {
      this.buy_credits_cta_btn.addEventListener("click", (e: any) => {
        e.preventDefault();
        this.buyCredits.show();
      });
    }
  }
  /** asynchronous loads - data setup  */
  async load() {
    this.authUpdateStatusUI();
  }
  /** reads a json file async and sets window.varName to it's value
   * @param { string } path url to json data
   * @return { any } file contents or {}
   */
  static async readJSONFile(path: string): Promise<any> {
    try {
      const response = await fetch(path);
      return await response.json();
    } catch (e) {
      console.log("ERROR with download of " + path, e);
      return {};
    }
  }
  /** Paints UI display/status for user profile based changes */
  authUpdateStatusUI() {
    if (this.fireToken) {
      if (document.body.dataset.creator === this.uid) document.body.classList.add("user_editable_record");
    }

    if (this.profile) {
      this.updateUserStatus();
      this.updateUserNamesImages();

      if (this.profile.textOptionsLarge) document.body.classList.add("profile_text_option_large");
      else document.body.classList.remove("profile_text_option_large");
      if (this.profile.textOptionsMonospace) document.body.classList.add("profile_text_option_monospace");
      else document.body.classList.remove("profile_text_option_monospace");
      if (this.profile.lessTokenDetails) document.body.classList.add("profile_text_less_token_details");
      else document.body.classList.remove("profile_text_less_token_details");
    }
  }
  /** firebase authorization event handler
   * @param { any } user logged in user - or null if not logged in
   */
  async authHandleEvent(user: any) {
    // ignore unwanted events
    if (user && this.uid === user.uid) {
      return;
    }
    if (user) {
      this.fireUser = user;
      this.uid = this.fireUser.uid;
      this.fireToken = await user.getIdToken();
      document.body.classList.add("app_signed_in");
      document.body.classList.remove("app_signed_out");
      if (this.fireUser.isAnonymous) document.body.classList.add("signed_in_anonymous");

      await this._authInitProfile();
    } else {
      this.fireToken = null;
      this.fireUser = null;
      this.uid = null;
      document.body.classList.remove("app_signed_in");
      document.body.classList.add("app_signed_out");
      this.authUpdateStatusUI();

      const templatePath = this.urlParams.get("templatepath");
      if (this.showLoginModal || templatePath) {
        this.login.show();
      }
    }

    document.body.classList.add("auth_inited");
    return;
  }
  /** setup watch for user profile changes */
  async _authInitProfile() {
    if (this.profileInited) return;

    this.profileSubscription = firebase.firestore().doc(`Users/${this.uid}`)
      .onSnapshot(async (snapshot: any) => {
        this.profile = snapshot.data();
        if (!this.profile) {
          if (this.fireUser.email) {
            const result = await firebase.auth().fetchSignInMethodsForEmail(this.fireUser.email);
            // user was deleted dont create new profile - this is the case where the user deletes the account in browser
            if (result.length < 1) return;
          }

          await this._authCreateDefaultProfile();
        }
        this.profileInited = true;
        this.authUpdateStatusUI();
      });
  }
  /** create default user profile record and overwrite to database without merge (reset)
   * @param { string } displayName passed in name (ie google)
   * @param { string } displayImage passed in image (ie google)
  */
  async _authCreateDefaultProfile(displayName = "", displayImage = "") {
    if (this.profileDefaulted) return;
    this.profile = {
      displayName,
      displayImage,
      documentLabels: "Personal,Business,Revisit",
      enableKatex: true,
      homePageTabIndex: 2,
    };

    this.profileDefaulted = true;
    await firebase.firestore().doc(`Users/${this.uid}`).set(this.profile, {
      merge: true,
    });
  }
  /** update user auth status, username/email etc */
  updateUserStatus() {
    if (this.menu_profile_user_image_span) this.menu_profile_user_image_span.setAttribute("uid", this.uid);
    if (this.menu_profile_user_name_span) this.menu_profile_user_name_span.setAttribute("uid", this.uid);
  }
  /** google sign in handler
   * @param { any } e dom event - preventDefault is called if passed
   */
  async authGoogleSignIn(e: any) {
    e.preventDefault();
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
      "prompt": "select_account",
    });
    const loginResult = await firebase.auth().signInWithPopup(provider);
    if (loginResult.additionalUserInfo && loginResult.additionalUserInfo.profile && loginResult.user.uid) {
      this.uid = loginResult.user.uid;
      const profile = await firebase.firestore().doc(`Users/${this.uid}`).get();
      let data = profile.data();
      if (!data) data = {};
      let displayName = data.displayName;
      let displayImage = data.displayImage;
      if (!displayName) displayName = "";
      if (!displayImage) displayImage = "";
      if (!profile.data() || !displayName || !displayImage) {
        const picture = !displayImage ? loginResult.additionalUserInfo.profile.picture : displayImage;
        const name = !displayName ? loginResult.additionalUserInfo.profile.name : displayName;
        await this._authCreateDefaultProfile(name, picture);
      }
    }
    setTimeout(() => {
      location.reload();
    }, 20);
  }
  /** anonymous sign in handler
   * @param { any } e dom event - preventDefault is called if passed
   */
  async signInAnon(e: any) {
    e.preventDefault();
    await firebase.auth().signInAnonymously();
    /*
    setTimeout(() => {
      location.reload();
    }, 1);
    */
    return true;
  }

  /** for use on page load - tests if a signIn token was included in the URL */
  signInWithURL() {
    if (!firebase.auth().isSignInWithEmailLink) return;
    if (firebase.auth().isSignInWithEmailLink(location.href) !== true) return;

    let email = window.localStorage.getItem("emailForSignIn");
    if (!email) email = window.prompt("Please provide your email for confirmation");

    firebase.auth().signInWithEmailLink(email, location.href)
      .then(() => {
        window.localStorage.removeItem("emailForSignIn");
        location.reload();
      })
      .catch((e: any) => console.log(e));
  }
  /** returns text value for time since Now, i.e. 3 mins ago
   * @param { Date } date value to format
   * @param { boolean } showSeconds show counting seconds
   * @return { string } formatted string value for time since
   */
  timeSince(date: Date, showSeconds = false): string {
    let seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    seconds = Math.max(seconds, 0);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ` yr`;

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ` M`;

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ` d`;

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ` hr`;

    if (showSeconds) return Math.floor(seconds) + " s";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ` m`;

    return "now";
  }
  /** get gmail like past date
   * @param { Date } dt date to format
   * @param { boolean } amFormat use am and pm for time if true
   * @return { string } formatted date
  */
  showGmailStyleDate(dt: Date, amFormat = false): string {
    if (Date.now() - dt.getTime() < 24 * 60 * 60 * 1000) {
      if (amFormat) return BaseApp.formatAMPM(dt);

      // const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      let result = BaseApp.formatAMPM(dt);
      const pieces = result.split(":");
      result = pieces[0] + pieces[1].substring(2, 10);
      /*
      const localISOTime = (new Date(dt.getTime() - tzoffset)).toISOString().slice(0, -1);
      let response = localISOTime.substring(11, 16);
      if (response.substring(0, 1) === "0") response = response.replace("0", " ");
      */
      return result;
    }

    return dt.toLocaleDateString("en-us", {
      month: "short",
      day: "numeric",
    });
  }
  /** return am pm format for date
   * @param { Date } date date to return format string
   * @return { string }
  */
  static formatAMPM(date: Date): string {
    let hours: any = date.getHours();
    let minutes: any = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? "0" + minutes : minutes;
    return hours + ":" + minutes + " " + ampm;
  }
  /** convert isodate to local date as Date Object
   * @param { string } startTimeISOString iso date GMT referenced
   * @return { Date } JS Date object with date in local time zone reference
   */
  static isoToLocal(startTimeISOString: string): Date {
    const startTime = new Date(startTimeISOString);
    const offset = startTime.getTimezoneOffset();
    return new Date(startTime.getTime() - (offset * 60000));
  }
  /** return mm/dd/yy for Date or String passed in
   * @param { any } d Date(d) is parsed
   * @return { string } mm/dd/yy string value
   */
  static shortShowDate(d: any): string {
    d = new Date(d);
    if (isNaN(d)) return "";
    const str = d.toISOString().substr(0, 10);
    const mo = str.substr(5, 2);
    const ye = str.substr(2, 2);
    const da = str.substr(8, 2);
    return `${mo}/${da}/${ye}`;
  }
  /** init rtdb for online persistence status
   * @param { boolean } reset true to reset/refresh connection
  */
  initRTDBPresence(reset = false) {
    if (!this.uid) return;
    if (this.rtdbPresenceInited && !reset) return;

    this.rtdbPresenceInited = true;
    this.userStatusDatabaseRef = firebase.database().ref("/OnlinePresence/" + this.uid);

    firebase.database().ref(".info/connected").off();
    firebase.database().ref(".info/connected").on("value", (snapshot: any) => {
      if (snapshot.val() == false) return;

      this.userStatusDatabaseRef.onDisconnect().set(this.isOfflineForDatabase).then(() => {
        this.userStatusDatabaseRef.set(this.isOnlineForDatabase);
      });

      if (this.isSessionApp && this.documentId) {
        this.documentStatusDatabaseRef = firebase.database().ref("/DocumentPresence/" + this.uid + "/" + this.documentId);
        this.documentStatusDatabaseRef.onDisconnect().set(null).then(() => {
          this.documentStatusDatabaseRef.set(true);
        });
      }
    });
  }
  /** disconnect online presence watch query from RTDB */
  removeUserPresenceWatch() {
    firebase.database().ref(".info/connected").off();
    firebase.database().ref("/OnlinePresence/" + this.uid).set(this.isOfflineForDatabase);
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
    if (!this.userDocumentStatusRefs[uid]) {
      this.userDocumentStatusRefs[uid] = firebase.database().ref("DocumentPresence/" + uid);
      this.userDocumentStatusRefs[uid].on("value", (snapshot: any) => {
        this.userDocumentStatus[uid] = snapshot.val();
        this.updateUserPresence();
      });
    }
  }
  /**
   * @param { string } uid
   * @param { any } div
   * @param { string } relatedDocId
   */
  __updateUserPresence(uid: string, div: any, relatedDocId: string) {
    let userDocStatus = this.userDocumentStatus[uid];
    if (!userDocStatus) userDocStatus = {};

    if (this.userPresenceStatus[uid]) {
      div.classList.add("online");
      if (userDocStatus[relatedDocId]) div.classList.add("activesession");
      else div.classList.remove("activesession");
    } else {
      div.classList.remove("online");
      div.classList.remove("activesession");
    }
  }
  /** paint users online status
   * @param { boolean } noTimeout true for no timeout
  */
  updateUserPresence(noTimeout = false) {
    if (!this.userPresenceStatus[this.uid]) {
      this.userPresenceStatus[this.uid] = true;
      this.userStatusDatabaseRef.set(this.isOnlineForDatabase);
    }
    document.querySelectorAll(".member_online_status")
      .forEach((div: any) => {
        const uid = div.dataset.uid;
        const relatedDocId = div.getAttribute("sessionid");

        if (!noTimeout) {
          clearTimeout(this.memberUpdateTimeouts[relatedDocId + ":" + uid]);
          this.memberUpdateTimeouts[relatedDocId + ":" + uid] =
            setTimeout(() => this.__updateUserPresence(uid, div, relatedDocId), this.memberRefreshBufferTime);
        } else {
          document.body.classList.add("no_transition");
          this.__updateUserPresence(uid, div, relatedDocId);
          document.body.classList.remove("no_transition");
        }
      });
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
  /** update all time_since spans in this container
   * @param { any } container dom element to query for spans
   * @param { boolean } useGmailStyle true to return gmail style past date
   */
  updateTimeSince(container: any, useGmailStyle = false) {
    const elements = container.querySelectorAll(".time_since");
    elements.forEach((ctl: any) => {
      const isoTime = ctl.dataset.timesince;
      const showSeconds = ctl.dataset.showseconds;

      let dateDisplay: string;
      if (useGmailStyle) {
        dateDisplay = this.showGmailStyleDate(new Date(isoTime));
      } else {
        dateDisplay = this.timeSince(new Date(isoTime), (showSeconds === "1")).replaceAll(" ago", "");
      }
      BaseApp.setHTML(ctl, dateDisplay);
    });
  }
  /** escape html
   * @param { any } str  raw string to escape
   * @return { string } escaped string
  */
  static escapeHTML(str: any): string {
    if (str === undefined || str === null) str = "";
    str = str.toString();
    return str.replace(/[&<>'"]/g,
      (match: any) => {
        switch (match) {
          case "&": return "&amp;";
          case "<": return "&lt;";
          case ">": return "&gt;";
          case "'": return "&#39;";
          case "\"": return "&quot;";
        }

        return match;
      });
  }
  /** set html only if different
   * @param { any } ctl dom element to set html
   * @param { string } html innerHtml
   * @return { boolean } true if set
   */
  static setHTML(ctl: any, html: string): boolean {
    if (ctl.innerHTML !== html) {
      ctl.innerHTML = html;
      return true;
    }
    return false;
  }
  /** copy game url link to clipboard
   * @param { string } sessionId firestore doc id
   * @param { any } btn copy button dom
   * @param { string } buttonText optional button text (defaults link icon)
 */
  static copyGameLink(sessionId: string, btn: any, buttonText = "<span class=\"material-icons\">link</span>") {
    navigator.clipboard.writeText(window.location.origin + "/session/" + sessionId);
    btn.innerHTML = `<i class="material-icons copy_green">done</i>` + buttonText;
    setTimeout(() => btn.innerHTML = buttonText, 1200);
  }
  /** when user toggles a menu section save it to profile
 * @param { string } fieldKey field in session doc
 * @param { any } value string or boolean usually
*/
  saveProfileField(fieldKey: string, value: any) {
    if (!this.profile) return;
    firebase.firestore().doc(`Users/${this.uid}`).set({
      [fieldKey]: value,
    }, {
      merge: true,
    });
  }
  /**
   *
   * @param { number } x incoming number
   * @param { number } decimalDigits number of decimals (toFixed()) -1 for ignore
   * @return { string } number with commas
   */
  static numberWithCommas(x: number, decimalDigits = 0): string {
    if (isNaN(Number(x))) x = 0;
    const xString = (decimalDigits !== -1) ? x.toFixed(decimalDigits) : x.toString();
    return xString.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  /** save a single field to document
   * @param {string } id doc id
  * @param { string } field document field name
  * @param { any } value written to field
  */
  async saveDocumentOption(id: string, field: string, value: any) {
    if (this.sessionDeleting) return;

    const body: any = {
      gameNumber: id,
      [field]: value,
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
  /** send owner setting for document to api
   * @param { string } id session id
   * @param { string } fieldKey title for title, usage for creditUsageLimit, note for note
   * @param { any } data session document data (with new field value)
  */
  async saveDocumentOwnerOption(id: string, fieldKey: string, data: any) {
    if (this.sessionDeleting) return;

    const updatePacket: any = {
      gameNumber: id,
    };

    if (fieldKey === "title") {
      updatePacket.title = data.title;
    }
    if (fieldKey === "systemMessage") {
      updatePacket.systemMessage = data.systemMessage;
    }
    if (fieldKey === "usage") {
      updatePacket.creditUsageLimit = data.creditUsageLimit;
    }
    if (fieldKey === "note") {
      updatePacket.note = data.note;
    }
    if (fieldKey === "label") {
      updatePacket.label = data.label;
    }
    if (fieldKey === "archived") {
      updatePacket.archived = data.archived;
    }
    if (fieldKey === "model_lock") {
      updatePacket.model_lock = data.model_lock;
    }

    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.basePath + "lobbyApi/games/owner/options", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(updatePacket),
    });
    const json = await fResult.json();
    if (!json.success) {
      alert("Unable to save options " + json.errorMessage);
    }
  }
  /** display name and image
   * @param { string } uid user id
   * @param { string } docid session id
   * @return { any } name, imagePath in a map
  */
  userMetaFromDocument(uid: string, docid = ""): any {
    let doc: any;
    if (docid) doc = this.documentsLookup[docid];
    else if (this.sessionDocumentData) doc = this.sessionDocumentData;

    let imagePath = "";
    if (doc) imagePath = doc.memberImages[uid];
    if (this.uid === uid) imagePath = this.profile.displayImage;
    if (!imagePath) imagePath = "/images/solid_face_circle.svg";

    let name = "";
    if (doc) name = doc.memberNames[uid];
    if (this.uid === uid) name = this.profile.displayName;
    if (!name) name = "New User";

    return {
      imagePath,
      name,
    };
  }
  /** query dom for all member images names and update */
  updateUserNamesImages() {
    const imgCtls = document.querySelectorAll(".member_profile_image");
    const nameCtls = document.querySelectorAll(".member_profile_name");

    imgCtls.forEach((imgCtl: any) => {
      const uid: any = imgCtl.getAttribute("uid");
      const docid: any = imgCtl.getAttribute("docid");
      const userMeta = this.userMetaFromDocument(uid, docid);
      if ("url(" + userMeta.imagePath + ")" !== imgCtl.style.backgroundImage) {
        imgCtl.style.backgroundImage = "url(" + userMeta.imagePath + ")";
      }
    });

    nameCtls.forEach((nameCtl: any) => {
      const uid: any = nameCtl.getAttribute("uid");
      const docid: any = nameCtl.getAttribute("docid");
      BaseApp.setHTML(nameCtl, this.userMetaFromDocument(uid, docid).name);
    });
  }
  /**
   * @param {string } email email to test
   * @return { boolean } true if valid email
   */
  static validateEmail(email: string): boolean {
    const result = String(email)
      .toLowerCase()
      .match(
        /* eslint-disable-next-line max-len */
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
    if (result) return true;
    return false;
  }
  /**
 * @param {string } emailList email to test
 * @return { boolean } true if valid email
 */
  static validateEmailList(emailList: string): boolean {
    emailList = emailList.replaceAll("\n", "");
    emailList = emailList.replaceAll("\r", "");
    const emails = emailList.trim().split(";");
    let invalidEmail = false;
    emails.forEach((email: string) => {
      if (!BaseApp.validateEmail(email)) invalidEmail = true;
    });
    if (invalidEmail) return false;
    return true;
  }
  /**
   *
   * @param { string } html string to strip tags from
   * @return { string } text without tags
   */
  static stripHtml(html: string) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }
  /** get footer template
 * @return { string } html
*/
  getFooterTemplate(): string {
    return `<div class="container">
      <footer class="app_panel main_block m-0" style="border-radius:0;border-right:none;border-left:none;">
                <div class="row">
                    <div class="mb-3 mb-md-0 text-center text-md-start" style="flex:1">
                        <h5><span>Una<span class="home_navbar_name_color"">cog</span></span></h5>
                        <p>
                            We are a dedicated team based in Lincoln, Nebraska, USA. We are actively pursuing software
                            development projects to fuel our growth. To collaborate with us, please reach out at <a
                                href=" mailto:support@unacog.com" target="_blank">support@unacog.com</a>
                                    </p>
                    </div>
                    <div class="col-md-2 mb-md-0">
                        <h5>Company</h5>
                        <ul class="nav flex-column" style="font-size: 1.2em;">
<li class="nav-item mb-2"><a href="/content/about/" class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25
                                    link-underline-opacity-100-hover">About</a></li>
<li class="nav-item mb-2"><a href="/content/privacy/" class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25
                                    link-underline-opacity-100-hover">Privacy</a></li>
<li class="nav-item mb-2"><a class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25
                                    link-underline-opacity-100-hover" href="/content/pricing/">Pricing</a></li>
                        </ul>
                    </div>
                    <div class="col-md-4 mb-3">
                        <h5 class="mb-0">Newsletter Signup:</h5>
                        <p class="my-1">Get tips, updates, news and more.</p>
                        <div class="intro_card card">
                            <div id="mc_embed_shell">
                                <div id="mc_embed_signup">
                                    <form
action="https://promptplusai.us21.list-manage.com/subscribe/post?u=064c017e2febcbb50595f9c46&amp;id=4abff76760&amp;f_id=00695ee1f0"
                                        method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form"
                                        class="validate m-2 mb-1" target="_self" novalidate="">
                                        <div id="mc_embed_signup_scroll">
                                            <div class="mc-field-group w-100"><label class="visually-hidden" for="mce-EMAIL">
                                                    Email Address</label><input type="email" name="EMAIL"
                                                    placeholder="Email Address" class="required email py-2" id="mce-EMAIL"
                                                    required="" value=""></div>
                                            <div id="mce-responses" class="clear foot">
                                                <div class="response" id="mce-error-response" style="display: none;"></div>
                                                <div class="response" id="mce-success-response" style="display: none;"></div>
                                            </div>
                                            <div aria-hidden="true" style="position: absolute; left: -5000px;">
                                                /* real people should not fill this in and expect good things - do not remove
                                                this or risk form bot signups */
                                                <input type="text" name="b_064c017e2febcbb50595f9c46_4abff76760" tabindex="-1"
                                                    value="">
                                            </div>
                                            <div class="optionalParent text-center">
                                                <div class="clear foot d-inline-block">
                                                    <input type="submit" name="subscribe" id="mc-embedded-subscribe" class="button"
                                                        value="Subscribe">
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="d-flex flex-column flex-sm-row justify-content-center py-2 border-top">
                    <p class="my-1"> © 2023, All Rights Reserved</p>
                </div>
            </footer>
            </div>`;
  }
  /** get content list template
  * @param { boolean } contentPage return content list if true
  * @return { string } html footer
  */
  getFlyerListTemplate(contentPage: boolean): string {
    const newsList = [
      {
        link: "/content/credits/",
        title: "Cost Info",
        description: "Unacog Credits Explained",
        image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
          "images%2Fpresentations%2Fcredits%20system%2F1.jpg?alt=media&token=e5fc4982-3401-4f33-8123-f8f7a2bdacc1",
        date: "08-22-2023",
      },
      {
        link: "/content/howto/",
        title: "How To",
        description: "Crafting Effective Chatgpt Prompts",
        image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
          "images%2Fpresentations%2Fcrafting%20effective%20prompts%20tips%2F1.jpg?alt=media&token=dc2f474a-2225-4c2b-bee6-79b6013f3af2",
        date: "08-21-2023",
      },
      {
        link: "/content/toplist/",
        title: "Top List",
        description: "Most Common Misconceptions about LLMs",
        image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
          "images%2Fpresentations%2FDebunking%20AI%20Myths%2010%20Common%20Misconceptions%2F1.jpg" +
          "?alt=media&token=faebb283-162b-4c51-97ac-3cd61313a222",
        date: "08-18-2023",
      },
      {
        link: "/content/edustudy1/",
        title: "Edu Use Case",
        description: "Using LLMs as a Personal Tutor: AI tutors in EDU",
        image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
          "images%2Fpresentations%2Fpersonal%20tutor%20edu%2F1.jpg?alt=media&token=49769202-ea50-4e59-8d42-06454bb9032b",
        date: "08-15-2023",
      },
      {
        link: "/content/sharingprompts/",
        title: "Share Chat Sessions",
        description: "Copy, import, export and share prompts",
        image: "/content/sharingprompts/shareprompts.png",
        date: "08-13-2023",
      },
      {
        link: "/content/litreview/",
        title: "Literature Review",
        description: "Chatgpt and LLMs in Academia: Opportunities and Challenges",
        image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
          "images%2Fpresentations%2Fgpt%20classroom%20challenges%20and%20possibilities%2F1.jpg" +
          "?alt=media&token=d3f4ea33-4d9e-4d7f-9ae4-660477f57055",
        date: "08-10-2023",
      },
      {
        link: "/content/managingcontext/",
        title: "Managing Context",
        description: "Control what the LLM sees to limit costs and generate better results",
        image: "/content/overview/costtracking.png",
        date: "08-07-2023",
      },
      {
        link: "/content/litreview1/",
        title: "Literature Review",
        description: "We Need to Talk About ChatGPT: The Future of AI and Higher Education",
        image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
          "images%2Fpresentations%2Ffuture%20of%20higher%20education%2F1.jpg?alt=media&token=c0951f29-ddee-4d7a-84ad-46003a217704",
        date: "08-05-2023",
      },
      {
        link: "/content/outputformatting/",
        title: "Output Formatting",
        description: "Formatting equations, code and markdown",
        image: "/content/outputformatting/outputformatting.png",
        date: "08-03-2023",
      },
      {
        link: "/content/edustudy/",
        title: "Edu Use Case",
        description: "Make Your Lessons Come To Life With AI: Using Context to Streamline Course Material",
        image: "https://firebasestorage.googleapis.com/v0/b/promptplusai.appspot.com/o/" +
          "images%2Fpresentations%2Flesson%20plans%20with%20ai%2F1.jpg?alt=media&token=b06c993a-ea05-4467-abcc-a6290e515f1a",
        date: "07-29-2023",
      },
      {
        link: "/content/teamtogether/",
        title: "Learn Together",
        description: "Sessions and sharing for groups",
        image: "/images/learntogether.png",
        date: "07-29-2023",
      },
      {
        link: "/content/editresponse/",
        title: "Edit Response",
        description: "Edit response directly in chat",
        image: "/images/editresponse_quirk.png",
        date: "07-24-2023",
      },
      {
        link: "/content/overview/",
        title: "Technical Overview",
        description: "Architecture, frameworks, APIs and passing data to LLM APIs",
        image: "/content/overview/firebasecloud.png",
        date: "06-28-2023",
      },
      {
        link: "/content/webscrape/",
        title: "Scrape a Webpage",
        description: "Scrape a website using this template",
        image: "/images/webscrape_banner.png",
        date: "06-18-2023",
      },
      {
        link: "https://www.youtube.com/watch?v=9VMFh3eAFrE&t=4s",
        title: "App Walkthrough",
        description: "Beta Release - Feature Walkthrough",
        image: "/images/walkthruoverlay.jpg",
        date: "05-25-2023",
      },
    ];
    let items = "";
    newsList.forEach((item: any) => {
      items += `<li class="news_group_item hover_yellow"><a class="d-flex flex-column" href="${item.link}">
              <div class="d-flex flex-column" style="flex:1">
                <div style="flex:1;text-align:center;display:flex;">
                  <img src="${item.image}" style="align-self:center;">
                </div>
                <div class="d-flex w-100 justify-content-between">
                  <h5 class="mb-1"><span class="title">${item.title}</span><i class="material-icons"
                    style="margin-left: 4px;position:relative;top: 4px;font-size:0.9em;">open_in_new</i></h5>
                  <small class="date">${item.date}</small>
                </div>
                <div class="caption">${item.description}</div>
              </div>
            </a></li>`;
    });
    if (contentPage) {
      items += ``;
    }
    return items;
  }
  /** get content list template
   * @param { boolean } contentPage return content list if true
   * @return { string } html footer
   */
  getContentListTemplate(contentPage: boolean): string {
    let items = ` <li>
                      <a class="hover_yellow" href="/content/cuttlecard/">
                          <strong class="title">Cuttle part 1</strong>
                          <span class="caption">Teach AI New Card Game: gpt-3.5-turbo plays Cuttle</span>
                      </a>
                  </li>
                  <li>
                      <a class="hover_yellow" href="/content/cuttlecard2/">
                          <strong class="title">Cuttle Part 2</strong>
                          <span class="caption">AI Strategist: Using gpt-3.5-turbo to help with tips</span>
                      </a>
                  </li>
                  <li>
                      <a class="hover_yellow" href="/content/heartscardgame/">
                          <strong class="title">Hearts Card Game Prompts</strong>
                          <span class="caption">gpt-3.5-turbo vs chat-bison-001</span>
                      </a>
                  </li>
                  <li>
                      <a class="hover_yellow" href="/content/yahtzee/">
                          <strong class="title">Keep score in Yahtzee</strong>
                          <span class="caption">Keep score for 2 players and roll dice</span>
                      </a>
                  </li>
                  <li>
                      <a class="hover_yellow" href="/content/nodalanalysis/">
                          <strong class="title">Nodal Analysis</strong>
                          <span class="caption">gpt-3.5-turbo and chat-bison-001 tackle a circuit.</span>
                      </a>
                  </li>
                  `;
    if (contentPage) {
      items += `    <li>
            <a class="hover_yellow" href="/content/ainarrative/">AI Narrative
                - <span class="caption">A new AI named SkyNet discovers an ancient hiding AI named BirdBrain.</span>
            </a>
        </li>
        <li>
            <a class="hover_yellow" href="/content/labelsmenu/">Bootstrap sub menu
                - <span class="caption">Add sub menu for selecting labels for each session.</span>
            </a>
        </li>`;
    }
    return items;
  }
  /**  On page load, unless on help page, set the day mode based on user preference
   * @return { number } 1 for dark mode, 0 for day
  */
  static initDayMode(): number {
    if (window.location.pathname === "/help/") return 1;

    const niteMode = localStorage.getItem("niteMode");
    let themeIndex = 0;
    const highlightjstheme: any = document.querySelector("#highlightjstheme");
    if (niteMode !== "true") {
      themeIndex = 0;
      document.body.classList.add("day_mode");
      document.body.classList.remove("nite_mode");
      if (highlightjstheme) {
        highlightjstheme.setAttribute("href", "/css/stackoverflowlight.css");
        highlightjstheme.remove();
        document.body.append(highlightjstheme);
      }
    } else {
      themeIndex = 1;
      document.body.classList.remove("day_mode");
      document.body.classList.add("nite_mode");
      if (highlightjstheme) {
        highlightjstheme.setAttribute("href", "/css/androidstudio.css");
        highlightjstheme.remove();
        document.body.append(highlightjstheme);
      }
    }

    return themeIndex;
  }
  /** Toggle night mode when the checkbox is changed
   * @param { boolean } niteMode true if nite mode
  */
  toggleDayMode(niteMode = false) {
    if (niteMode) {
      localStorage.setItem("niteMode", "true");
    } else {
      localStorage.setItem("niteMode", "false");
    }
    this.themeIndex = BaseApp.initDayMode();
  }
}
