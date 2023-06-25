import BaseApp from "./baseapp.js";

declare const firebase: any;

/** Guess app class */
export class HomePageApp extends BaseApp {
    show_profile_modal: any = document.querySelector(".show_profile_modal");
    show_create_modal: any = document.querySelector(".show_create_modal");
    checkTemplateURL = false;

    help_show_modal: any = document.querySelector(".help_show_modal");
    engine_settings_help: any = document.querySelector(".engine_settings_help");
    user_profile_help: any = document.querySelector(".user_profile_help");

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
        if (this.show_profile_modal) {
            this.show_profile_modal.addEventListener("click", (event: any) => {
                event.stopPropagation();
                event.preventDefault();

                this.profileHelper.show();
            });
        }

        if (this.show_create_modal) {
            this.show_create_modal.addEventListener("click", (event: any) => {
                event.stopPropagation();
                event.preventDefault();

                if (!this.uid) {
                    this.signin_show_modal.click();
                    return;
                }

                this.documentCreate.show();
            });
        }

        if (this.sign_out_homepage) {
            this.sign_out_homepage.addEventListener("click", (e: any) => {
                e.preventDefault();
                e.stopPropagation();
                if (!confirm("Are you sure you want to signout?")) return;
                this.profileHelper.authSignout(e);
                return false;
            });
        }
        this.populateAnchorLinks();
        this.bounceSidebarCollapse();
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
            if (this.recent_documents_list) this.initRecentDocumentsFeed();
        }
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
            .limit(10)
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
            if (!title) title = "untitled";
            // const activityDate = data.created.substring(5, 16).replace("T", " ").replace("-", "/");
            title = title.substring(0, 100);
            const activityDate = this.showGmailStyleDate(new Date(data.lastActivity));
            const rowHTML = `<li>
        <a href="/session/${doc.id}">
          <div class="sidebar_tree_recent_title title">${title}</div>
          <div class="activity_date">${activityDate}</div>
        </a></li>`;
            html += rowHTML;
        });
        this.recent_documents_list.innerHTML = html;
    }
    /** populate anchor navigation links  */
    populateAnchorLinks() {
        const anchorLinks = document.querySelectorAll(".anchor_copy_link");
        anchorLinks.forEach((anchorLink: any) => {
            const section = anchorLink.closest("section");
            if (section) {
                const id = section.id;
                if (id) {
                    anchorLink.href = `#${id}`;
                }
            }
            anchorLink.addEventListener("click", (e: any) => {
                e.preventDefault();
                e.stopPropagation();
                const href = anchorLink.href;
                navigator.clipboard.writeText(href);
                anchorLink.innerHTML = `<i class="material-icons copy_green">done</i>
                <i class="material-icons">link</i>`;
                setTimeout(() => anchorLink.innerHTML = `<i class="material-icons">link</i>`, 1200);
                /** console log if href id does not exist  */
                const id = href.split("#")[1];
                const element = document.getElementById(id);
                if (!element) console.log(`element id ${id} does not exist`);
                return false;
            });
        });
    }
    /** bounce sidebarcollaspe button on page scroll, select by id */
    bounceSidebarCollapse() {
        const sidebarCollapse = document.getElementById("sidebarCollapse");
        if (sidebarCollapse) {
            sidebarCollapse.classList.add("bounce");
            window.addEventListener("scroll", () => {
                sidebarCollapse.classList.remove("bounce");
                setTimeout(() => sidebarCollapse.classList.add("bounce"), 50);
            });
        }
    }
}
