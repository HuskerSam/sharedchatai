import Utility from "./utility.js";
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
  mute_button: any = null;
  verboseLog = false;
  rtdbPresenceInited = false;
  userPresenceStatus: any = {};
  userPresenceStatusRefs: any = {};
  userStatusDatabaseRef: any;

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
   */
  async readJSONFile(path: string, varName: string) {
    if (window[varName]) return;

    try {
      const response = await fetch(path);
      window[varName] = await response.json();
    } catch (e) {
      console.log("ERROR with download of " + varName, e);
      window[varName] = {};
    }
  }
  /** Paints UI display/status for user profile based changes */
  authUpdateStatusUI() {
    if (this.fireToken) {
      if (document.body.dataset.creator === this.uid) document.body.classList.add("user_editable_record");
    }

    if (this.profile) {
      this.updateUserStatus();
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
    this.profileSubscription = firebase.firestore().doc(`Users/${this.uid}`)
      .onSnapshot(async (snapshot: any) => {
        this.profileInited = true;
        this.profile = snapshot.data();
        if (!this.profile) {
          if (this.fireUser.email) {
            const result = await firebase.auth().fetchSignInMethodsForEmail(this.fireUser.email);
            // user was deleted dont create new profile - this is the case where the user deletes the account in browser
            if (result.length < 1) return;
          }

          await this._authCreateDefaultProfile();
        }

        this.authUpdateStatusUI();
      });
  }
  /** create default user profile record and overwrite to database without merge (reset) */
  async _authCreateDefaultProfile() {
    await this.readJSONFile(`/data/logos.json`, "profileLogos");
    const keys = Object.keys(window.profileLogos);
    const imageIndex = Math.floor(Math.random() * keys.length);
    const logoName = keys[imageIndex];
    this.profile = {
      displayName: Utility.generateName(),
      displayImage: window.profileLogos[logoName],
      documentLabels: "Personal,Business,Misc",
    };

    await firebase.firestore().doc(`Users/${this.uid}`).set(this.profile);
  }
  /** update user auth status, username/email etc */
  updateUserStatus() {
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
    await firebase.auth().signInWithPopup(provider);
  }
  /** anonymous sign in handler
   * @param { any } e dom event - preventDefault is called if passed
   */
  async signInAnon(e: any) {
    e.preventDefault();
    await firebase.auth().signInAnonymously();
    setTimeout(() => {
      location.reload();
    }, 1);
    return true;
  }

  /** for use on page load - tests if a signIn token was included in the URL */
  signInWithURL() {
    if (!firebase.auth().isSignInWithEmailLink) return;
    if (firebase.auth().isSignInWithEmailLink(window.location.href) !== true) return;

    let email = window.localStorage.getItem("emailForSignIn");
    if (!email) email = window.prompt("Please provide your email for confirmation");

    firebase.auth().signInWithEmailLink(email, window.location.href)
      .then(() => {
        window.localStorage.removeItem("emailForSignIn");
        window.location = "/profile";
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
    if (interval > 1) return Math.floor(interval) + ` mon`;

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ` day${Math.floor(interval) === 1 ? "" : "s"}`;

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ` hr`;

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ` min`;

    if (showSeconds) return Math.floor(seconds) + "s";

    return "now";
  }
  /** get gmail like past date
   * @param { Date } dt date to format
   * @return { string } formatted date
  */
  showEmailAsGmail(dt: Date): string {
    if (Date.now() - dt.getTime() < 24 * 60 * 60 * 1000) {
      return this.formatAMPM(dt);
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
  isoToLocal(startTimeISOString: string): Date {
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
        if (this.userPresenceStatus[div.dataset.uid]) div.classList.add("online");
        else div.classList.remove("online");
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
        dateDisplay = this.showEmailAsGmail(new Date(isoTime));
      } else {
        dateDisplay = this.timeSince(new Date(isoTime), (showSeconds === "1")).replaceAll(" ago", "");
      }
      ctl.innerHTML = dateDisplay;
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
}
