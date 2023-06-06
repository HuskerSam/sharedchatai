declare const firebase: any;

/** login dialog helper - displays automatically if #signin_show_modal button exists */
export default class LoginHelper {
    login_google: any = null;
    login_email_anchor: any = null;
    anon_login_anchor: any = null;
    login_email: any = null;
    app: any = null;

    /**
     * @param { any } app baseapp derived instance
     */
    constructor(app: any) {
        this.app = app;
        const html = this.getModalTemplate();
        const modalContainer = document.createElement("div");
        modalContainer.innerHTML = html;
        document.body.appendChild(modalContainer);

        this.login_google = document.getElementById("login_google");
        this.login_email_anchor = document.getElementById("login_email_anchor");
        this.anon_login_anchor = document.querySelector(".anon_login_anchor");
        this.login_email = document.querySelector(".login_email");

        this.login_google.addEventListener("click", (e: any) => this.app.authGoogleSignIn(e));
        this.login_email_anchor.addEventListener("click", (e: any) => this.signInByEmail(e));
        this.anon_login_anchor.addEventListener("click", (e: any) => this.app.signInAnon(e));
    }
    /** get modal template
     * @return { string } template
     */
    getModalTemplate(): string {
        return `<div class="modal fade " id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content login_modal_container">
        <div class="modal-header">
          <h5 class="modal-title" id="loginModalLabel">Passwordless Authentication</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <h6 class="mt-1">Passwordless Email Login</h6>
              <div class="input-group mb-3">
                <input type="text" name="email" class="form-control login_email mx-1" placeholder="Email">
              </div>
              <div style="text-align:center">
                <button class="btn btn-success" id="login_email_anchor">Log in with Email Link</button>
              <hr>
              <button class="btn btn-primary" id="login_google">
                Log in with Google &nbsp;<img class="google_logo" style="margin-right:-8px;" src="/images/google_signin.png"></button>
                <hr>
              <button class="anon_login_anchor btn btn-primary">Log in Anonymously</button>
              <br>
              </div>
        </div>
        <div class="modal-footer">
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

        const actionCodeSettings = {
            url: window.location.href,
            handleCodeInApp: true,
        };
        await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);

        window.localStorage.setItem("emailForSignIn", email);
        alert("Email Sent");
    }
}

