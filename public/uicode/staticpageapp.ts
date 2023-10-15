import BaseApp from "./baseapp.js";

declare const firebase: any;

/** Guess app class */
export class StaticPageApp extends BaseApp {
    show_profile_modal: any = document.querySelector(".show_profile_modal");
    help_show_modal: any = document.querySelector(".help_show_modal");
    sign_out_homepage: any = document.querySelector(".sign_out_homepage");
    recent_documents_list: any = document.querySelector(".recent_documents_list");
    scrape_urls_btn: any = document.querySelector(".scrape_urls_btn");
    run_prompt: any = document.querySelector(".run_prompt");
    delete_index: any = document.querySelector(".delete_index");
    results_div: any = document.querySelector(".results_div");
    results_table: any = document.querySelector(".results_table");
    lastDocumentsSnapshot: any = null;
    recentDocumentFeedRegistered = false;
    recentDocumentsSubscription: any = null;
    embeddingRunning = false;
    vectorQueryRunning = false;
    indexDeleteRunning = false;

    /**
     * @param { boolean } contentPage true if content page for all items
     */
    constructor(contentPage = false) {
        super(contentPage);
        this.showLoginModal = false;
        this.profileHelper.noAuthPage = true;

        if (this.show_profile_modal) {
            this.show_profile_modal.addEventListener("click", (event: any) => {
                event.stopPropagation();
                event.preventDefault();

                this.profileHelper.show();
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
            if (this.recent_documents_list) this.initRecentDocumentsFeed();
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
    /** scrape URLs for embedding
     * @param { string } urls from a textarea - \n separates
     * @param { string } batchId grouping key
    */
    async embedURLContent(urls: string, batchId: string) {
        if (!firebase.auth().currentUser) {
            alert("login on homepage to use this");
            return;
        }
        if (this.embeddingRunning) {
            alert("already running");
            return;
        }

        this.scrape_urls_btn.innerHTML = "Embedding...";
        this.embeddingRunning = true;
        const body = {
            urls,
            batchId,
        };

        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/scrapeurls", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });


        // if (this.verboseLog) {
        const json = await fResult.json();
        console.log("scrapped html", json.html);
        // }

        if (json.success === false) {
            alert(json.errorMessage);
        }

        this.embeddingRunning = false;
        this.scrape_urls_btn.innerHTML = "Scrape Urls";
    }
    /** query matching vector documents
     * @param { string } query
     * @param { string } batchId grouping key
     * @param { string } pineconeKey
    */
    async queryEmbeddings(query: string, batchId: string, pineconeKey: string) {
        if (!firebase.auth().currentUser) {
            alert("login on homepage to use this");
            return;
        }
        if (this.vectorQueryRunning) {
            alert("already running");
            return;
        }

        this.results_table.innerHTML = "";
        this.results_div.innerHTML = "";

        this.run_prompt.innerHTML = "Processing...";
        this.vectorQueryRunning = true;
        const body = {
            query,
            batchId,
            pineconeKey,
        };

        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/processquery", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const json = await fResult.json();
        console.log("query response", json);

        const resultRows = json.queryResponse.matches;
        let tableRowsHtml = "<tr><th>URL</th><th>Text</th></tr>";
        let primedPrompt = "";
        resultRows.forEach((row: any) => {
            const text = row.metadata.text;
            const url = row.metadata.url;
            tableRowsHtml += `<tr><td>${url}</td><td>${text}</td></tr>`;
            primedPrompt += "Question: " + query +
                "\n\nAnswer: " + text + "\n\n";
        });
        primedPrompt += "Question: " + query;
        this.results_table.innerHTML = tableRowsHtml;
        this.results_div.innerHTML = primedPrompt;

        this.vectorQueryRunning = false;
        this.run_prompt.innerHTML = "Run Query";
    }
    /** delete index
     * @param { string } batchId grouping key
    */
    async deleteIndex(batchId: string) {
        if (!firebase.auth().currentUser) {
            alert("login on homepage to use this");
            return;
        }
        if (this.indexDeleteRunning) {
            alert("already running");
            return;
        }

        this.delete_index.innerHTML = "Deleting...";
        this.indexDeleteRunning = true;
        const body = {
            batchId,
        };

        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.basePath + "embeddingApi/deleteindex", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const json = await fResult.json();
        console.log("query response", json);

        this.indexDeleteRunning = false;
        this.delete_index.innerHTML = "Delete Batch (Pinecone Index)";

        if (json.success === false) {
            alert(json.errorMessage);
        }
    }
}
