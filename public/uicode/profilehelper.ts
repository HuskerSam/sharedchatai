import Utility from "./utility";
import BaseApp from "./baseapp";
import AccountHelper from "./accounthelper";
import {
    ref,
    getStorage,
    getDownloadURL,
    uploadBytes,
} from "firebase/storage";
import {
    doc,
    setDoc,
    getFirestore,
} from "firebase/firestore";
import {
    signOut,
    getAuth,
    updateEmail,
} from "firebase/auth";
import {
    getApp,
} from "firebase/app";
import SlimSelect from "slim-select";

/** Base class for all pages - handles authorization and low level routing for api calls, etc */
export default class ProfileHelper {
    app: any = null;
    modal_close_button: any = null;
    modalContainer: any = null;
    profile_modal_logged_in_status: any;
    sign_out_button: any;
    reset_profile: any;
    profile_display_name: any;
    profile_display_image: any;
    profile_display_image_upload: any;
    file_upload_input: any;
    profile_display_image_clear: any;
    profile_display_image_randomize: any;
    randomize_name: any;
    preset_logos_inited = false;
    prompt_for_new_user_name: any;
    profile_text_large_checkbox: any;
    profile_text_monospace_checkbox: any;
    profile_autoexclude_checkbox: any;
    profile_enablekatex_checkbox: any;
    profile_enablekatexinline_checkbox: any;
    profile_new_email: any;
    change_email_button: any;
    lastLabelsSave = 0;
    replies_row: any;
    prompts_row: any;
    total_row: any;
    credits_row: any;
    nite_mode_input: any;
    profile_labels_tab_button: any;
    available_balance: any;
    change_subscription: any;
    tokenUsageUpdates = false;
    modal: any = null;
    usage_select_view: any;
    usage_view_this_month: any;
    usage_view_last_month: any;
    usage_view_2_monthago: any;
    currentMonth = new Date();
    lastMonth = new Date();
    lastMonth2 = new Date();
    usageStatsTabInited = false;
    usage_viewer: any;
    slimSelect: SlimSelect;

