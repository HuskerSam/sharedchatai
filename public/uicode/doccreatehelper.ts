declare const firebase: any;
declare const window: any;

/** Base class for all pages - handles authorization and low level routing for api calls, etc */
export default class DocCreateHelper {
    app: any = null;
    modal_close_button: any = null;
    modalContainer: any = null;
    create_game_afterfeed_button: any = null;
    owner_note_field: any = null;
    doccreatehelper_show_modal: any = null;
    creatingNewRecord = false;

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

        this.create_game_afterfeed_button = this.modalContainer.querySelector(".create_game_afterfeed_button");
        this.owner_note_field = this.modalContainer.querySelector("#owner_note_field");
        this.doccreatehelper_show_modal = document.querySelector(".doccreatehelper_show_modal");
        this.create_game_afterfeed_button = this.modalContainer.querySelector(".create_game_afterfeed_button");

        this.create_game_afterfeed_button.addEventListener("click", () => this.createNewGame());

        this.modal_close_button = this.modalContainer.querySelector(".modal_close_button");


        window.$(".create_document_label_options").select2({
            tags: true,
            placeHolder: "Add labels...",
        });

    }
    /** template as string for modal
     * @return { string } html template as string
     */
    getModalTemplate(): string {
        return `  <div class="modal fade" id="createDocumentModal" tabindex="-1" aria-labelledby="createDocumentModalLabel"
        aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="createDocumentModalLabel">Create Document</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div style="text-align:center;">
                <select class="create_document_label_options" multiple="multiple" style="width:80%"></select>
              </div>
              <br>
              <div class="form-floating" style="display:inline-block;width:80%">
                <input type="text" class="form-control" id="owner_note_field" placeholder="Note">
                <label>Note</label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary modal_close_button" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary create_game_afterfeed_button">Create</button>
            </div>
          </div>
        </div>
      </div>`;
    }
    /** create new game api call */
    async createNewGame() {
        if (this.creatingNewRecord) return;
        if (!this.app.profile) return;
        this.creatingNewRecord = true;

        this.create_game_afterfeed_button.setAttribute("disabled", true);
        this.create_game_afterfeed_button.innerHTML = "Creating...";

        const gameType = "aichat";
        const body = {
            gameType,
            label: this.scrapeLabels(),
            note: this.owner_note_field.value,
        };
        const token = await firebase.auth().currentUser.getIdToken();
        const fResult = await fetch(this.app.basePath + "lobbyApi/games/create", {
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
            console.log("failed create", json);
            alert("failed to create game");
            return;
        }

        const a = document.createElement("a");
        a.setAttribute("href", `/${gameType}/?game=${json.gameNumber}`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    /** scrape labels from dom and return comma delimited list
    * @return { string } comma delimited list
    */
    scrapeLabels(): string {
        const data = window.$(".create_document_label_options").select2("data");
        const labels: Array<string> = [];
        data.forEach((item: any) => {
            if (item.text.trim()) labels.push(item.text.trim());
        });

        return labels.join(",");
    }
    show() {
        this.owner_note_field.value = "";

        const queryLabelSelect2 = window.$(".create_document_label_options");
        queryLabelSelect2.val(null).trigger("change");

        let labelString = this.app.profile.documentLabels;
        if (!labelString) labelString = "";
        const labelArray = labelString.split(",");
        labelArray.forEach((label: string) => {
            if (label !== "") {
                // Create a DOM Option and pre-select by default
                const newOption = new Option(label, label, false, false);
                // Append it to the select
                queryLabelSelect2.append(newOption).trigger("change");
            }
        });
        this.doccreatehelper_show_modal.click();
    }

}