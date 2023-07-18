declare const firebase: any;
declare const window: any;

/** login dialog helper - displays automatically if not home page */
export default class LoginHelper {
  login_google: any = null;
  login_email_anchor: any = null;
  anon_login_anchor: any = null;
  login_email: any = null;
  modal_close_button: any = null;
  app: any = null;
  modalContainer: any = null;

  /**
   * @param { any } app baseapp derived instance
   */
  constructor(app: any) {
    this.app = app;
    const html = this.getModalTemplate();
    this.modalContainer = document.createElement("div");
    this.modalContainer.innerHTML = html;
    document.body.appendChild(this.modalContainer);

    this.login_google = document.getElementById("login_google");
    this.login_email_anchor = document.getElementById("login_email_anchor");
    this.anon_login_anchor = this.modalContainer.querySelector(".anon_login_anchor");
    this.login_email = this.modalContainer.querySelector(".login_email");
    this.modal_close_button = this.modalContainer.querySelector(".modal_close_button");
    this.login_email.addEventListener("keydown", (e: any) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        this.login_email_anchor.click();
      }
    });

    this.login_google.addEventListener("click", (e: any) => this.app.authGoogleSignIn(e));
    this.login_email_anchor.addEventListener("click", (e: any) => this.signInByEmail(e));
    this.anon_login_anchor.addEventListener("click", (e: any) => this.app.signInAnon(e));

    const modal = document.getElementById("loginModal");
    modal?.addEventListener("hidden.bs.modal", () => {
      if (this.app.isSessionApp) window.location = "/";
      else window.location.reload();
    });
  }
  /** get modal template
   * @return { string } template
   */
  getModalTemplate(): string {
    return `<div class="modal fade " id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content login_modal_container">
        <div class="modal-header">
          <h4 class="modal-title" id="loginModalLabel">Passwordless Authentication</h4>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
        <div style="text-align: left;">
        You are currently accessing our pre-release version which is free to use. 
       Please note that this is subject to change in the future.
        <hr>
      </div>
            <h5 class="mt-1">Email Login</h5>
              <div class="input-group mb-3">
                <input type="text" name="email" class="form-control login_email mx-1" placeholder="Email">
              </div>
              <div style="text-align:center">
                <button class="btn btn-primary" id="login_email_anchor">Log in with Email Link</button>
              <hr>
              <button class="btn btn-primary" id="login_google">
                Log in with Google &nbsp;<img class="google_logo" src="/images/google_signin.png"></button>
              </div>
              <hr>
              <div style="text-align:center">
               Recommended for viewing only. Anonymous user data typically only retained for 7 days. Access lost upon sign out.
              </div>
              <div style="text-align:center;line-height: 3em;">
                <button class="anon_login_anchor btn btn-primary">Log in Anonymously</button>
              </div>
              <div style="text-align:center">
               Upgrade by entering Email in Profile Settings<br>
              </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary modal_close_button" data-bs-dismiss="modal">
            <i class="material-icons">cancel</i>
            Close
        </button>
        </div>
      </div>
    </div>
  </div>`;
  }
  /** email sign in handler from UI (sends email to user for logging in)
  * @param { any } e dom event - preventDefault is called if passed
  */
  async signInByEmail(e: any) {
    e.preventDefault();

    let email = "";
    if (this.login_email) email = this.login_email.value;

    /*
    if (!email) {
      email = window.prompt("Please provide your email to send link");
    }*/

    if (!email) {
      alert("A valid email is required for sending a link");
      return;
    }

    let url = location.origin + "";
    if (location.href !== "/") url = location.href;

    const actionCodeSettings = {
      url,
      handleCodeInApp: true,
    };
    await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);

    window.localStorage.setItem("emailForSignIn", email);
    alert("Email Sent");

    this.modal_close_button.click();
  }
  /** */
  show() {
    const modal = new window.bootstrap.Modal("#loginModal", {});
    modal.show();
  }
}
