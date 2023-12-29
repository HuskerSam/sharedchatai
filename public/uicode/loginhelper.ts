import {
  sendSignInLinkToEmail,
  getAuth,
} from "firebase/auth";

/** login dialog helper - displays automatically if not home page */
export default class LoginHelper {
  login_google: any = null;
  login_email_anchor: any = null;
  anon_login_anchor: any = null;
  login_email: any = null;
  app: any = null;
  modalContainer: any = null;
  disableReload = false;
  modal: any = null;

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
    this.login_email.addEventListener("keydown", (e: any) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        this.login_email_anchor.click();
      }
    });

    this.login_google.addEventListener("click", (e: any) => {
      this.disableReload = true;
      this.app.authGoogleSignIn(e);
    });
    this.login_email_anchor.addEventListener("click", (e: any) => this.signInByEmail(e));
    this.anon_login_anchor.addEventListener("click", (e: any) => {
      this.disableReload = true;
      this.app.signInAnon(e);
      this.modal.hide();
    });

    const modal: any = document.getElementById("loginModal");
    modal?.addEventListener("hidden.bs.modal", () => {
      if (this.disableReload) return;
      if (window.location.href === "/") window.location.reload();
      else window.location.href = "/";
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
            <h5 class="mt-1">Email Login</h5>
              <div class="input-group mb-3">
                <input type="text" name="email" class="form-control login_email mx-1" placeholder="Email">
              </div>
              <div style="text-align:center">
                <button class="btn btn-primary" id="login_email_anchor">Log in with Email Link</button>
              <hr>
              <button class="btn btn-primary" id="login_google">
                Log in with Google &nbsp;<img class="login_helper_google_logo" src="/images/google_signin.png"></button>
              </div>
              <hr>
              <div style="text-align:center;line-height: 3em;">
                <button class="anon_login_anchor btn btn-primary">Log in Anonymously</button>
              </div>
              <div style="text-align:center">
               Viewing only. Upgrade to full account entering Email in Profile Settings<br>
              </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
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
    await sendSignInLinkToEmail(getAuth(), email, actionCodeSettings);

    window.localStorage.setItem("emailForSignIn", email);
    alert("Email Sent");

    this.modal.hide();
  }
  /** */
  show() {
    this.modal = new (<any>window).bootstrap.Modal("#loginModal", {});
    this.modal.show();
  }
}
