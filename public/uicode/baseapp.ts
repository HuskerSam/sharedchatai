import ProfileHelper from "./profilehelper.js";

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
  userPresenceStatusRefs: any = {};
  userStatusDatabaseRef: any;
  profileHelper = new ProfileHelper(this);
  menu_profile_user_image_span: any = document.querySelector(".menu_profile_user_image_span");
  menu_profile_user_name_span: any = document.querySelector(".menu_profile_user_name_span");

  /** constructor  */
  constructor() {
    window.addEventListener("beforeinstallprompt", (e: any) => {
      e.preventDefault();
      this.deferredPWAInstallPrompt = e;
    });

    if (window.location.hostname === "localhost") this.basePath = `http://localhost:5001/${this.projectId}/us-central1/`;

    firebase.auth().onAuthStateChanged((u: any) => this.authHandleEvent(u));
    this.signInWithURL();

    this.load();
  }
  /** asynchronous loads - data setup  */
  async load() {
    this.authUpdateStatusUI();
  }
  /** reads a json file async and sets window.varName to it's value
   * @param { string } path url to json data
   * @param { string } varName window.variable to hold data
   * @return { any } file contents or {}
   */
  async readJSONFile(path: string, varName: string): Promise<any> {
    if (window[varName]) return window[varName];

    try {
      const response = await fetch(path);
      window[varName] = await response.json();
    } catch (e) {
      console.log("ERROR with download of " + varName, e);
      window[varName] = {};
    }
    return window[varName];
  }
  /** Paints UI display/status for user profile based changes */
  authUpdateStatusUI() {
    if (this.fireToken) {
      if (document.body.dataset.creator === this.uid) document.body.classList.add("user_editable_record");
    }

    if (this.profile) {
      this.updateUserStatus();
      if (this.profileHelper) {
        this.profileHelper.updateUserImageAndName();
      }
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

      if (this.signin_show_modal) this.signin_show_modal.click();
    }

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
    };

    this.profileDefaulted = true;
    await firebase.firestore().doc(`Users/${this.uid}`).set(this.profile, {
      merge: true,
    });
  }
  /** update user auth status, username/email etc */
  updateUserStatus() {
    if (this.menu_profile_user_image_span) {
      let img = this.profile.displayImage;
      if (!img) img = "/images/defaultprofile.png";
      const imgEle = document.createElement("img");
      imgEle.setAttribute("crossorigin", "anonymous");
      imgEle.setAttribute("src", img);
      document.body.appendChild(imgEle);
      this.menu_profile_user_image_span.style.backgroundImage = "url(" + img + ")";
      imgEle.remove();
    }
    if (this.menu_profile_user_name_span) {
      let displayName = this.profile.displayName;
      if (!displayName) displayName = "Anonymous";
      this.menu_profile_user_name_span.innerHTML = displayName;
    }
    return;
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
      if (!profile.data() || !profile.data().displayName) {
        const picture = loginResult.additionalUserInfo.profile.picture;
        await this._authCreateDefaultProfile(loginResult.additionalUserInfo.profile.name, picture);
      }
    }
    setTimeout(() => {
      if (location.pathname === "/") location.href = location.origin + "/dashboard";
      else location.reload();
    }, 20);
  }
  /** anonymous sign in handler
   * @param { any } e dom event - preventDefault is called if passed
   */
  async signInAnon(e: any) {
    e.preventDefault();
    await firebase.auth().signInAnonymously();
    setTimeout(() => {
      if (location.pathname === "/") location.href = location.origin + "/dashboard";
      else location.reload();
    }, 1);
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
        if (location.pathname === "/") location.href = location.origin + "/dashboard";
        else location.reload();
      })
      .catch((e: any) => console.log(e));
  }
  /** returns text value for time since Now, i.e. 3 mins ago
   * @param { Date } date value to format
   * @param { boolean } showSeconds show counting seconds
   * @return { string } formatted string value for time since
   */
  timeSince(date: Date, showSeconds = false): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

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
      if (amFormat) return this.formatAMPM(dt);

      // const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      let result = this.formatAMPM(dt);
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
  formatAMPM(date: Date): string {
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
  shortShowDate(d: any): string {
    d = new Date(d);
    if (isNaN(d)) return "";
    const str = d.toISOString().substr(0, 10);
    const mo = str.substr(5, 2);
    const ye = str.substr(2, 2);
    const da = str.substr(8, 2);
    return `${mo}/${da}/${ye}`;
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
  /** init rtdb for online persistence status */
  initRTDBPresence() {
    if (!this.uid) return;
    if (this.rtdbPresenceInited) return;

    this.rtdbPresenceInited = true;
    this.userStatusDatabaseRef = firebase.database().ref("/OnlinePresence/" + this.uid);

    const isOfflineForDatabase = {
      state: "offline",
      last_changed: firebase.database.ServerValue.TIMESTAMP,
    };

    const isOnlineForDatabase = {
      state: "online",
      last_changed: firebase.database.ServerValue.TIMESTAMP,
    };

    firebase.database().ref(".info/connected").on("value", (snapshot: any) => {
      if (snapshot.val() == false) return;

      this.userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(() => {
        this.userStatusDatabaseRef.set(isOnlineForDatabase);
      });
    });
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
  }
  /** paint users online status */
  updateUserPresence() {
    document.querySelectorAll(".member_online_status")
      .forEach((div: any) => {
        if (this.userPresenceStatus[div.dataset.uid]) {
          div.classList.add("online");
        } else {
          div.classList.remove("online");
          if (div.dataset.uid === this.uid) {
            this.refreshOnlinePresence();
          }
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
   * @param { string } str  raw string to escape
   * @return { string } escaped string
  */
  static escapeHTML(str: string): string {
    if (!str) str = "";
    return str.replace(/[&<>'"]/g,
      (match) => {
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
    navigator.clipboard.writeText(window.location.origin + "/session/?id=" + sessionId);
    btn.innerHTML = "✅ " + buttonText;
    setTimeout(() => btn.innerHTML = buttonText, 1200);
  }
  /** when user toggles a menu section save it to profile
 * @param { string } fieldKey field in session doc
 * @param { any } value string or boolean usually
*/
  saveProfileField(fieldKey: string, value: any) {
    firebase.firestore().doc(`Users/${this.uid}`).set({
      [fieldKey]: value,
    }, {
      merge: true,
    });
  }
  /**
   *
   * @param { number } x incoming number
   * @return { string } number with commas
   */
  static numberWithCommas(x: number): string {
    if (isNaN(Number(x))) x = 0;
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
}
