import Utility from "./utility.js";
import BaseApp from "./baseapp.js";
declare const firebase: any;
declare const window: any;

/** Base class for all pages - handles authorization and low level routing for api calls, etc */
export default class ProfileHelper {
    app: any = null;
    modal_close_button: any = null;
    modalContainer: any = null;
    logged_in_status: any;
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
    profile_disablekatex_checkbox: any;
    profile_new_email: any;
    change_email_button: any;
    lastLabelsSave = 0;
    noLabelSave = true;
    replies_row: any;
    prompts_row: any;
    total_row: any;
    credits_row: any;
    monthly_tokens_usage: any;
    noAuthPage = false;

    /**
     * @param { any } app BaseApp derived application instance
     */
    constructor(app: any) {
        this.app = app;
        const html = this.getModalTemplate();
        this.modalContainer = document.createElement("div");
        this.modalContainer.innerHTML = html;
        document.body.appendChild(this.modalContainer);
        this.modalContainer.children[0].addEventListener("shown.bs.modal", () => {
            // this.profile_text_large_checkbox.focus();
        });

        this.modalContainer.children[0].addEventListener("hidden.bs.modal", () => {
            if (this.app.paintLabelSelect) this.app.paintLabelSelect();
        });

        this.modal_close_button = this.modalContainer.querySelector(".modal_close_button");

        this.logged_in_status = document.querySelector(".logged_in_status");
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
        this.profile_disablekatex_checkbox = document.querySelector(".profile_disablekatex_checkbox");
        this.replies_row = document.querySelector(".replies_row");
        this.prompts_row = document.querySelector(".prompts_row");
        this.total_row = document.querySelector(".total_row");
        this.credits_row = document.querySelector(".credits_row");
        this.monthly_tokens_usage = document.querySelector(".monthly_tokens_usage");

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
        this.profile_disablekatex_checkbox.addEventListener("input", () => {
            this.saveProfileField("disableKatex");
            if (this.app.updateAssistsFeed) this.app.updateAssistsFeed();
        });
        this.profile_text_large_checkbox.addEventListener("input", () => this.saveProfileField("largetext"));

        window.$(".label_profile_picker").select2({
            tags: true,
            placeHolder: "Configure default labels",
        });
        window.$(".label_profile_picker").on("change", () => this.saveProfileLabels());
        const field: any = document.body.querySelector("#profile_user_labels_view .select2-search__field");
        field.addEventListener("keydown", (event: any) => {
            if (event.key === ",") {
                event.preventDefault();
                event.stopPropagation();
            }
        });
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
        return `<div class="modal fade" id="userProfileModal" tabindex="-1" aria-labelledby="userProfileModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content app_panel">
                <div class="modal-header">
                    <h5 class="modal-title" id="userProfileModalLabel" style="display:flex;flex-direction:row;width:100%;overflow:hidden;">
                        <span class="dialog_header_icon"><i class="material-icons">account_circle</i></span>
                        <span class="logged_in_status" style="flex:1"></span>
                        <a class="btn btn-secondary show_modal_profile_help" href="/help/#profile" target="help"><i
                        class="material-icons">help_outline</i></a>
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <ul class="nav nav-tabs mb-3" id="ex1" role="tablist">
                        <li class="nav-item" role="presentation">
                            <a class="nav-link active" id="profile_user_tab_button" data-bs-toggle="tab"
                                href="#profile_user_tab_view" role="tab" aria-controls="profile_user_tab_view"
                                aria-selected="true">User</a>
                        </li>
                        <li class="nav-item" role="presentation">
                            <a class="nav-link" id="profile_labels_tab_button" data-bs-toggle="tab"
                                href="#profile_user_labels_view" role="tab" aria-controls="profile_user_labels_view"
                                aria-selected="false">Labels</a>
                        </li>
                        <li class="nav-item" role="presentation">
                            <a class="nav-link" id="usage_labels_tab_button" data-bs-toggle="tab"
                                href="#profile_user_usage_view" role="tab" aria-controls="profile_user_usage_view"
                                aria-selected="false">Account</a>
                        </li>
                    </ul>
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="profile_user_tab_view" role="tabpanel"
                            aria-labelledby="profile_user_tab_button">
                            <div>
                                <label class="form-label">Name and Image</label>
                                <br>
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
                                <div style="line-height: 4em;margin-top:-18px">
                                    <div class="profile_display_image member_profile_image"
                                        style=""></div>
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
                                    <input class="form-check-input profile_disablekatex_checkbox" type="checkbox" value="">
                                    Disable KaTeX
                                </label>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="profile_user_labels_view" style="min-height:10em; role=" tabpanel"
                            aria-labelledby="profile_labels_tab_button">
    
                            <label class="form-label">Default Labels - [Enter] to add</label>
                            <br>
                            <select class="label_profile_picker" multiple="multiple"
                                style="width:95%;min-height:6em"></select>
                            <br>
                        </div>
                        <div class="tab-pane fade" id="profile_user_usage_view" role="tabpanel"
                            aria-labelledby="usage_labels_tab_button">
                            <div class="form-label">Monthly Prompt+ Credits Usage</div>
                            <div class="summary_panel">
                                Credits Used: <span class="summary_column monthly_tokens_usage">0</span>
                                <br>
                                Monthly Limit: <span class="summary_column">20,000,000</span>
                            </div>
                            <hr>
                            <div class="form-label">Token Usage History</div>
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
                            <hr>
                            <table>
                                <tr>
                                    <td>Subscription Level: &nbsp;</td>
                                    <td class="account_subscription_status">Pre Release</td>
                                </tr>
                            </table>
                            <br>
                            <div class="subscription_panel">
                                <div class="free_subscription selected">
                                    Try out<br>
                                    Unlimited Sharing<br>
                                    50 thousand tokens<br>
                                    Monthly<br>
                                    Free<br>
                                    <button class="btn btn-secondary">
                                    <i class="material-icons">upgrade</i>
                                    Downgrade</button>
                                </div>
                                <div class="prompter_subscription">
                                    Prompter<br>
                                    Unlimited Sharing<br>
                                    20 million tokens<br>
                                    Monthly<br>
                                    $20<br>
                                    <button class="btn btn-primary">
                                    <i class="material-icons">upgrade</i>
                                    Upgrade</button>
                                </div>
                            </div>
                            <div class="subscription_panel">
                                <div class="teacher_subscription">
                                    Collaborator<br>
                                    Unlimited Sharing<br>
                                    100 million tokens<br>
                                    Monthly<br>
                                    $50<br>
                                    <button class="btn btn-primary">
                                    <i class="material-icons">upgrade</i>
                                    Upgrade</button>
                                </div>
                                <div class="one_time_token_purchase">
                                    Reserve Tokens<br>
                                    No expiration<br>
                                    10 million tokens<br>
                                    One time<br>
                                    $20<br>
                                    <button class="btn btn-primary">
                                        <i class="material-icons">attach_money</i>
                                        Purchase
                                    </button>
                                </div>
                            </div>
                            <hr>
                            <div class="change_email_panel">
                                <div style="text-align:center;font-weight: bold;line-height:2.5em;font-size:.75em;">
                                    <span class="user_email"></span>
                                </div>
                                <div class="form-label">New Email</div>
                                <input type="text" class="form-control profile_new_email" placeholder="New Email">
                                <div style="text-align:right;line-height:3em;">
                                    <button class="change_email_button btn btn-secondary">Change Email</button>
                                </div>         
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
                const sRef = firebase.storage().ref("Users").child(this.app.uid + "/pimage");
                await sRef.put(resultFile);
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
        const sRef2 = firebase.storage().ref("Users").child(this.app.uid + "/pimage");
        const resizePath = await sRef2.getDownloadURL();
        const updatePacket = {
            displayImage: resizePath,
        };
        if (this.app.fireToken) {
            await firebase.firestore().doc(`Users/${this.app.uid}`).set(updatePacket, {
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
        if (this.app.fireToken) {
            await firebase.firestore().doc(`Users/${this.app.uid}`).set(updatePacket, {
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
        const data = window.$(".label_profile_picker").select2("data");
        const labels: Array<string> = [];
        data.forEach((item: any) => {
            const text = item.text.trim().replaceAll(",", "").substring(0, 30);
            if (text) labels.push(text);
        });

        return labels.join(",");
    }
    /** scrape and save select2 label list */
    saveProfileLabels() {
        if (this.noLabelSave) return;
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
        if (fieldType === "disableKatex") {
            this.app.profile.disableKatex = this.profile_disablekatex_checkbox.checked;
            updatePacket.disableKatex = this.app.profile.disableKatex;
        }

        if (this.app.fireToken) {
            await firebase.firestore().doc(`Users/${this.app.uid}`).set(updatePacket, {
                merge: true,
            });
        }
    }
    /** signout of firebase authorization
     * @param { any } e dom event
     */
    async authSignout(e: any) {
        e.preventDefault();
        if (this.app.fireToken) {
            this.app.removeUserPresenceWatch();
            await firebase.auth().signOut();

            this.app.fireToken = null;
            this.app.fireUser = null;
            this.app.uid = null;

            if (this.noAuthPage) window.location.reload();
            else window.location = "/";
        }
    }
    /** fetch and paint user token usage */
    async updateTokenUsage() {
        // lookup usage stats
        const usageDoc = await firebase.firestore().doc(`Users/${this.app.uid}/internal/tokenUsage`).get();
        let usageData = usageDoc.data();
        if (!usageData) usageData = {};

        const today = new Date().toISOString();
        const yearFrag = today.substring(0, 4);
        const yearMonthFrag = today.substring(0, 7);
        const ymdFrag = today.substring(0, 10);
        let runningTokens: any = {};
        if (usageData.runningTokens) runningTokens = usageData.runningTokens;

        const allTimeTotalTokens = BaseApp.numberWithCommas(usageData.totalTokens);
        const allTimePromptTokens = BaseApp.numberWithCommas(usageData.promptTokens);
        const allTimeCompletionTokens = BaseApp.numberWithCommas(usageData.completionTokens);
        const allTimeCreditUsage = BaseApp.numberWithCommas(usageData.creditUsage, 2);

        const yearlyTotalTokens = BaseApp.numberWithCommas(runningTokens["total_" + yearFrag]);
        const yearlyPromptTokens = BaseApp.numberWithCommas(runningTokens["prompt_" + yearFrag]);
        const yearlyCompletionTokens = BaseApp.numberWithCommas(runningTokens["completion_" + yearFrag]);
        const yearlyCreditUsage = BaseApp.numberWithCommas(runningTokens["credit_" + yearFrag], 2);

        const monthlyTotalTokens = BaseApp.numberWithCommas(runningTokens["total_" + yearMonthFrag]);
        const monthlyPromptTokens = BaseApp.numberWithCommas(runningTokens["prompt_" + yearMonthFrag]);
        const monthlyCompletionTokens = BaseApp.numberWithCommas(runningTokens["completion_" + yearMonthFrag]);
        const monthlyCreditUsage = BaseApp.numberWithCommas(runningTokens["credit_" + yearMonthFrag], 2);

        const dailyTotalTokens = BaseApp.numberWithCommas(runningTokens["total_" + ymdFrag]);
        const dailyPromptTokens = BaseApp.numberWithCommas(runningTokens["prompt_" + ymdFrag]);
        const dailyCompletionTokens = BaseApp.numberWithCommas(runningTokens["completion_" + ymdFrag]);
        const dailyCreditUsage = BaseApp.numberWithCommas(runningTokens["credit_" + ymdFrag], 2);

        this.replies_row.innerHTML = `<th>Reply</th><td class="day_td">${dailyCompletionTokens}</td>` +
            `<td class="monthly_td">${monthlyCompletionTokens}</td>` +
            `<td class="yearly_td">${yearlyCompletionTokens}</td>` +
            `<td class="all_time_td">${allTimeCompletionTokens}</td>`;
        this.prompts_row.innerHTML = `<th>Sent</th><td class="day_td">${dailyPromptTokens}</td>` +
            `<td class="monthly_td">${monthlyPromptTokens}</td>` +
            `<td class="yearly_td">${yearlyPromptTokens}</td>` +
            `<td class="all_time_td">${allTimePromptTokens}</td>`;
        this.total_row.innerHTML = `<th>Total</th><td class="day_td">${dailyTotalTokens}</td>` +
            `<td class="monthly_td">${monthlyTotalTokens}</td>` +
            `<td class="yearly_td">${yearlyTotalTokens}</td>` +
            `<td class="all_time_td">${allTimeTotalTokens}</td>`;
        this.credits_row.innerHTML = `<th>Credits</th><td class="day_td">${dailyCreditUsage}</td>` +
            `<td class="monthly_td">${monthlyCreditUsage}</td>` +
            `<td class="yearly_td">${yearlyCreditUsage}</td>` +
            `<td class="all_time_td">${allTimeCreditUsage}</td>`;
        this.monthly_tokens_usage.innerHTML = monthlyCreditUsage;
    }
    /** populate modal fields and show */
    async show() {
        let displayName = this.app.profile.displayName;
        if (!displayName) displayName = "Anonymous";
        this.profile_display_name.innerHTML = displayName;

        let email = firebase.auth().currentUser.email;
        if (!email) email = "Logged in as: Anonymous";

        this.logged_in_status.innerHTML = email;

        const queryLabelSelect2 = window.$(".label_profile_picker");
        this.noLabelSave = true;
        queryLabelSelect2.html("");
        queryLabelSelect2.val(null).trigger("change");
        this.noLabelSave = false;

        let labelString = this.app.profile.documentLabels;
        if (!labelString) labelString = "";
        const labelArray = labelString.split(",");
        labelArray.forEach((label: string) => {
            if (label !== "") {
                if (queryLabelSelect2.find("option[value='" + label + "']").length) {
                    queryLabelSelect2.val(label).trigger("change");
                } else {
                    // Create a DOM Option and pre-select by default
                    const newOption = new Option(label, label, true, true);
                    // Append it to the select
                    queryLabelSelect2.append(newOption).trigger("change");
                }
            }
        });

        this.profile_text_large_checkbox.checked = (this.app.profile.textOptionsLarge === true);
        this.profile_text_monospace_checkbox.checked = (this.app.profile.textOptionsMonospace === true);
        this.profile_autoexclude_checkbox.checked = (this.app.profile.autoExclude === true);
        this.profile_disablekatex_checkbox.checked = (this.app.profile.disableKatex === true);
        this.profile_display_image.setAttribute("uid", this.app.uid);
        this.profile_display_name.setAttribute("uid", this.app.uid);
        this.app.updateUserNamesImages();
        this.updateTokenUsage();
        const modal = new window.bootstrap.Modal("#userProfileModal", {});
        modal.show();
    }
    /** */
    async changeEmail() {
        const newEmail = this.profile_new_email.value.trim();

        const oldEmail = this.app.fireUser.email;
        if (newEmail === oldEmail) {
            alert("Email is already " + oldEmail);
            return;
        }

        if (!confirm(`Are you sure you want to change your email to ${newEmail} from ${oldEmail}?`)) {
            return;
        }

        let success = true;
        try {
            await this.app.fireUser.updateEmail(newEmail);
        } catch (error: any) {
            success = false;
            alert("email change FAILED: \n" + error.message);
        }

        if (success) {
            this.app.removeUserPresenceWatch();
            if (this.app.fireToken) await firebase.auth().signOut();

            this.app.fireToken = null;
            this.app.fireUser = null;
            this.app.uid = null;
            window.location = "/";
            window.location.reload();
        }
    }
}
