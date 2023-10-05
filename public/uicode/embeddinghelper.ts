declare const firebase: any;
declare const window: any;

/** login dialog helper - displays automatically if not home page */
export default class PineconeHelper {
  app: any = null;
  documentData: any = null;
  isOwner = false;
  chatDocumentId = "";

  modalContainer: any = null;
  modal: any = null;
  modal_close_button: any = null;
  save_pinecone_settings: any;
  pinecone_secret_input: any;
  pinecone_environment_input: any;
  pinecone_top_k_input: any;
  pinecone_index_input: any;

  /**
   * @param { any } app baseapp derived instance
   */
  constructor(app: any) {
    this.app = app;
    const html = this.getModalTemplate();
    this.modalContainer = document.createElement("div");
    this.modalContainer.innerHTML = html;
    document.body.appendChild(this.modalContainer);

    this.modal_close_button = this.modalContainer.querySelector(".modal_close_button");
    const modal: any = document.getElementById("embeddingSettingsModal");
    modal?.addEventListener("hidden.bs.modal", () => {
    });

    this.save_pinecone_settings = this.modalContainer.querySelector(".save_pinecone_settings");
    this.save_pinecone_settings.addEventListener("click", () => this.savePineconeSettings());

    this.pinecone_secret_input = this.modalContainer.querySelector(".pinecone_secret_input");
    this.pinecone_environment_input = this.modalContainer.querySelector(".pinecone_environment_input");
    this.pinecone_top_k_input = this.modalContainer.querySelector(".pinecone_top_k_input");
    this.pinecone_index_input = this.modalContainer.querySelector(".pinecone_index_input");
  }
  /** */
  async savePineconeSettings() {
    this.documentData.pineconeSecret = this.pinecone_secret_input.value;
    this.documentData.pineconeEnvironment = this.pinecone_environment_input.value;
    this.documentData.pineconeTopK = this.pinecone_top_k_input.value;
    this.documentData.pineconeIndex = this.pinecone_index_input.value;

    this.app.saveDocumentOwnerOption(this.chatDocumentId, "pineconeSecret", this.documentData);
    this.app.saveDocumentOwnerOption(this.chatDocumentId, "pineconeEnvironment", this.documentData);
    this.app.saveDocumentOwnerOption(this.chatDocumentId, "pineconeTopK", this.documentData);
    this.app.saveDocumentOwnerOption(this.chatDocumentId, "pineconeIndex", this.documentData);

    this.modal_close_button.click();
  }
  /** get modal template
   * @return { string } template
   */
  getModalTemplate(): string {
    return `<div class="modal fade" id="embeddingSettingsModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content login_modal_container">
        <div class="modal-header">
          <h4 class="modal-title" id="loginModalLabel">Embedding Configuration</h4>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div>
              <table class="pinecone_inputs_table">
                  <tr>
                      <td>Pinecone Key</td>
                      <td><input class="pinecone_secret_input form-control" type="text">
                  </tr>
                  <tr>
                      <td>Environment</td>
                      <td><input class="pinecone_environment_input form-control" type="text"></td>
                  </tr>
                  <tr>
                      <td>Pinecone Index</td>
                      <td><input class="pinecone_index_input form-control" type="text"></td>
                  </tr>
                  <tr>
                      <td>Top K</td>
                      <td><input class="pinecone_top_k_input form-control" type="text"></td>
                  </tr>
                  <tr>
                      <td>External Secret</td>
                      <td></td>
                  </tr>
                  <tr>
                      <td></td>
                      <td style="text-align:right">
                          
                      </td>
                  </tr>
              </table>
          </div>
        </div>
        <div class="modal-footer">

            <button type="button" class="btn btn-secondary modal_close_button" data-bs-dismiss="modal">
              <i class="material-icons">cancel</i>
              Close
          </button>
          <button type="button" class="btn btn-primary save_pinecone_settings">
          <i class="material-icons">save</i>
          Save
        </button>
        </div>
      </div>
    </div>
  </div>`;
  }
  /** */
  show(chatDocumentId: string, doc: any) {
    this.chatDocumentId = chatDocumentId;
    this.documentData = doc;
    this.isOwner = doc.createUser === this.app.uid;
    this.modal = new window.bootstrap.Modal("#embeddingSettingsModal", {});

    this.pinecone_secret_input.value = this.documentData.pineconeSecret ? this.documentData.pineconeSecret : "";
    this.pinecone_environment_input.value = this.documentData.pineconeEnvironment ? this.documentData.pineconeSecret : "";
    this.pinecone_top_k_input.value = this.documentData.pineconeTopK ? this.documentData.pineconeTopK : "";
    this.pinecone_index_input.value = this.documentData.pineconeIndex ? this.documentData.pineconeIndex : "";

    this.modal.show();
  }
}
