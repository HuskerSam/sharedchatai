declare const firebase: any;
declare const window: any;

/** Base class for all pages - handles authorization and low level routing for api calls, etc */
export default class DocOptionsHelper {
    app: any = null;
    owner_note_field_edit: any = null;
    save_game_afterfeed_button: any = null;
    modal_close_button: any = null;
    modalContainer: any = null;
    copyLink: any = null;
    document_title: any = null;
    documentData: any = null;

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

        this.owner_note_field_edit = this.modalContainer.querySelector("#owner_note_field_edit");
        this.save_game_afterfeed_button = this.modalContainer.querySelector(".save_game_afterfeed_button");
        this.modal_close_button = this.modalContainer.querySelector(".modal_close_button");
        this.document_title = this.modalContainer.querySelector(".document_title");

        this.save_game_afterfeed_button.addEventListener("click", () => this.saveDocumentOptions());
        const del: any = this.modalContainer.querySelector("button.delete_game");
        del.addEventListener("click", (e: any) => {
            e.stopPropagation();
            e.preventDefault();
            this.deleteGame();
        });
        const leave: any = this.modalContainer.querySelector("button.leave_game");
        leave.addEventListener("click", (e: any) => {
            e.stopPropagation();
            e.preventDefault();
            this.logoutGame();
        });

        window.$(".document_label_picker_edit").select2({
            tags: true,
            placeHolder: "Add labels...",
        });

        this.copyLink = this.modalContainer.querySelector(".code_link");
    }
    /** copy game url link to clipboard
 * @param { any } btn dom control
 */
    copyGameLink() {
        navigator.clipboard.writeText(window.location.origin + "/aichat/?game=" + this.app.editedDocumentId);
        this.copyLink.innerHTML = "✅" + `<i class="material-icons">content_copy</i> <span>${this.app.editedDocumentId}</span>`;
    }
    /** send user (optional owner) settings for document to api */
    async saveDocumentOptions() {
        const docId = this.app.editedDocumentId;
        const label = this.scrapeDocumentEditLabels();
        const note = this.owner_note_field_edit.value;

        const body: any = {
            gameNumber: docId,
            label,
            note,
        };

        if (this.document_title.value.trim() !== this.documentData.title && this.document_title.value !== "") body.title = this.document_title.value.trim();

        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.app.basePath + "lobbyApi/games/owner/options", {
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
        if (!json.success) {
            alert("Unable to save options " + json.errorMessage);
        }
        this.modal_close_button.click();
    }
    /** template as string for modal
     * @return { string } html template as string
     */
    getModalTemplate(): string {
        return `<div class="modal fade" id="editDocumentModal" tabindex="-1" aria-labelledby="editDocumentModalLabel"
        aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="editDocumentModalLabel">Edit Document</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="owner_options_edit_section">
                <div class="form-floating">
                    <textarea type="text" class="form-control document_title" placeholder="Title"></textarea>
                    <label>Title</label>
                </div>
                <div style="text-align:center;">
                  <select class="document_label_picker_edit" multiple="multiple" style="width:80%"></select>
                </div>
                <br>
                <div class="form-floating" style="display:inline-block;width:80%">
                  <input type="text" class="form-control" id="owner_note_field_edit" placeholder="Note">
                  <label>Note</label>
                </div>
              </div>
              <button class="delete_game btn btn-secondary">
              Delete
          </button>
          <button class="leave_game btn btn-secondary">
              Leave
          </button>
          <button class="code_link game btn btn-primary"></button>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary modal_close_button"
                data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary save_game_afterfeed_button">Save</button>
            </div>
          </div>
        </div>
      </div>`;
    }
    /** use jquery to extract label list from select2
     * @return { string } comma delimited list of labels
      */
    scrapeDocumentEditLabels(): string {
        const data = window.$(".document_label_picker_edit").select2("data");
        const labels: Array<string> = [];
        data.forEach((item: any) => {
            if (item.text.trim()) labels.push(item.text.trim());
        });

        return labels.join(",");
    }
    /** delete game api call */
    async deleteGame() {
        if (!confirm("Are you sure you want to delete this game?")) return;

        if (!this.app.editedDocumentId) {
            alert("Game Number not found - error");
            return;
        }

        const body = {
            gameNumber: this.app.editedDocumentId,
        };
        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.app.basePath + "lobbyApi/games/delete", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const result = await fResult.json();
        if (!result.success) {
            console.log("delete error", result);
            alert("Delete failed");
            return;
        }
        this.modal_close_button.click();
    }
    /** logout api call */
    async logoutGame() {
        if (!this.app.editedDocumentId) {
            alert("Game Number not found - error");
            return;
        }

        const body = {
            gameNumber: this.app.editedDocumentId,
        };
        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.app.basePath + "lobbyApi/games/leave", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });

        const result = await fResult.json();
        if (!result.success) {
            alert("Logout failed");
            return;
        }

        this.modal_close_button.click();
    }
    /** show document details modal
 */
    show() {
        const doc = this.app.documentsLookup[this.app.editedDocumentId];
        this.documentData = doc;
        if (doc.createUser === this.app.uid) {
            (<any>document.getElementById("owner_note_field_edit")).value = doc.note;
            (<any>document.querySelector(".owner_options_edit_section")).style.display = "block";
            this.modalContainer.classList.add("feed_game_owner");
        } else {
            (<any>document.getElementById("owner_note_field_edit")).value = "Shared Document";
            (<any>document.querySelector(".owner_options_edit_section")).style.display = "none";
            this.modalContainer.classList.remove("feed_game_owner");
        }

        this.document_title.value = doc.title;

        if (doc.createUser === this.app.uid) {
            const queryLabelSelect2 = window.$(".document_label_picker_edit");
            queryLabelSelect2.val(null).trigger("change");

            try {
                let labelString = doc.label;
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
            } catch (error) {
                console.log(error);
            }
        }

        this.copyLink.innerHTML = `<i class="material-icons">content_copy</i> <span>${this.app.editedDocumentId}</span>`;
        this.copyLink.addEventListener("click", () => this.copyGameLink());
    }
}
