import BaseApp from "./baseapp.js";

declare const firebase: any;

/** Guess app class */
export class HomePageApp extends BaseApp {
    show_profile_modal: any = document.querySelector(".show_profile_modal");
    show_create_modal: any = document.querySelector(".show_create_modal");
    checkTemplateURL = false;

    help_show_modal: any = document.querySelector(".help_show_modal");

    sign_out_homepage: any = document.querySelector(".sign_out_homepage");
    recent_documents_list: any = document.querySelector(".recent_documents_list");
    lastDocumentsSnapshot: any = null;
    recentDocumentFeedRegistered = false;
    recentDocumentsSubscription: any = null;
    home_page_login: any = document.querySelector(".home_page_login");
    add_footer = true;
    html_body_container: any = document.querySelector(".container");
    content_list_container: any = document.querySelector(".recent_content_ul_list");

    /** */
    constructor(contentPage = false) {
        super();
        this.showLoginModal = false;
        this.profileHelper.noAuthPage = true;

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
                    this.login.show();
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


        if (this.home_page_login) {
            this.home_page_login.addEventListener("click", (e: any) => {
                e.stopPropagation();
                e.preventDefault();
                this.login.show();
            });
        }
        if (this.add_footer) {
            const element = document.createElement("div");
            element.classList.add("footer_container_div");
            element.innerHTML = this.getFooterTemplate(contentPage);
            this.html_body_container.appendChild(element);
        }
        if (this.content_list_container) {
            this.content_list_container.innerHTML = this.getContentListTemplate(contentPage);
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
            alert("no importable rows round");
        } else {
            this.documentCreate.show("", true);
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
            if (!title) title = "untitled";
            // const activityDate = data.created.substring(5, 16).replace("T", " ").replace("-", "/");
            title = title.substring(0, 100);
            const activityDate = this.showGmailStyleDate(new Date(data.lastActivity));
            const rowHTML = `<li>
        <a href="/session/${doc.id}" class="hover_yellow">
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
            const section = anchorLink.closest("[id]");
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
    /** get footer template */
    getFooterTemplate(contentPage: boolean) {
        let link = `<a href="/content/"
        class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
        target="content">Content</a>`;
        if (contentPage) link = `<a href="/"
        class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
        target="content">Home</a>`;

        return `<footer class="side_block m-0 pb-1 app_panel">
            <div class="row">
                <div class="col-12 col-md-3 mb-3 mb-md-0 text-center text-md-start">
                    <h5>PromptPlus AI</h5>
                    <p>
                        We are a dedicated team based in Lincoln, Nebraska, USA. We are actively pursuing software development projects to fuel our growth. To collaborate with us, please reach out at <a
                            href="mailto:promptplusai@gmail.com" target="_blank">promptplusai@gmail.com</a>
                    </p>
                </div>
                <div class="col-6 col-md-2 mb-3 mb-md-0">
                    <h5>Navigate</h5>
                    <ul class="nav flex-column" style="font-size: 1.2em;">
                        <li class="nav-item mb-2">${link}</li>
                        <li class="nav-item mb-2"><a href="/dashboard/"
                                class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                                target="session">Sessions</a></li>
                        <li class="nav-item mb-2"><a
                                class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                                href="/help/" target="help">Help</a></li>
                    </ul>
                </div>
                <div class="col-6 col-md-2 mb-3 mb-md-0">
                    <h5>Company</h5>
                    <ul class="nav flex-column" style="font-size: 1.2em;">
                        <li class="nav-item mb-2"><a href="/content/about/"
                                class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                                target="about">About</a></li>
                        <li class="nav-item mb-2"><a href="/content/privacy/"
                                class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                                target="privacy">Privacy</a></li>
                        <li class="nav-item mb-2"><a
                                class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                                href="/content/pricing/" target="pricing">Pricing</a></li>
                    </ul>
                </div>
                <div class="col-md-4 offset-md-1 mb-3">
                    <p class="header_recent_document">Signup for Email List</p>
                    <div class="intro_card card">
                        <div id="mc_embed_shell">
                            <div id="mc_embed_signup">
                                <form
                                    action="https://promptplusai.us21.list-manage.com/subscribe/post?u=064c017e2febcbb50595f9c46&amp;id=4abff76760&amp;f_id=00695ee1f0"
                                    method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form"
                                    class="validate" target="_self" novalidate="">
                                    <div id="mc_embed_signup_scroll">
                                        <div class="mc-field-group"><label for="mce-EMAIL">Email Address</label><input
                                                type="email" name="EMAIL" class="required email" id="mce-EMAIL" required=""
                                                value=""></div>
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
                                        <div class="optionalParent">
                                            <div class="clear foot">
                                                <input type="submit" name="subscribe" id="mc-embedded-subscribe"
                                                    class="button" value="Subscribe">
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="d-flex flex-column flex-sm-row justify-content-center py-2 mt-3 border-top">
                <p class="my-1"> © 2023, All Rights Reserved</p>
            </div>
        </footer>`
    };
    /** get content list template */
    getContentListTemplate(contentPage: boolean) {
        let items = `<li>
        <a class="hover_yellow" href="/content/cuttlecard/">Cuttle part 1: Teach AI New Card Game
            - <span class="caption">Using gpt-3.5-turbo to play Cuttle</span></a>
    </li>
    <li>
        <a class="hover_yellow" href="/content/cuttlecard2/">Cuttle Part 2: AI Strategist
            - <span class="caption">Using gpt-3.5-turbo to help with tips</span></a>
    </li>
    <li>
        <a class="hover_yellow" href="/content/heartscardgame/">Hearts Card Game Prompts
            - <span class="caption">gpt-3.5-turbo vs chat-bison-001</span>
        </a>
    </li>
    <li>
        <a class="hover_yellow" href="/content/yahtzee/">Keep score in Yahtzee
            - <span class="caption">keep score for 2 players and roll dice</span>
        </a>
    </li>
`;
        if (contentPage) {
            items += `    <li>
            <a class="hover_yellow" href="/content/nodalanalysis/">Nodal Analysis
                - <span class="caption">gpt-3.5-turbo and chat-bison-001 are taken to task with a
                    circuit.</span>
            </a>
        </li>`;
        }
        return items;
    }
}
