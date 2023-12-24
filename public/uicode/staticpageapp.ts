import BaseApp from "./baseapp";
import {
    collection,
    orderBy,
    query,
    onSnapshot,
    limit,
    getFirestore,
} from "firebase/firestore";
import SharedWithBackend from "./sharedwithbackend";

/** app class for content pages */
export class StaticPageApp extends BaseApp {
    show_profile_modal: any = document.querySelector(".show_profile_modal");
    help_show_modal: any = document.querySelector(".help_show_modal");
    sign_out_homepage: any = document.querySelector(".sign_out_homepage");
    recent_documents_list: any = document.querySelector(".recent_documents_list");
    pricing_type_display: any = document.querySelector(".pricing_type_display");
    bulk_credits_wrapper: any = document.querySelector(".bulk_credits_wrapper");
    power_user_wrapper: any = document.querySelector(".power_user_wrapper");
    model_prices_wrapper: any = document.querySelector(".model_prices_wrapper");
    tokens_per_credit: any = document.querySelector(".tokens_per_credit");
    bulk_credits_table: any = document.querySelector(".bulk_credits_table");
    bulk_project_count: any = document.querySelector(".bulk_project_count");
    bulk_tokens_count: any = document.querySelector(".bulk_tokens_count");
    tokens_per_credit_ratio: any = document.querySelector(".tokens_per_credit_ratio");
    bulk_calc_total_tokens: any = document.querySelector(".bulk_calc_total_tokens");
    primary_model_select: any = document.querySelector(".primary_model_select");
    secondary_model_select: any = document.querySelector(".secondary_model_select");
    power_tokens_count: any = document.querySelector(".power_tokens_count");
    power_project_count: any = document.querySelector(".power_project_count");
    power_user_calc_total_tokens: any = document.querySelector(".power_user_calc_total_tokens");
    primary_usage_level: any = document.querySelector(".primary_usage_level");
    power_user_credits_table: any = document.querySelector(".power_user_credits_table");
    buy_credits_pricing: any = document.querySelector(".buy_credits_pricing");
    lastDocumentsSnapshot: any = null;
    recentDocumentFeedRegistered = false;
    recentDocumentsSubscription: any = null;

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

        if (this.pricing_type_display) {
            this.pricing_type_display.addEventListener("click", () => this.updateSelectedPricing());
            this.updateSelectedPricing();

            this.bulk_project_count.addEventListener("input", () => this.updateBulkCalculatorDisplay());
            this.bulk_tokens_count.addEventListener("input", () => this.updateBulkCalculatorDisplay());
            this.tokens_per_credit_ratio.addEventListener("input", () => this.updateBulkCalculatorDisplay());

            this.updateBulkCalculatorDisplay();

            this.primary_model_select.addEventListener("input", () => this.updatePowerUserCalculator());
            this.secondary_model_select.addEventListener("input", () => this.updatePowerUserCalculator());
            this.power_tokens_count.addEventListener("input", () => this.updatePowerUserCalculator());
            this.power_project_count.addEventListener("input", () => this.updatePowerUserCalculator());
            this.primary_usage_level.addEventListener("input", () => this.updatePowerUserCalculator());
            this.initPowerUserCalcSelects();
            this.updatePowerUserCalculator();
            this.buy_credits_pricing.addEventListener("click", () => this.buyCredits.show());
        }
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
        const chatsRef = collection(getFirestore(), "Games");
        const chatsQuery = query(chatsRef, orderBy(`members.${this.uid}`, "desc"), limit(5));
        this.recentDocumentsSubscription = onSnapshot(chatsQuery, (snapshot: any) => this.updateRecentDocumentFeed(snapshot));
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
    /** */
    updateSelectedPricing() {
        this.bulk_credits_wrapper.style.display = "none";
        this.power_user_wrapper.style.display = "none";
        this.model_prices_wrapper.style.display = "none";
        this.tokens_per_credit.style.display = "none";
        (<any> this)[this.pricing_type_display.value].style.display = "block";
    }
    /** */
    updateBulkCalculatorDisplay() {
        let html = "";
        html += `<tr><th>Model</th><th>Tokens/Credit</th><th>Credits</th><th>Cost*</th></tr>`;
        const models = SharedWithBackend.getModels();
        const modelNames = Object.keys(models);
        const perProject = Number(this.bulk_tokens_count.value);
        const projectCount = Number(this.bulk_project_count.value);
        const ratio = Number(this.tokens_per_credit_ratio.value);
        const tokensNeeded = perProject * projectCount;
        this.bulk_calc_total_tokens.innerHTML = tokensNeeded;
        modelNames.forEach((model: string) => {
            const costRatio = 1 / ((ratio * models[model].input + models[model].output) / (1 + ratio));
            const credits = tokensNeeded / costRatio;
            const cost = credits / 1000 / 0.75;
            const recommended = (model === "gpt-3.5-turbo") ? "class=\"recommended\"" : "";
            html += `<tr ${recommended}>
      <td>${model}</td>
      <td>${BaseApp.numberWithCommas(costRatio)}</td>
      <td>${BaseApp.numberWithCommas(credits)}</td>
      <td>$${BaseApp.numberWithCommas(Math.ceil(cost))}</td>
      </tr>`;
        });
        this.bulk_credits_table.innerHTML = html;
    }

    /** */
    updatePowerUserCalculator() {
        const perProject = Number(this.power_tokens_count.value);
        const projectCount = Number(this.power_project_count.value);
        const tokensNeeded = perProject * projectCount;
        this.power_user_calc_total_tokens.innerHTML = tokensNeeded;
        const primaryModel = this.primary_model_select.value;
        const secondaryModel = this.secondary_model_select.value;
        const primaryMeta = SharedWithBackend.getModelMeta(primaryModel);
        const secondaryMeta = SharedWithBackend.getModelMeta(secondaryModel);
        let modelRatio = Number(this.primary_usage_level.value);
        if (isNaN(modelRatio)) modelRatio = 0;
        if (modelRatio < 0) modelRatio = 0;
        if (modelRatio > 100) modelRatio = 100;

        let html = `<tr><th>Ratio</th><th>Credits</th><th>Cost*</th></tr>`;

        for (let ratio = 1; ratio <= 5; ratio++) {
            const primaryRatio = 1 / ((ratio * primaryMeta.input + primaryMeta.output) / (1 + ratio));
            const secondaryRatio = 1 / ((ratio * secondaryMeta.input + secondaryMeta.output) / (1 + ratio));
            const primaryTokens = modelRatio * tokensNeeded / 100;
            const secondaryTokens = (100 - modelRatio) * tokensNeeded / 100;
            const credits = primaryTokens / primaryRatio + secondaryTokens / secondaryRatio;
            const cost = credits / 1000 / 0.75;

            html += `<tr><td>${ratio}:1</td><td>${BaseApp.numberWithCommas(credits)}</td>
        <td>${BaseApp.numberWithCommas(Math.ceil(cost))}</td></tr>`;
        }

        this.power_user_credits_table.innerHTML = html;
    }
    /** */
    initPowerUserCalcSelects() {
        const models = SharedWithBackend.getModels();
        const modelNames = Object.keys(models);
        let html = "";
        modelNames.forEach((model: string) => {
            html += `<option>${model}</option>`;
        });

        this.primary_model_select.innerHTML = html;
        this.secondary_model_select.innerHTML = html;
        this.secondary_model_select.selectedIndex = 2;
    }
}
