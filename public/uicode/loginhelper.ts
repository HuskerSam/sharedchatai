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
                <h4 class="modal-title" id="loginModalLabel">Log in Options</h4>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="d-flex flex-column gap-2 show">
                    <div class="d-flex flex-column align-items-center justify-content-center gap-2">
                        <div class="w-100">
                            <label class="form-label">Email Login</label>
                            <input type="email" class="form-control login_email" id="floatingInput"
                                    placeholder="email@example.com">
                            <button
                                class="btn btn-primary d-flex w-100 align-items-center justify-content-center mt-2"
                                id="login_email_anchor">
                                <span class="flex-fill text-center">Email a sign in link</span>
                            </button>
                        </div>
                    </div>
                    <div class="d-flex flex-column align-items-center justify-content-center gap-2">
                        <div class="w-100">
                            <button class="btn btn-outline-primary d-flex w-100 align-items-center justify-content-center"
                              id="login_google">
                                <img class="login_helper_google_logo"
                                    src="/images/google_signin.png">&nbsp; Log in with Google</button>
                        </div>
                        <div class="w-100 small fw-light">
                            If your email matches your Google account, you'll be logged into the same account.
                        </div>
                    </div>
                    <div class="my-2 d-flex align-items-center justify-content-center">
                        <div class="flex-grow-1 border-top border-secondary"></div>
                        <span class="mx-4 text-sm">Temporary Login</span>
                        <div class="flex-grow-1 border-top border-secondary"></div>
                    </div>
                    <div class="d-flex flex-column align-items-center justify-content-center gap-2">
                        <div class="w-100">
                            <button 
                            class="anon_login_anchor btn btn-outline-primary d-flex w-100 align-items-center justify-content-center"
                            >Log in Anonymously</button>
                        </div>
                        <div class="w-100 small fw-light">
                            Your data may not be saved. Use for viewing only.
                        </div>
                    </div>
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
