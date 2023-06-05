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
        return `<div class="modal fade login_modal_container" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="loginModalLabel">Login Options</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <p class="text-muted">Experience seamless login
             with three methods: email, Google authentication, or anonymous login. No password required!</p>
            <h6 class="mt-1">Passwordless Email Login</h6>
              <div class="input-group mb-3">
                <input type="text" name="email" class="form-control login_email mx-1" placeholder="Email">
                <button class="btn btn-success" id="login_email_anchor">Send Link</button>
              </div>
              <h6>or</h6>
              <button class="btn btn-primary" id="login_google">
                <img class="google_logo" src="/images/google_signin.png">
                Sign in with Google</button>
              <br>
              <button class="anon_login_anchor btn btn-primary">Login Anonymously</button>
              <br>
         
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary upload_import_button">Import</button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
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

