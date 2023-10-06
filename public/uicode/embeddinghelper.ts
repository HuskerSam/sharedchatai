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

    this.pinecone_environment_input = this.modalContainer.querySelector(".pinecone_environment_input");
    this.pinecone_top_k_input = this.modalContainer.querySelector(".pinecone_top_k_input");
    this.pinecone_index_input = this.modalContainer.querySelector(".pinecone_index_input");
  }
  /** */
  async savePineconeSettings() {
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
                    <td>Pinecone Index</td>
                    <td class="pinecone_index_input"></td>
                    <td>
                      <button class="btn btn-secondary prompt_for_new_pinecone_index">
                      <i class="material-icons">edit</i></button>
                    </td>
                  </tr>
                  <tr>
                      <td>Environment</td>
                      <td class="pinecone_environment_input"></td>
                      <td>
                        <button class="btn btn-secondary prompt_for_new_pinecone_environment">
                        <i class="material-icons">edit</i></button>
                      </td>
                  </tr>
                  <tr>
                      <td>Top K</td>
                      <td class="pinecone_top_k_input"></td>
                      <td>
                        <button class="btn btn-secondary prompt_for_new_pinecone_top_k">
                        <i class="material-icons">edit</i></button>
                      </td>
                  </tr>
              </table>
              <hr>
              <table class="pinecone_inputs_table">
              <tr>
                <td>Pinecone Key</td>
                    <td>No secret configured</td>
                </tr>
                <tr>
                  <td colspan="2" style="text-align:right;">
                    <button class="btn btn-secondary btn_clear_pinecone_secret">Clear</button>
                    <button class="btn btn-secondary btn_set_pinecone_secret">Set</button>
                  </td>
              </tr>
              </table>
              <hr>
              <table class="pinecone_inputs_table">
                  <tr>
                    <td>Embedding API Secret</td>
                      <td class="embedding_api_secret_input">No secret configured</td>
                  </tr>
                  <tr>
                      <td colspan="2" style="text-align:right;">
                        <button class="btn btn-secondary btn_clear_external_secret">Clear</button>
                        <button class="btn btn-secondary btn_view_external_secret">View</button>
                        <button class="btn btn-secondary btn_generate_external_secret">Generate</button>
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

    this.pinecone_environment_input.value = this.documentData.pineconeEnvironment ? this.documentData.pineconeSecret : "";
    this.pinecone_top_k_input.value = this.documentData.pineconeTopK ? this.documentData.pineconeTopK : "";
    this.pinecone_index_input.value = this.documentData.pineconeIndex ? this.documentData.pineconeIndex : "";

    this.modal.show();
  }
}