    /**
     * @param { any } app BaseApp derived application instance
     */
    constructor(app: any) {
        this.app = app;
        const html = this.getModalTemplate();
        this.modalContainer = document.createElement("div");
        this.modalContainer.innerHTML = html;
        document.body.appendChild(this.modalContainer);
        this.modal = new (<any>window).bootstrap.Modal("#userProfileModal", {});

        this.modalContainer.children[0].addEventListener("shown.bs.modal", () => {
            // this.profile_text_large_checkbox.focus();
        });

        this.modalContainer.children[0].addEventListener("hidden.bs.modal", () => {
            if (this.app.paintLabelSelect) this.app.paintLabelSelect();
            if (this.app.updateSessionFeed) {
                this.app.dashboard_documents_view.innerHTML = "";
                this.app.updateSessionFeed();
            }
        });

        this.modal_close_button = this.modalContainer.querySelector(".modal_close_button");

        this.profile_modal_logged_in_status = document.querySelector(".profile_modal_logged_in_status");
        this.sign_out_button = document.querySelector(".sign_out_button");
        this.reset_profile = document.querySelector(".reset_profile");
        this.profile_display_name = document.querySelector(".profile_display_name");
        this.profile_display_image = document.querySelector(".profile_display_image");
        this.profile_display_image_upload = document.querySelector(".profile_display_image_upload");
        this.file_upload_input = document.querySelector(".file_upload_input");
        this.profile_display_image_clear = document.querySelector(".profile_display_image_clear");
        this.randomize_name = document.querySelector(".randomize_name");
        this.profile_text_monospace_checkbox = document.querySelector(".profile_text_monospace_checkbox");
        this.profile_autoexclude_checkbox = document.querySelector(".profile_autoexclude_checkbox");
        this.profile_enablekatex_checkbox = document.querySelector(".profile_enablekatex_checkbox");
        this.profile_enablekatexinline_checkbox = document.querySelector(".profile_enablekatexinline_checkbox");
        this.replies_row = document.querySelector(".replies_row");
        this.prompts_row = document.querySelector(".prompts_row");
        this.total_row = document.querySelector(".total_row");
        this.credits_row = document.querySelector(".credits_row");
        this.available_balance = this.modalContainer.querySelector(".available_balance");
        this.change_subscription = this.modalContainer.querySelector(".change_subscription");
        this.change_subscription.addEventListener("click", () => {
            this.modal.hide();
            this.app.buyCredits.show();
        });

        this.profile_text_large_checkbox = document.querySelector(".profile_text_large_checkbox");
        this.profile_display_image_randomize = document.querySelector(".profile_display_image_randomize");
        this.profile_display_image_randomize.addEventListener("click", () => this.randomizeImage());

        this.profile_new_email = document.querySelector(".profile_new_email");
        this.change_email_button = document.querySelector(".change_email_button");
        this.change_email_button.addEventListener("click", () => this.changeEmail());

        this.prompt_for_new_user_name = document.querySelector(".prompt_for_new_user_name");
        this.prompt_for_new_user_name.addEventListener("click", () => this.promptForNewUserName());
        this.profile_text_large_checkbox = document.querySelector(".profile_text_large_checkbox");

        this.sign_out_button.addEventListener("click", (e: any) => {
            if (!confirm("Are you sure you want to signout?")) return;
            this.authSignout(e);
            e.preventDefault();
            return false;
        });

        this.reset_profile.addEventListener("click", (e: any) => {
            if (confirm("Are you sure you want to clear out all reviews and profile data?")) {
                this.app._authCreateDefaultProfile();
            }
            e.preventDefault();
            return true;
        });

        this.profile_display_image_upload.addEventListener("click", () => this.uploadProfileImage());
        this.file_upload_input.addEventListener("input", () => this.fileUploadSelected());
        this.profile_display_image_clear.addEventListener("click", () => this.clearProfileImage());
        this.randomize_name.addEventListener("click", () => this.randomizeProfileName());
        this.prompt_for_new_user_name.addEventListener("click", () => this.saveProfileField("name"));
        this.profile_text_monospace_checkbox.addEventListener("input", () => this.saveProfileField("monospace"));
        this.profile_autoexclude_checkbox.addEventListener("input", () => this.saveProfileField("autoExclude"));
        this.profile_enablekatex_checkbox.addEventListener("input", () => {
            this.saveProfileField("enableKatex");
            if (this.app.updateAssistsFeed) this.app.updateAssistsFeed();
        });
        this.profile_enablekatexinline_checkbox.addEventListener("input", () => {
            this.saveProfileField("enableKatexInline");
            if (this.app.updateAssistsFeed) this.app.updateAssistsFeed();
        });

        this.profile_text_large_checkbox.addEventListener("input", () => this.saveProfileField("largetext"));

        this.slimSelect = new SlimSelect({
            select: ".label_profile_picker",
            events: {
                afterChange: () => this.saveProfileLabels(),
                addable: (value: string): string | false => {
                    if (value === "") return false;
                    return value;
                },
            },
            settings: {
                placeholderText: "Configure default labels",
                hideSelected: true,
                searchPlaceholder: "Add Labels",
                allowDeselect: true,
                closeOnSelect: false,
                searchText: "",
            },
        });

        this.nite_mode_input = document.querySelector(".nite_mode_input");
        this.nite_mode_input.addEventListener("input", () => this.app.toggleDayMode(this.nite_mode_input.checked));
        this.profile_labels_tab_button = document.querySelector("#profile_labels_tab_button");

        this.usage_select_view = this.modalContainer.querySelector(".usage_select_view");
        this.usage_view_this_month = this.modalContainer.querySelector(".usage_view_this_month");
        this.usage_view_last_month = this.modalContainer.querySelector(".usage_view_last_month");
        this.usage_view_2_monthago = this.modalContainer.querySelector(".usage_view_2_monthago");
        this.usage_viewer = this.modalContainer.querySelector(".usage_viewer");
    }
    /** pick a random college logo for the profile image and save to firebase */
    async randomizeImage() {
        const profileLogos = await BaseApp.readJSONFile(`/data/logos.json`);
        const keys = Object.keys(profileLogos);
        const imageIndex = Math.floor(Math.random() * keys.length);
        const logoName = keys[imageIndex];
        this.app.profile.displayImage = profileLogos[logoName];
        this.app.updateUserNamesImages();
        this.saveProfileField("image");
    }
    /** template as string for modal
     * @return { string } html template as string
     */
    getModalTemplate(): string {
        return `<div class="modal fade" data-bs-focus="false"
         id="userProfileModal" tabindex="-1" aria-labelledby="userProfileModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content app_panel">
                <div class="modal-header">
                    <h5 class="modal-title" id="userProfileModalLabel" style="display:flex;flex-direction:row;width:100%;overflow:hidden;">
                        <span class="dialog_header_icon"><i class="material-icons">account_circle</i></span>
                        <span class="profile_modal_logged_in_status" style="flex:1"></span>
                        <a class="btn btn-secondary show_modal_profile_help" href="/help/#profile" target="help"><i
                        class="material-icons">help_outline</i></a>
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="summary_panel" style="display:flex;flex-direction:row">
                        <div style="flex:1">
                            Credits Available: <span class="summary_column available_balance">0</span>
                        </div>
                        <div>                        
                            <button class="btn btn-primary change_subscription">Buy Credits</button>
                        </div>
                    </div>
                    <ul class="nav nav-tabs mb-3" role="tablist">
                        <li class="nav-item" role="presentation">
                            <a class="nav-link active" id="profile_user_tab_button" data-bs-toggle="tab"
                                href="#profile_user_tab_view" role="tab" aria-controls="profile_user_tab_view"
                                aria-selected="true">User</a>
                        </li>
                        <li class="nav-item" role="presentation">
                            <a class="nav-link" id="profile_labels_tab_button" data-bs-toggle="tab"
                                href="#profile_user_labels_view" role="tab" aria-controls="profile_user_labels_view"
                                aria-selected="false">Usage</a>
                        </li>
                        <li class="nav-item" role="presentation">
                            <a class="nav-link account_tab_button" id="usage_labels_tab_button" data-bs-toggle="tab"
                                href="#profile_user_usage_view" role="tab" aria-controls="profile_user_usage_view"
                                aria-selected="false">Account</a>
                        </li>
                    </ul>
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="profile_user_tab_view" role="tabpanel"
                            aria-labelledby="profile_user_tab_button">
                            <div>
                                <div style="display:flex;flex-direction:row;width:100%;">
                                    <div class="profile_display_name member_profile_name"></div>
                                    <div>
                                        <button class="btn btn-secondary prompt_for_new_user_name">
                                            <i class="material-icons">edit</i>
                                        </button>
                                    </div>
                                    <div>
                                        <button class="randomize_name btn btn-secondary">
                                            <i class="material-icons">casino</i>
                                            Generate
                                        </button>
                                    </div>
                                </div>
                                <div style="line-height: 3.5em;">
                                    <div class="profile_display_image member_profile_image"></div>
                                    <input type="file" class="file_upload_input" style="display:none;">
                                    <button class="profile_display_image_clear btn btn-secondary">
                                        <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20">
                                            <path fill="currentColor" d="M261-120q-24.75 
                                            0-42.375-17.625T201-180v-570h-41v-60h188v-30h264v30h188v60h-41v570q0 
                                            24-18 42t-42 18H261Zm438-630H261v570h438v-570ZM367-266h60v-399h-60v399Zm166 
                                            0h60v-399h-60v399ZM261-750v570-570Z"/>
                                        </svg>
                                    </button>
                                    <button class="profile_display_image_randomize btn btn-secondary">
                                        <i class="material-icons">casino</i>
                                    </button>
                                    <button class="profile_display_image_upload btn btn-secondary">
                                        <i class="material-icons">upload_file</i>
                                        Upload</button>
                                </div>
                            </div>
                            <hr>
                            <div style="font-size: 1.25em;text-align:center"> 
                                <label class="form-check-label">
                                    <input class="form-check-input profile_text_large_checkbox" type="checkbox" value="">
                                    Large Text
                                </label>
                                <label class="form-check-label">
                                    <input class="form-check-input profile_text_monospace_checkbox" type="checkbox"
                                        value="">
                                    Monospace
                                </label>
                                <label class="form-check-label">
                                    <input class="form-check-input profile_autoexclude_checkbox" type="checkbox" value="">
                                    Auto Exclude
                                </label>
                                <label class="form-check-label">
                                    <input class="form-check-input profile_enablekatex_checkbox" type="checkbox" value="">
                                    KaTeX
                                </label>
                                <label class="form-check-label">
                                    <input class="form-check-input profile_enablekatexinline_checkbox" type="checkbox" value="">
                                    KaTeX Inline
                                </label>
                                    <label class="form-check-label">
                                    <input class="form-check-input nite_mode_input" type="checkbox" value="">
                                    Nite Mode
                                </label>   
                            </div>
                            <hr style="margin-top:-8px;">
                            <label class="form-label">Default Labels - [Enter] to add</label>
                            <br>
                            <select class="label_profile_picker" multiple="multiple"></select>
                            <hr>
                            <a class="btn btn-secondary" href="/embedding">Open Embedding</a>
                        </div>
                        <div class="tab-pane fade" id="profile_user_labels_view" style="min-height:10em;" role="tabpanel"
                            aria-labelledby="profile_labels_tab_button">
                            <select class="form-select usage_select_view"></select>
                            <div class="usage_viewer">
                                <div class="usage_view_summary">
                                    <table class="chat_token_usage_display number">
                                        <tr>
                                            <th></th>
                                            <th>Day</th>
                                            <th>Month</th>
                                            <th>Year</th>
                                            <th>All Time</th>
                                        </tr>
                                        <tr class="replies_row"></tr>
                                        <tr class="prompts_row"></tr>
                                        <tr class="total_row"></tr>
                                        <tr class="credits_row"></tr>
                                    </table>
                                </div>
                                <div class="usage_view_this_month"></div>
                                <div class="usage_view_last_month"></div>
                                <div class="usage_view_2_monthago"></div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="profile_user_usage_view" role="tabpanel"
                            aria-labelledby="usage_labels_tab_button">
                            Refer to <a href="/help" target="_blank">help</a> before proceeding
                            <div class="change_email_panel">
                                <input type="text" class="form-control profile_new_email" placeholder="New Email">
                                <button class="change_email_button btn btn-secondary">Change Email</button>        
                            </div>
                            <hr>
                            <div class="">
                                <a class="" href="mailto:support@unacog.com" target="_blank">support@unacog.com</a>        
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="sign_out_button btn btn-secondary">
                        <i class="material-icons">logout</i>
                        Sign Out
                    </button>
                    <div style="flex:1"></div>
                    <button class="reset_profile btn btn-secondary" style="display:none">Reset</button>
                    <button type="button" class="btn btn-secondary modal_close_button" data-bs-dismiss="modal">
                        <i class="material-icons">cancel</i>
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    }
    /** open file picker for custom profile image upload */
    uploadProfileImage() {
        this.file_upload_input.click();
    }
    /** handle local profile image selected for upload and store it */
    async fileUploadSelected() {
        if (!this.file_upload_input.files[0]) return;
        const file = this.file_upload_input.files[0];
        const reader = new FileReader();
        let resultFile: any = null;
        reader.onload = (e: any) => {
            const img = document.createElement("img");

            img.onload = async () => {
                // Dynamically create a canvas element
                const canvas: any = document.createElement("canvas");
                canvas.width = 300;
                canvas.height = 300;

                // var canvas = document.getElementById("canvas");
                const ctx: any = canvas.getContext("2d");

                // Actual resizing
                const width = img.width;
                const height = img.height;
                let w = 300;
                let h = 300;
                let left = 0;
                let top = 0;
                if (width > height) {
                    w = 300;
                    h = 300 * height / width;
                    top = (300 - h) / 2;
                }
                if (height > width) {
                    h = 300;
                    w = 300 * width / height;
                    left = (300 - w) / 2;
                }
                ctx.drawImage(img, left, top, w, h);

                // Show resized image in preview element
                const dataurl = canvas.toDataURL("image/png");

                resultFile = this.dataURLtoFile(dataurl, "pimage.png");

                this.profile_display_image.style.backgroundImage = ``;
                const storage = getStorage(getApp());
                const sRef = ref(storage, "Users/" + this.app.uid + "/pimage");
                await uploadBytes(sRef, resultFile);
                setTimeout(() => this._finishImagePathUpdate(), 1500);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    /**
     * @param { string } dataurl
     * @param { string } filename
     * @return { any } file dom obj
     */
    dataURLtoFile(dataurl: string, filename: string) {
        const arr: any = dataurl.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {
            type: mime,
        });
    }
    /** handle profile image upload complete
     */
    async _finishImagePathUpdate() {
        const storage = getStorage(getApp());
        const sRef2 = ref(storage, "Users/" + this.app.uid + "/pimage");
        const resizePath = await getDownloadURL(sRef2);
        const updatePacket = {
            displayImage: resizePath,
        };
        if (getAuth().currentUser) {
            const profileRef = doc(getFirestore(), `Users/${this.app.uid}`);
            await setDoc(profileRef, updatePacket, {
                merge: true,
            });
        }
        this.app.updateUserNamesImages();
    }
    /** reset profile image (and store result in user profile) */
    async clearProfileImage() {
        const updatePacket = {
            displayImage: "",
        };
        if (getAuth().currentUser) {
            const profileRef = doc(getFirestore(), `Users/${getAuth().currentUser?.uid}`);
            await setDoc(profileRef, updatePacket, {
                merge: true,
            });
        }
        this.app.profile.displayImage = "";
        this.app.updateUserNamesImages();
    }
    /** generate a random "safe" name */
    async randomizeProfileName(): Promise<void> {
        const name = Utility.generateName();
        this.profile_display_name.innerHTML = name;
        this.app.profile.displayName = name;
        this.saveProfileField("name");
    }
    /** show window.prompt to get a new user name, cancel is no sve, empty string is valid */
    async promptForNewUserName() {
        let newName = prompt("New User Name", this.app.profile.displayName);
        if (newName !== null) {
            newName = newName.trim().replace(/[\W]+/g, " ");
            this.app.profile.displayName = newName.trim().substring(0, 30);
            this.profile_display_name.innerHTML = this.app.profile.displayName;
            this.saveProfileField("name");
        }
    }
    /** get user label pick list comma delimited
   * @return { string } label list
   */
    scrapeLabelList(): string {
        const data = this.slimSelect.getData();
        const labels: Array<string> = [];
        data.forEach((item: any) => {
            if (item.selected) {
                const text = item.text.trim().replaceAll(",", "").substring(0, 30);
                if (text) labels.push(text);
            }
        });

        return labels.join(",");
    }
    /** scrape and save label list */
    saveProfileLabels() {
        this.app.profile.documentLabels = this.scrapeLabelList();
        this.saveProfileField("labels");
    }
    /**
     * @param { string } fieldType name for displayName, largetext for textOptionsLarge, monospace for textOptionsMonospace,
     * labels for documentLabels, image for displayImage
     */
    async saveProfileField(fieldType: string) {
        const updatePacket: any = {};

        if (fieldType === "name") {
            updatePacket.displayName = this.app.profile.displayName;
        }
        if (fieldType === "monospace") {
            this.app.profile.textOptionsMonospace = this.profile_text_monospace_checkbox.checked;
            updatePacket.textOptionsMonospace = this.app.profile.textOptionsMonospace;
        }
        if (fieldType === "largetext") {
            this.app.profile.textOptionsLarge = this.profile_text_large_checkbox.checked;
            updatePacket.textOptionsLarge = this.app.profile.textOptionsLarge;
        }
        if (fieldType === "labels") {
            updatePacket.documentLabels = this.app.profile.documentLabels;
        }
        if (fieldType === "image") {
            updatePacket.displayImage = this.app.profile.displayImage;
        }
        if (fieldType === "autoExclude") {
            this.app.profile.autoExclude = this.profile_autoexclude_checkbox.checked;
            updatePacket.autoExclude = this.app.profile.autoExclude;
        }
        if (fieldType === "enableKatex") {
            this.app.profile.enableKatex = this.profile_enablekatex_checkbox.checked;
            updatePacket.enableKatex = this.app.profile.enableKatex;
        }
        if (fieldType === "enableKatexInline") {
            this.app.profile.enableKatexInline = this.profile_enablekatexinline_checkbox.checked;
            updatePacket.enableKatexInline = this.app.profile.enableKatexInline;
        }

        if (getAuth().currentUser) {
            const profileRef = doc(getFirestore(), `Users/${this.app.uid}`);
            await setDoc(profileRef, updatePacket, {
                merge: true,
            });
        }
    }
    /** signout of firebase authorization
     * @param { any } e dom event
     */
    async authSignout(e: any) {
        e.preventDefault();
        if (getAuth().currentUser) {
            this.app.removeUserPresenceWatch();
            await signOut(getAuth());

            this.app.uid = null;

            if (!this.app.showLoginModal) window.location.reload();
            else window.location.href = "/";
        }
    }
    /** fetch and paint user token usage */
    async updateTokenUsage() {
        if (this.tokenUsageUpdates) return;
        this.tokenUsageUpdates = true;
        AccountHelper.accountInfoUpdate(this.app, (usageData: any) => {
            this.replies_row.innerHTML = `<th>Reply</th><td class="day_td">${usageData.dailyCompletionTokens}</td>` +
                `<td class="monthly_td">${usageData.monthlyCompletionTokens}</td>` +
                `<td class="yearly_td">${usageData.yearlyCompletionTokens}</td>` +
                `<td class="all_time_td">${usageData.allTimeCompletionTokens}</td>`;
            this.prompts_row.innerHTML = `<th>Sent</th><td class="day_td">${usageData.dailyPromptTokens}</td>` +
                `<td class="monthly_td">${usageData.monthlyPromptTokens}</td>` +
                `<td class="yearly_td">${usageData.yearlyPromptTokens}</td>` +
                `<td class="all_time_td">${usageData.allTimePromptTokens}</td>`;
            this.total_row.innerHTML = `<th>Total</th><td class="day_td">${usageData.dailyTotalTokens}</td>` +
                `<td class="monthly_td">${usageData.monthlyTotalTokens}</td>` +
                `<td class="yearly_td">${usageData.yearlyTotalTokens}</td>` +
                `<td class="all_time_td">${usageData.allTimeTotalTokens}</td>`;
            this.credits_row.innerHTML = `<th>Credits</th><td class="day_td">${usageData.dailyCreditUsage}</td>` +
                `<td class="monthly_td">${usageData.monthlyCreditUsage}</td>` +
                `<td class="yearly_td">${usageData.yearlyCreditUsage}</td>` +
                `<td class="all_time_td">${usageData.allTimeCreditUsage}</td>`;
            this.available_balance.innerHTML = Math.round(usageData.availableCreditBalance);

            this.usage_view_this_month.innerHTML = this.getUsageTable(this.currentMonth, usageData.runningTokens);
            this.usage_view_last_month.innerHTML = this.getUsageTable(this.lastMonth, usageData.runningTokens);
            this.usage_view_2_monthago.innerHTML = this.getUsageTable(this.lastMonth2, usageData.runningTokens);
        });
    }
    /**
     * @param { Date } d month/year
     * @param { any } runningTokens server side stats
     * @return { string } html table rows
     */
    getUsageTable(d: Date, runningTokens: any): string {
        let html = `<table class="number" style="width:100%;">
        <tr>
            <th></th>
            <th>Credits</th>
            <th>Tokens</th>
            <th>Prompts</th>
            <th>Responses</th>
        </tr>`;
        const start = 1;
        const lastD = new Date(2008, d.getMonth() + 1, 0);
        const last = lastD.getDate();

        const iso = d.toISOString();
        const yearMonthFrag = iso.substring(0, 7);

        const mTotal = BaseApp.numberWithCommas(runningTokens["total_" + yearMonthFrag]);
        const mPrompt = BaseApp.numberWithCommas(runningTokens["prompt_" + yearMonthFrag]);
        const mCompletion = BaseApp.numberWithCommas(runningTokens["completion_" + yearMonthFrag]);
        const mCredits = BaseApp.numberWithCommas(runningTokens["credit_" + yearMonthFrag]);
        const mon = d.toLocaleString("en-us", {
            month: "short",
        });
        html += `<tr><th>${mon}</th><td>${mCredits}</td><td>${mTotal}</td><td>${mPrompt}</td><td>${mCompletion}</td></tr>`;
        const today = new Date().toISOString().substring(0, 10);
        for (let c = start; c <= last; c++) {
            const cD = new Date(d);
            cD.setDate(c);
            const iso = cD.toISOString();
            const ymdFrag = iso.substring(0, 10);
            let dTotal = BaseApp.numberWithCommas(runningTokens["total_" + ymdFrag]);
            let dPrompt = BaseApp.numberWithCommas(runningTokens["prompt_" + ymdFrag]);
            let dCompletion = BaseApp.numberWithCommas(runningTokens["completion_" + ymdFrag]);
            let dCredits = BaseApp.numberWithCommas(runningTokens["credit_" + ymdFrag]);

            if (ymdFrag > today) {
                dTotal = "";
                dPrompt = "";
                dCompletion = "";
                dCredits = "";
            }

            html += `<tr><th>${c}</th><td>${dCredits}</td><td>${dTotal}</td><td>${dPrompt}</td><td>${dCompletion}</td></tr>`;
        }

        html += `</table>`;
        return html;
    }
    /** populate modal fields and show
     * @param { boolean } showAccountTab
    */
    async show(showAccountTab = false) {
        let displayName = this.app.profile.displayName;
        if (!displayName) displayName = "New User";
        this.profile_display_name.innerHTML = displayName;

        let email = getAuth().currentUser?.email;
        if (!email) email = "Logged in as: Anonymous";

        this.profile_modal_logged_in_status.innerHTML = email;

        let profileLabelsPacked = this.app.profile.documentLabels;
        if (!profileLabelsPacked) profileLabelsPacked = "";
        const profileLabels = profileLabelsPacked.split(",");
        const selectItems: any[] = [];
        profileLabels.forEach((label: string) => {
            if (label) {
                selectItems.push({
                    text: label,
                    selected: true,
                });
            }
        });
        this.slimSelect.setData(selectItems);

        this.profile_text_large_checkbox.checked = (this.app.profile.textOptionsLarge === true);
        this.profile_text_monospace_checkbox.checked = (this.app.profile.textOptionsMonospace === true);
        this.profile_autoexclude_checkbox.checked = (this.app.profile.autoExclude === true);
        this.profile_enablekatex_checkbox.checked = (this.app.profile.enableKatex === true);
        this.profile_enablekatexinline_checkbox.checked = (this.app.profile.enableKatexInline === true);
        this.profile_display_image.setAttribute("uid", this.app.uid);
        this.profile_display_name.setAttribute("uid", this.app.uid);
        this.nite_mode_input.checked = (this.app.themeIndex === 1);

        this.updateUsageStatsTab();
        this.app.updateUserNamesImages();
        this.updateTokenUsage();
        if (showAccountTab) this.profile_labels_tab_button.click();
        this.modal.show();
    }
    /** */
    updateUsageStatsTab() {
        if (this.usageStatsTabInited) return;
        this.usageStatsTabInited = true;

        let selectHTML = `<option value="show_usage_summary">Summary</option>`;
        this.currentMonth = new Date();
        const currentMonthStr = this.currentMonth.toLocaleString("en-us", {
            month: "short",
            year: "numeric",
        });
        this.lastMonth = new Date();
        this.lastMonth.setMonth(new Date().getMonth() - 1);
        const lastMonthStr = this.lastMonth.toLocaleString("en-us", {
            month: "short",
            year: "numeric",
        });
        this.lastMonth2 = new Date();
        this.lastMonth2.setMonth(new Date().getMonth() - 2);
        const lastMonth2Str = this.lastMonth2.toLocaleString("en-us", {
            month: "short",
            year: "numeric",
        });
        selectHTML += `<option value="show_usage_this_month">${currentMonthStr}</option>`;
        selectHTML += `<option value="show_usage_last_month">${lastMonthStr}</option>`;
        selectHTML += `<option value="show_usage_last_month2">${lastMonth2Str}</option>`;
        this.usage_select_view.innerHTML = selectHTML;
        this.usage_select_view.selectedIndex = 0;
        this.usage_select_view.addEventListener("input", () => this.updateUsageView());
        this.updateUsageView();
    }
    /** */
    updateUsageView() {
        this.usage_viewer.setAttribute("class", this.usage_select_view.value);
    }
    /** */
    async changeEmail() {
        const newEmail = this.profile_new_email.value.trim();

        if (newEmail === "") {
            alert("Must supply a new email");
            return;
        }

        const oldEmail = getAuth().currentUser?.email;
        if (newEmail === oldEmail) {
            alert("Email is already " + oldEmail);
            return;
        }

        if (!confirm(`Are you sure you want to change your email to ${newEmail} from ${oldEmail}?`)) {
            return;
        }

        let success = true;
        try {
            await updateEmail(<any>getAuth().currentUser, newEmail);
        } catch (error: any) {
            success = false;
            alert("email change FAILED: \n" + error.message);
        }

        if (success) {
            this.app.removeUserPresenceWatch();
            if (getAuth().currentUser) await signOut(getAuth());

            this.app.uid = null;
            window.location.href = "/";
            window.location.reload();
        }
    }
}

