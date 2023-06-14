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
    profile_show_modal: any;
    preset_logos_inited = false;
    prompt_for_new_user_name: any;
    show_modal_profile_help: any;
    profile_text_large_checkbox: any;
    profile_text_monospace_checkbox: any;
    profile_prefixname_checkbox: any;
    profile_autoexclude_checkbox: any;
    lastLabelsSave = 0;
    noLabelSave = true;
    replies_row: any;
    prompts_row: any;
    total_row: any;
    monthly_tokens_usage: any;

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
        this.profile_prefixname_checkbox = document.querySelector(".profile_prefixname_checkbox");
        this.profile_autoexclude_checkbox = document.querySelector(".profile_autoexclude_checkbox");
        this.replies_row = document.querySelector(".replies_row");
        this.prompts_row = document.querySelector(".prompts_row");
        this.total_row = document.querySelector(".total_row");
        this.monthly_tokens_usage = document.querySelector(".monthly_tokens_usage");

        this.profile_text_large_checkbox = document.querySelector(".profile_text_large_checkbox");
        this.profile_display_image_randomize = document.querySelector(".profile_display_image_randomize");
        this.profile_display_image_randomize.addEventListener("click", () => this.randomizeImage());

        this.prompt_for_new_user_name = document.querySelector(".prompt_for_new_user_name");
        this.prompt_for_new_user_name.addEventListener("click", () => this.promptForNewUserName());
        this.profile_show_modal = document.querySelector(".profile_show_modal");
        this.show_modal_profile_help = document.querySelector(".show_modal_profile_help");
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
        this.profile_prefixname_checkbox.addEventListener("input", () => this.saveProfileField("prefixname"));
        this.profile_autoexclude_checkbox.addEventListener("input", () => this.saveProfileField("autoExclude"));

        this.profile_text_large_checkbox.addEventListener("input", () => this.saveProfileField("largetext"));
        this.show_modal_profile_help.addEventListener("click", () => this.app.helpHelper.show("profile"));

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
        this.updateUserImageAndName();
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
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </h5>
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
                            <button class="btn btn-secondary show_modal_profile_help"><i
                                    class="material-icons">help</i></button>
                            <div>
                                <label class="form-label">Name and Image</label>
                                <br>
                                <div style="display:flex;flex-direction:row;width:100%;">
                                    <div class="profile_display_name"></div>
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
                                    <div class="profile_display_image"
                                        style="background-image:url(/images/defaultprofile.png);"></div>
                                    <input type="file" class="file_upload_input" style="display:none;">
                                    <button class="profile_display_image_clear btn btn-secondary">
                                        <i class="material-icons">delete</i>
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
                                    <input class="form-check-input profile_prefixname_checkbox" type="checkbox" value="">
                                    Prefix Name
                                </label>
                                <label class="form-check-label">
                                    <input class="form-check-input profile_autoexclude_checkbox" type="checkbox" value="">
                                    Auto Exclude
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
                            <div class="form-label">Monthly OpenAI Token Usage</div>
                            <div class="summary_panel">
                                Tokens Used: <span class="summary_column monthly_tokens_usage">0</span>
                                <br>
                                Monthly Limit: <span class="summary_column">20,000,000</span>
                                <br>
                                Reserve used: <span class="summary_column">0</span>
                                <br>
                                Token reserve: <span class="summary_column">0</span>
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
                            </table>
                            <hr>
                            <table>
                                <tr>
                                    <td>Subscription Level: &nbsp;</td>
                                    <td class="account_subscription_status">Try out</td>
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
        this.updateUserImageAndName();
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
        this.updateUserImageAndName();
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
        const newName = prompt("New User Name", this.app.profile.displayName);
        if (newName !== null) {
            this.app.profile.displayName = newName.trim().substring(0, 30);
            this.profile_display_name.innerHTML = this.app.profile.displayName;
            this.saveProfileField("name");
        }
    }
    /** get user label pick list comma delimited
   * @return { string } label list
   */
    getLabels(): string {
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
        this.app.profile.documentLabels = this.getLabels();
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
        if (fieldType === "prefixname") {
            this.app.profile.prefixName = this.profile_prefixname_checkbox.checked;
            updatePacket.prefixName = this.app.profile.prefixName;
        }
        if (fieldType === "autoExclude") {
            this.app.profile.autoExclude = this.profile_autoexclude_checkbox.checked;
            updatePacket.autoExclude = this.app.profile.autoExclude;
        }

        if (this.app.fireToken) {
            await firebase.firestore().doc(`Users/${this.app.uid}`).set(updatePacket, {
                merge: true,
            });
        }
    }
    /** paint user image preview */
    updateUserImageAndName() {
        let bkg = `url(/images/defaultprofile.png)`;
        if (this.app.profile.displayImage) bkg = `url(${this.app.profile.displayImage})`;
        this.profile_display_image.style.backgroundImage = bkg;

        let displayName = this.app.profile.displayName;
        if (!displayName) displayName = "Anonymous";
        this.profile_display_name.innerHTML = displayName;
    }
    /** signout of firebase authorization
     * @param { any } e dom event
     */
    async authSignout(e: any) {
        e.preventDefault();
        if (this.app.fireToken) {
            await firebase.auth().signOut();

            this.app.fireToken = null;
            this.app.fireUser = null;
            this.app.uid = null;

            window.location = "/";
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
        const yearlyTotalTokens = BaseApp.numberWithCommas(runningTokens["total_" + yearFrag]);
        const yearlyPromptTokens = BaseApp.numberWithCommas(runningTokens["prompt_" + yearFrag]);
        const yearlyCompletionTokens = BaseApp.numberWithCommas(runningTokens["completion_" + yearFrag]);

        const monthlyTotalTokens = BaseApp.numberWithCommas(runningTokens["total_" + yearMonthFrag]);
        const monthlyPromptTokens = BaseApp.numberWithCommas(runningTokens["prompt_" + yearMonthFrag]);
        const monthlyCompletionTokens = BaseApp.numberWithCommas(runningTokens["completion_" + yearMonthFrag]);

        const dailyTotalTokens = BaseApp.numberWithCommas(runningTokens["total_" + ymdFrag]);
        const dailyPromptTokens = BaseApp.numberWithCommas(runningTokens["prompt_" + ymdFrag]);
        const dailyCompletionTokens = BaseApp.numberWithCommas(runningTokens["completion_" + ymdFrag]);

        this.replies_row.innerHTML = `<td>Reply</td><td class="day_td">${dailyCompletionTokens}</td>` +
            `<td class="monthly_td">${monthlyCompletionTokens}</td>` +
            `<td class="yearly_td">${yearlyCompletionTokens}</td>` +
            `<td class="all_time_td">${allTimeCompletionTokens}</td>`;
        this.prompts_row.innerHTML = `<td>Sent</td><td class="day_td">${dailyPromptTokens}</td>` +
            `<td class="monthly_td">${monthlyPromptTokens}</td>` +
        `<td class="yearly_td">${yearlyPromptTokens}</td>` +
            `<td class="all_time_td">${allTimePromptTokens}</td>`;
        this.total_row.innerHTML = `<td>Total</td><td class="day_td">${dailyTotalTokens}</td>` +
            `<td class="monthly_td">${monthlyTotalTokens}</td>` +
            `<td class="yearly_td">${yearlyTotalTokens}</td>` +
            `<td class="all_time_td">${allTimeTotalTokens}</td>`;
        this.monthly_tokens_usage.innerHTML = monthlyTotalTokens;
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
        this.profile_prefixname_checkbox.checked = (this.app.profile.prefixName === true);
        this.profile_autoexclude_checkbox.checked = (this.app.profile.autoExclude === true);
        this.updateUserImageAndName();
        this.updateTokenUsage();
        this.profile_show_modal.click();
    }
}
