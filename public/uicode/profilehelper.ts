import Utility from "./utility.js";
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
    chat_token_usage_display: any;
    profile_text_large_checkbox: any;
    profile_text_monospace_checkbox: any;
    markdown_completion_display_checkbox: any;
    profile_text_lessdetail_checkbox: any;
    lastLabelsSave = 0;
    noLabelSave = true;

    /**
     * @param { any } app BaseApp derived application instance
     */
    constructor(app: any) {
        this.app = app;
        const html = this.getModalTemplate();
        this.modalContainer = document.createElement("div");
        this.modalContainer.innerHTML = html;
        document.body.appendChild(this.modalContainer);

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
        this.markdown_completion_display_checkbox = document.querySelector(".markdown_completion_display_checkbox");
        this.profile_text_lessdetail_checkbox = document.querySelector(".profile_text_lessdetail_checkbox");
        this.profile_text_large_checkbox = document.querySelector(".profile_text_large_checkbox");
        this.profile_display_image_randomize = document.querySelector(".profile_display_image_randomize");
        this.profile_display_image_randomize.addEventListener("click", () => this.randomizeImage());

        this.prompt_for_new_user_name = document.querySelector(".prompt_for_new_user_name");
        this.prompt_for_new_user_name.addEventListener("click", () => this.promptForNewUserName());
        this.profile_show_modal = document.querySelector(".profile_show_modal");
        this.show_modal_profile_help = document.querySelector(".show_modal_profile_help");
        this.chat_token_usage_display = document.querySelector(".chat_token_usage_display");
        this.profile_text_large_checkbox = document.querySelector(".profile_text_large_checkbox");

        this.sign_out_button.addEventListener("click", (e: any) => {
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
        this.markdown_completion_display_checkbox.addEventListener("input", () => this.saveProfileField("markdownDisplay"));
        this.profile_text_large_checkbox.addEventListener("input", () => this.saveProfileField("largetext"));
        this.show_modal_profile_help.addEventListener("click", () => this.app.helpHelper.show("profile"));
        this.profile_text_lessdetail_checkbox.addEventListener("click", () => this.saveProfileField("lessdetail"));

        window.$(".label_profile_picker").select2({
            tags: true,
            placeHolder: "Configure default labels",
        });
        window.$(".label_profile_picker").on("change", () => this.saveProfileLabels());
    }
    /** pick a random college logo for the profile image and save to firebase */
    async randomizeImage() {
        await this.app.readJSONFile(`/data/logos.json`, "profileLogos");
        const keys = Object.keys(window.profileLogos);
        const imageIndex = Math.floor(Math.random() * keys.length);
        const logoName = keys[imageIndex];
        this.app.profile.displayImage = window.profileLogos[logoName];
        this.updateImageDisplay();
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
                    <h5 class="modal-title logged_in_status" id="userProfileModalLabel">User Profile</h5>
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
                                aria-selected="false">Usage</a>
                        </li>
                    </ul>
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="profile_user_tab_view" role="tabpanel"
                            aria-labelledby="profile_user_tab_button">
                            <button class="btn btn-secondary show_modal_profile_help"><i
                                    class="material-icons">help</i></button>
                            <div style="font-size: 1.25em">
                                <label class="form-check-label">
                                    <input class="form-check-input profile_text_large_checkbox" type="checkbox" value="">
                                    Larger Text
                                </label>
                                &nbsp;
                                <label class="form-check-label">
                                    <input class="form-check-input profile_text_monospace_checkbox" type="checkbox"
                                        value="">
                                    Monospace
                                </label>
                                &nbsp;
                                <label class="form-check-label" style="display:none;">
                                    <input class="form-check-input profile_text_lessdetail_checkbox" type="checkbox"
                                        value="">
                                    Less Details
                                </label>
                                &nbsp;
                                <label class="form-check-label">
                                    <input class="form-check-input markdown_completion_display_checkbox" type="checkbox"
                                        value="">
                                    Markdown
                                </label>
                            </div>
                            <hr>
                            <div>
                                <div style="display:inline-block;">
                                    <label class="form-label">Display Name</label>
                                    <br>
                                    <div class="form-control profile_display_name">
                                    </div>
                                </div>
                                <div
                                    style="display:inline-block;text-align: center;position:relative;top: 10px;line-height: 3em">
                                    <button class="btn btn-primary prompt_for_new_user_name">Change...</button>
                                    <br>
                                    <button class="randomize_name btn btn-secondary">Random</button>
                                </div>
                            </div>
                            <hr>
                            <label class="form-label">Display Image</label><br>
                            <div>
                                <div class="profile_display_image"
                                    style="background-image:url(/images/defaultprofile.png);"></div>
                                <div style="display:inline-block;line-height:3em">
                                    <input type="file" class="file_upload_input" style="visibility:hidden;width:0">
                                    <button class="profile_display_image_clear btn btn-secondary"> Clear </button>
                                    <br>
                                    <button class="profile_display_image_randomize btn btn-secondary">Random</button>
                                    <br>
                                    <button class="profile_display_image_upload btn btn-primary">Upload</button>
                                </div>
                            </div>
                            <div style="clear:both"></div>
                        </div>
                        <div class="tab-pane fade" id="profile_user_labels_view" style="min-height:10em; role="tabpanel"
                            aria-labelledby="profile_labels_tab_button">
    
                            <label class="form-label">Default Labels</label>
                            <br>
                            <select class="label_profile_picker" multiple="multiple" style="width:100%;min-height:6em"></select>
                            <br>
                        </div>
                        <div class="tab-pane fade" id="profile_user_usage_view" role="tabpanel"
                            aria-labelledby="usage_labels_tab_button">
                            <div class="chat_token_usage_display">&nbsp;</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="sign_out_button btn btn-secondary">Sign Out</button>
                    <div style="flex:1"></div>
                    <button class="reset_profile btn btn-secondary" style="display:none">Reset</button>
                    <button type="button" class="btn btn-secondary modal_close_button"
                        data-bs-dismiss="modal">Close</button>
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
        this.updateImageDisplay();
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
        this.updateImageDisplay();
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
            const text = item.text.trim().substring(0, 30);
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
        if (fieldType === "markdownDisplay") {
            this.app.profile.markdownDisplay = this.markdown_completion_display_checkbox.checked;
            updatePacket.markdownDisplay = this.app.profile.markdownDisplay;
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
        if (fieldType === "lessdetail") {
            this.app.profile.lessTokenDetails = this.profile_text_lessdetail_checkbox.checked;
            updatePacket.lessTokenDetails = this.app.profile.lessTokenDetails;
        }
        if (this.app.fireToken) {
            await firebase.firestore().doc(`Users/${this.app.uid}`).set(updatePacket, {
                merge: true,
            });
        }
    }
    /** paint user image preview */
    updateImageDisplay() {
        this.profile_display_image.style.backgroundImage = "";
        if (this.app.profile.displayImage) this.profile_display_image.style.backgroundImage = `url(${this.app.profile.displayImage})`;
        else this.profile_display_image.style.backgroundImage = `url(/images/defaultprofile.png)`;
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

        let allTimeDisplay = "";
        let todayDisplay = "";
        let monthlyDisplay = "";
        let yearlyDisplay = "";
        const today = new Date().toISOString();
        const yearFrag = today.substring(0, 4);
        const yearMonthFrag = today.substring(0, 7);
        const ymdFrag = today.substring(0, 10);
        let runningTokens: any = {};
        if (usageData.runningTokens) runningTokens = usageData.runningTokens;

        let allTimeTotalTokens = 0;
        if (usageData.totalTokens) allTimeTotalTokens = usageData.totalTokens;
        let allTimePromptTokens = 0;
        if (usageData.promptTokens) allTimePromptTokens = usageData.promptTokens;
        let allTimeCompletionTokens = 0;
        if (usageData.completionTokens) allTimeCompletionTokens = usageData.completionTokens;

        let yearlyTotalTokens = 0;
        if (runningTokens["total_" + yearFrag]) yearlyTotalTokens = runningTokens["total_" + yearFrag];
        let yearlyPromptTokens = 0;
        if (runningTokens["prompt_" + yearFrag]) yearlyPromptTokens = runningTokens["prompt_" + yearFrag];
        let yearlyCompletionTokens = 0;
        if (runningTokens["completion_" + yearFrag]) yearlyCompletionTokens = runningTokens["completion_" + yearFrag];

        let monthlyTotalTokens = 0;
        if (runningTokens["total_" + yearMonthFrag]) monthlyTotalTokens = runningTokens["total_" + yearMonthFrag];
        let monthlyPromptTokens = 0;
        if (runningTokens["prompt_" + yearMonthFrag]) monthlyPromptTokens = runningTokens["prompt_" + yearMonthFrag];
        let monthlyCompletionTokens = 0;
        if (runningTokens["completion_" + yearMonthFrag]) monthlyCompletionTokens = runningTokens["completion_" + yearMonthFrag];

        let dailyTotalTokens = 0;
        if (runningTokens["total_" + ymdFrag]) dailyTotalTokens = runningTokens["total_" + ymdFrag];
        let dailyPromptTokens = 0;
        if (runningTokens["prompt_" + ymdFrag]) dailyPromptTokens = runningTokens["prompt_" + ymdFrag];
        let dailyCompletionTokens = 0;
        if (runningTokens["completion_" + ymdFrag]) dailyCompletionTokens = runningTokens["completion_" + ymdFrag];

        allTimeDisplay = `<span class="usage_prefix_label">All</span><span class="total_token">${allTimeTotalTokens}</span> 
        <span class="completion_token">${allTimeCompletionTokens}</span> 
        <span class="prompt_token">${allTimePromptTokens}</span>`;
        yearlyDisplay = `<span class="usage_prefix_label">Year</span><span class="total_token">${yearlyTotalTokens}</span> 
        <span class="completion_token">${yearlyCompletionTokens}</span> 
        <span class="prompt_token">${yearlyPromptTokens}</span>`;
        monthlyDisplay = `<span class="usage_prefix_label">Month</span><span class="total_token">${monthlyTotalTokens}</span>
        <span class="completion_token">${monthlyCompletionTokens}</span> 
        <span class="prompt_token">${monthlyPromptTokens}</span>`;
        todayDisplay = `<span class="usage_prefix_label">Today</span><span class="total_token">${dailyTotalTokens}</span>
                <span class="completion_token">${dailyCompletionTokens}</span>
                <span class="prompt_token">${dailyPromptTokens}</span>`;

        const headerRow = `<span class="usage_prefix_label"></span>
                <span class="total_token">Total</span>
                <span class="completion_token">Completion</span>
                <span class="prompt_token">Prompt</span>`;
        this.chat_token_usage_display.innerHTML = `<div class="token_usage_table">` +
            `<div class="token_usage_row header">` + headerRow + "</div>" +
            `<div class="token_usage_row">` + todayDisplay + "</div>" +
            `<div class="token_usage_row">` + monthlyDisplay + "</div>" +
            `<div class="token_usage_row">` + yearlyDisplay + "</div>" +
            `<div class="token_usage_row">` + allTimeDisplay + "</div>" +
            `</div>`;
    }
    /** populate modal fields and show */
    async show() {
        let displayName = this.app.profile.displayName;
        if (!displayName) displayName = "";
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
        this.markdown_completion_display_checkbox.checked = (this.app.profile.markdownDisplay === true);
        this.updateImageDisplay();
        this.updateTokenUsage();
        this.profile_show_modal.click();
    }
}
