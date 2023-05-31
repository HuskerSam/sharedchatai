import BaseApp from "./baseapp.js";
import Utility from "./utility.js";
import LoginHelper from "./loginhelper.js";
declare const window: any;
declare const firebase: any;

/** app class for profile page */
export class ProfileApp extends BaseApp {
  logged_in_status: any = document.querySelector(".logged_in_status");
  sign_out_button: any = document.querySelector(".sign_out_button");
  reset_profile: any = document.querySelector(".reset_profile");
  profile_display_name: any = document.querySelector(".profile_display_name");
  profile_display_image: any = document.querySelector(".profile_display_image");
  chatgpt_key: any = document.querySelector(".chatgpt_key");
  profile_display_image_upload: any = document.querySelector(".profile_display_image_upload");
  file_upload_input: any = document.querySelector(".file_upload_input");
  profile_display_image_clear: any = document.querySelector(".profile_display_image_clear");
  profile_display_image_preset: any = document.querySelector(".profile_display_image_preset");
  randomize_name: any = document.querySelector(".randomize_name");
  button_save_labels: any = document.querySelector(".button_save_labels");
  lastNameChange = 0;
  login = new LoginHelper(this);

  /** */
  constructor() {
    super();

    this.sign_out_button.addEventListener("click", (e: any) => {
      this.authSignout(e);
      e.preventDefault();
      return false;
    });

    this.reset_profile.addEventListener("click", (e: any) => {
      if (confirm("Are you sure you want to clear out all reviews and profile data?")) {
        this._authCreateDefaultProfile();
      }
      e.preventDefault();
      return true;
    });

    this.profile_display_name.addEventListener("input", () => this.displayNameChange());

    this.chatgpt_key.addEventListener("input", () => this.chatGPTChange());
    this.profile_display_image_upload.addEventListener("click", () => this.uploadProfileImage());
    this.file_upload_input.addEventListener("input", () => this.fileUploadSelected());
    this.profile_display_image_clear.addEventListener("click", () => this.clearProfileImage());
    this.profile_display_image_preset.addEventListener("input", () => this.handleImagePresetChange());
    this.randomize_name.addEventListener("click", () => this.randomizeProfileName());
    this.button_save_labels.addEventListener("click", () => this.saveLabels());

    window.$(".label_profile_picker").select2({
      tags: true,
      placeHolder: "Configure default labels",
    });

    this.initPresetLogos();
    this.login.addModalToDOM();
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
  async saveLabels() {
    this.profile.documentLabels = this.getLabels();
    const updatePacket = {
      documentLabels: this.profile.documentLabels,
    };
    if (this.fireToken) {
      await firebase.firestore().doc(`Users/${this.uid}`).set(updatePacket, {
        merge: true,
      });
    }
  }
  /** load the team logos <select> */
  async initPresetLogos() {
    await this.readJSONFile(`/profile/logos.json`, "profileLogos");
    let html = "<option>Select a preset image</option>";

    for (const logo in window.profileLogos) {
      if (window.profileLogos[logo]) html += `<option value="${window.profileLogos[logo]}">${logo}</option>`;
    }

    this.profile_display_image_preset.innerHTML = html;
  }
  /** team image <select> change handler */
  async handleImagePresetChange() {
    if (this.profile_display_image_preset.selectedIndex > 0) {
      const updatePacket = {
        rawImage: this.profile_display_image_preset.value,
        displayImage: this.profile_display_image_preset.value,
      };
      if (this.fireToken) {
        await firebase.firestore().doc(`Users/${this.uid}`).set(updatePacket, {
          merge: true,
        });
      }
    }
  }
  /** signout of firebase authorization
   * @param { any } e dom event
   */
  async authSignout(e: any) {
    e.preventDefault();
    if (this.fireToken) {
      await firebase.auth().signOut();

      this.fireToken = null;
      this.fireUser = null;
      this.uid = null;

      window.location = "/profile";
    }
  }
  /** BaseApp override to paint profile specific authorization parameters */
  authUpdateStatusUI() {
    if (this.profile) {
      let displayName = this.profile.displayName;
      if (!displayName) displayName = "";

      if (!this.lastNameChange || this.lastNameChange + 2000 < new Date().getTime()) this.profile_display_name.value = displayName;

      let chatGptKey = this.profile.chatGptKey;
      if (!chatGptKey) chatGptKey = "";
      if (!this.lastNameChange || this.lastNameChange + 2000 < new Date().getTime()) {
        this.chatgpt_key.value = chatGptKey;
      }

      if (this.profile.displayImage) this.profile_display_image.style.backgroundImage = `url(${this.profile.displayImage})`;
      else this.profile_display_image.style.backgroundImage = `url(/images/defaultprofile.png)`;

      if (this.profile.displayImage) this.profile_display_image_preset.value = this.profile.displayImage;
      else this.profile_display_image_preset.selectedIndex = 0;
    }

    super.authUpdateStatusUI();
    this.updateInfoProfile();
  }
  /** handle (store) change to users display name */
  async displayNameChange() {
    this.profile.displayName = this.profile_display_name.value.trim().substring(0, 15);

    const updatePacket = {
      displayName: this.profile.displayName,
    };
    if (this.fireToken) {
      await firebase.firestore().doc(`Users/${this.uid}`).set(updatePacket, {
        merge: true,
      });
    }
    this.lastNameChange = new Date().getTime();
  }
  /** paint user profile */
  updateInfoProfile() {
    if (!this.profile) {
      return;
    }
    let email = firebase.auth().currentUser.email;
    if (!email) email = "Logged in as: Anonymous";

    this.logged_in_status.innerHTML = email;

    const currentLabels = this.getLabels();
    if (this.profile.documentLabels !== currentLabels) {
      const queryLabelSelect2 = window.$(".label_profile_picker");
      queryLabelSelect2.val(null).trigger("change");

      let labelString = this.profile.documentLabels;
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
  }
  /** handle (store) change to users display name */
  async chatGPTChange() {
    this.profile.chatGptKey = this.chatgpt_key.value.trim();
    const updatePacket = {
      chatGptKey: this.profile.chatGptKey,
    };
    if (this.fireToken) {
      await firebase.firestore().doc(`Users/${this.uid}`).set(updatePacket, {
        merge: true,
      });
    }
    this.lastNameChange = new Date().getTime();
  }
  /** open file picker for custom profile image upload */
  uploadProfileImage() {
    this.file_upload_input.click();
  }
  /** handle local profile image selected for upload and store it */
  async fileUploadSelected() {
    const file = this.file_upload_input.files[0];
    const sRef = firebase.storage().ref("Users").child(this.uid + "/pimage");

    if (file.size > 5000000) {
      alert("File needs to be less than 1mb in size");
      return;
    }

    this.profile_display_image.style.backgroundImage = ``;

    await sRef.put(file);
    const path = await sRef.getDownloadURL();
    setTimeout(() => this._finishImagePathUpdate(path), 1500);
  }
  /** handle profile image upload complete
   * @param { string } path cloud path to image (includes uid)
   */
  async _finishImagePathUpdate(path: string) {
    const sRef2 = firebase.storage().ref("Users").child(this.uid + "/_resized/pimage_700x700");
    const resizePath = await sRef2.getDownloadURL();
    const updatePacket = {
      rawImage: path,
      displayImage: resizePath,
    };
    if (this.fireToken) {
      await firebase.firestore().doc(`Users/${this.uid}`).set(updatePacket, {
        merge: true,
      });
    }
  }
  /** reset profile image (and store result in user profile) */
  async clearProfileImage() {
    const updatePacket = {
      displayImage: "",
    };
    if (this.fireToken) {
      await firebase.firestore().doc(`Users/${this.uid}`).set(updatePacket, {
        merge: true,
      });
    }
  }
  /** handle for mute/audio settings change
   * @param { number } index radio button index (to set value)
  */
  async updateProfileAudioMode(index: number) {
    const updatePacket = {
      muteState: (index === 0),
    };
    if (this.fireToken) await firebase.firestore().doc(`Users/${this.uid}`).update(updatePacket);
  }
  /** generate a random "safe" name */
  async randomizeProfileName(): Promise<void> {
    const updates = {
      displayName: Utility.generateName(),
    };

    await firebase.firestore().doc(`Users/${this.uid}`).set(updates, {
      merge: true,
    });
  }
}
