import BaseApp from "./baseapp.js";
import LoginHelper from "./loginhelper.js";
import DocCreateHelper from "./doccreatehelper.js";
import {
    HelpHelper,
} from "./helphelper.js";

declare const firebase: any;

/** Guess app class */
export class HomePageApp extends BaseApp {
    login = new LoginHelper(this);
    documentCreate = new DocCreateHelper(this);
    show_profile_modal: any = document.querySelector(".show_profile_modal");
    show_create_modal: any = document.querySelector(".show_create_modal");
    checkTemplateURL = false;
    homepage_signin_show_modal: any = document.querySelector(".homepage_signin_show_modal");
    helpHelper = new HelpHelper(this);

    help_show_modal: any = document.querySelector(".help_show_modal");
    engine_settings_help: any = document.querySelector(".engine_settings_help");
    user_profile_help: any = document.querySelector(".user_profile_help");
    
    showhomepage_help: any = document.querySelector(".showhomepage_help");

    optimizng_prompts_help: any = document.querySelector(".optimizng_prompts_help");
    shared_sessions_help: any = document.querySelector(".shared_sessions_help");
    sign_out_homepage: any = document.querySelector(".sign_out_homepage");
    recent_documents_list: any = document.querySelector(".recent_documents_list");
    lastDocumentsSnapshot: any = null;
    recentDocumentFeedRegistered = false;
    recentDocumentsSubscription: any = null;

    /** */
    constructor() {
        super();
        this.show_profile_modal.addEventListener("click", (event: any) => {
            event.stopPropagation();
            event.preventDefault();

            this.profileHelper.show();
        });
        this.show_create_modal.addEventListener("click", (event: any) => {
            event.stopPropagation();
            event.preventDefault();

            this.documentCreate.show();
        });

        if (this.engine_settings_help) this.engine_settings_help.addEventListener("click", () => this.helpHelper.show("engine"));
        if (this.user_profile_help) this.user_profile_help.addEventListener("click", () => this.helpHelper.show("profile"));
        if (this.optimizng_prompts_help) this.optimizng_prompts_help.addEventListener("click", () => this.helpHelper.show("prompts"));
        if (this.shared_sessions_help) this.shared_sessions_help.addEventListener("click", () => this.helpHelper.show("session"));
        if (this.showhomepage_help) this.showhomepage_help.addEventListener("click", (event: any) => this.helpHelper.show("session", event));
        
        if (this.sign_out_homepage) {
            this.sign_out_homepage.addEventListener("click", (e: any) => {
                if (!confirm("Are you sure you want to signout?")) return;
                this.profileHelper.authSignout(e);
                e.preventDefault();
                return false;
            });
        }
    }
    /** override event that happens after authentication resolution */
    authUpdateStatusUI(): void {
        super.authUpdateStatusUI();
        if (this.profile) {
            if (!this.checkTemplateURL) {
                this.checkTemplateURL = true;
                const templatePath = this.urlParams.get("templatepath");
                const title = this.urlParams.get("title");
                if (title) this.documentCreate.create_modal_title_field.value = title;
                if (templatePath) this.showCreateDialog(templatePath);
            }
            this.initRecentDocumentsFeed();
        } else if (!this.checkTemplateURL && this.urlParams.get("templatepath")) {
            if (!this.fireUser) {
                this.checkTemplateURL = true;
                this.homepage_signin_show_modal.click();
            }
        }
    }
    /** show create dialog if a url "templatepath" is passed in
     * @param { string } templatePath url to json tickets import
    */
    async showCreateDialog(templatePath: string) {
        const templateData = await this.readJSONFile(templatePath, "importTemplateFilePath");
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
            alert("not importable rows round");
        } else {
            this.documentCreate.show();
        }
    }

    /** setup data listener for recent document feed */
    async initRecentDocumentsFeed() {
        if (this.recentDocumentFeedRegistered) return;
        this.recentDocumentFeedRegistered = true;

        if (this.recentDocumentsSubscription) this.recentDocumentsSubscription();
        this.recentDocumentsSubscription = firebase.firestore().collection(`Games`)
            .orderBy(`members.${this.uid}`, "desc")
            .limit(5)
            .onSnapshot((snapshot: any) => this.updateRecentDocumentFeed(snapshot));
    }
    /** paint recent document feed
* @param { any } snapshot firestore query data snapshot
*/
    updateRecentDocumentFeed(snapshot: any = null) {
        if (snapshot) this.lastDocumentsSnapshot = snapshot;
        else if (this.lastDocumentsSnapshot) snapshot = this.lastDocumentsSnapshot;
        else return;

        let html = "";
        this.lastDocumentsSnapshot.forEach((doc: any) => {
            const data = doc.data();
            let title = BaseApp.escapeHTML(data.title);
            if (!title) title = "unused";
            // const activityDate = data.created.substring(5, 16).replace("T", " ").replace("-", "/");
            title = title.substring(0, 100);
            const activityDate = this.showGmailStyleDate(new Date(data.lastActivity));
            const rowHTML = `<li>
        <a href="/session/?id=${doc.id}">
          <div class="sidebar_tree_recent_title title">${title}</div>
          <div class="activity_date">${activityDate}</div>
        </a></li>`;
            html += rowHTML;
        });
        this.recent_documents_list.innerHTML = html;
    }
}
