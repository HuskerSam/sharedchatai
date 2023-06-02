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
    profile_display_image_preset: any;
    randomize_name: any;
    profile_show_modal: any;
    preset_logos_inited = false;
    save_profile_modal_button: any;
    show_modal_profile_help: any;

    /**
     * @param { any } app BaseApp derived application instance
     */
    constructor(app: any) {
        this.app = app;
        this.addModalToDOM();
    }
    /** instaniate and add modal #loginModal */
    addModalToDOM() {
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
        this.profile_display_image_preset = document.querySelector(".profile_display_image_preset");
        this.randomize_name = document.querySelector(".randomize_name");
        this.save_profile_modal_button = document.querySelector(".save_profile_modal_button");
        this.profile_show_modal = document.querySelector(".profile_show_modal");
        this.show_modal_profile_help = document.querySelector(".show_modal_profile_help");

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
        this.profile_display_image_preset.addEventListener("input", () => this.handleImagePresetChange());
        this.randomize_name.addEventListener("click", () => this.randomizeProfileName());
        this.save_profile_modal_button.addEventListener("click", () => this.saveDialogData());
        this.show_modal_profile_help.addEventListener("click", () => this.app.helpHelper.show("user_profile_options"));

        window.$(".label_profile_picker").select2({
            tags: true,
            placeHolder: "Configure default labels",
        });

        this.initPresetLogos();
    }
    /** template as string for modal
     * @return { string } html template as string
     */
    getModalTemplate(): string {
        return `<div class="modal fade" id="userProfileModal" tabindex="-1" aria-labelledby="userProfileModalLabel"
        aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content app_panel">
            <div class="modal-header">
              <h5 class="modal-title logged_in_status" id="userProfileModalLabel">User Profile</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body"> 
                <button class="btn btn-secondary show_modal_profile_help"><i class="material-icons">help</i></button>
                <div style="float:left;white-space: nowrap;">
                    <label class="form-label">Display Name
                        <input type="text" class="form-control profile_display_name" placeholder="Display Name">
                    </label>
                    <button class="randomize_name btn btn-secondary">Random</button>
                </div>
            <br style="clear:both">
            <label class="form-label">Display Image</label><br>
            <div style="display:flex;flex-direction:row">
                <div class="profile_display_image" style="background-image:url(/images/defaultprofile.png);"></div>
                <div style="flex:1">
                    &nbsp;
                    <input type="file" class="file_upload_input" style="visibility:hidden;width:0">
                    <button class="profile_display_image_clear btn btn-secondary"> Clear </button>
                    &nbsp;
                    <button class="profile_display_image_upload btn btn-secondary">Upload</button>
                    <br>
                    <br>
                    <select class="profile_display_image_preset form-select">
                        <option>Pick preset</option>
                    </select>
                </div>
            </div>
            <div style="clear:both"></div>
            <br>
            <label class="form-label">Document Label Picklist</label>
            <br>
            <select class="label_profile_picker" multiple="multiple" style="width:100%"></select>
        <br>
        <div class="settings_panel">

        </div> 
        </div>
        <div class="modal-footer">
          <button class="sign_out_button btn btn-secondary">Sign Out</button>
          <div style="flex:1"></div>
          <button class="reset_profile btn btn-secondary" style="display:none">Reset</button>
          <button type="button" class="btn btn-secondary modal_close_button" data-bs-dismiss="modal">Close</button>
          <button type="button" class="btn btn-primary save_profile_modal_button">Save</button>
        </div>
      </div>
    </div>
  </div>`;
    }
    /** load the team logos <select> */
    async initPresetLogos() {
        if (this.preset_logos_inited) return;
        this.preset_logos_inited = true;

        await this.app.readJSONFile(`/data/logos.json`, "profileLogos");
        let html = "<option>Select a preset image</option>";

        for (const logo in window.profileLogos) {
            if (window.profileLogos[logo]) html += `<option value="${window.profileLogos[logo]}">${logo}</option>`;
        }

        this.profile_display_image_preset.innerHTML = html;
    }
    /** open file picker for custom profile image upload */
    uploadProfileImage() {
        this.file_upload_input.click();
    }
    /** handle local profile image selected for upload and store it */
    async fileUploadSelected() {
        const file = this.file_upload_input.files[0];
        const sRef = firebase.storage().ref("Users").child(this.app.uid + "/pimage");

        if (file.size > 5000000) {
            alert("File needs to be less than 1mb in size");
            return;
        }
        this.profile_display_image_preset.value = "";
        this.profile_display_image.style.backgroundImage = ``;

        await sRef.put(file);
        const path = await sRef.getDownloadURL();
        setTimeout(() => this._finishImagePathUpdate(path), 1500);
    }
    /** handle profile image upload complete
     * @param { string } path cloud path to image (includes uid)
     */
    async _finishImagePathUpdate(path: string) {
        const sRef2 = firebase.storage().ref("Users").child(this.app.uid + "/_resized/pimage_700x700");
        const resizePath = await sRef2.getDownloadURL();
        const updatePacket = {
            rawImage: path,
            displayImage: resizePath,
        };
        if (this.app.fireToken) {
            await firebase.firestore().doc(`Users/${this.app.uid}`).set(updatePacket, {
                merge: true,
            });
        }
        this.updateImageDisplay();
        setTimeout(() => this.updateImageDisplay(), 500);
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
        this.profile_display_image_preset.value = this.app.profile.displayImage;
        this.updateImageDisplay();
    }
    /** generate a random "safe" name */
    async randomizeProfileName(): Promise<void> {
        this.profile_display_name.value = Utility.generateName();
    }
    /** get user label pick list comma delimited
   * @return { string } label list
   */
    getLabels(): string {
        const data = window.$(".label_profile_picker").select2("data");
        const labels: Array<string> = [];
        data.forEach((item: any) => {
            if (item.text.trim()) labels.push(item.text.trim());
        });

        return labels.join(",");
    }
    /**  */
    async saveDialogData() {
        this.app.profile.documentLabels = this.getLabels();
        this.app.profile.displayName = this.profile_display_name.value.trim().substring(0, 15);

        const updatePacket = {
            documentLabels: this.app.profile.documentLabels,
            displayName: this.app.profile.displayName,
        };
        if (this.app.fireToken) {
            await firebase.firestore().doc(`Users/${this.app.uid}`).set(updatePacket, {
                merge: true,
            });
        }
        this.modal_close_button.click();
    }
    /** team image <select> change handler */
    async handleImagePresetChange() {
        if (this.profile_display_image_preset.selectedIndex > 0) {
            const updatePacket = {
                rawImage: this.profile_display_image_preset.value,
                displayImage: this.profile_display_image_preset.value,
            };
            if (this.app.fireToken) {
                await firebase.firestore().doc(`Users/${this.app.uid}`).set(updatePacket, {
                    merge: true,
                });
            }
        }

        this.app.profile.displayImage = this.profile_display_image_preset.value;
        this.updateImageDisplay();
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

            window.location = "/profile";
        }
    }
    /** populate modal fields and show */
    show() {
        let displayName = this.app.profile.displayName;
        if (!displayName) displayName = "";
        this.profile_display_name.value = displayName;

        let email = firebase.auth().currentUser.email;
        if (!email) email = "Logged in as: Anonymous";

        this.logged_in_status.innerHTML = email;

        this.profile_display_image_preset.value = this.app.profile.displayImage;
        const currentLabels = this.getLabels();
        if (this.app.profile.documentLabels !== currentLabels) {
            const queryLabelSelect2 = window.$(".label_profile_picker");
            queryLabelSelect2.val(null).trigger("change");

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
        }
        this.updateImageDisplay();
        this.profile_show_modal.click();
    }
}
