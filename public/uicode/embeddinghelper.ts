import ChatDocument from "./chatdocument.js";
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
  prompt_for_new_pinecone_index: any;
  prompt_for_new_pinecone_environment: any;
  prompt_for_new_pinecone_top_k: any;
  btn_set_pinecone_secret: any;
  btn_clear_pinecone_secret: any;
  btn_generate_external_secret: any;
  btn_clear_external_secret: any;
  pineconeFields = [
    "",
  ];
  ownerOnlyData: any = {};

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

    this.prompt_for_new_pinecone_index = this.modalContainer.querySelector(".prompt_for_new_pinecone_index");
    this.prompt_for_new_pinecone_index.addEventListener("click", () => this.setPineconeField("pineconeIndex"));

    this.prompt_for_new_pinecone_environment = this.modalContainer.querySelector(".prompt_for_new_pinecone_environment");
    this.prompt_for_new_pinecone_environment.addEventListener("click", () => this.setPineconeField("pineconeEnvironment"));

    this.prompt_for_new_pinecone_top_k = this.modalContainer.querySelector(".prompt_for_new_pinecone_top_k");
    this.prompt_for_new_pinecone_top_k.addEventListener("click", () => this.setPineconeField("pineconeTopK"));

    this.btn_set_pinecone_secret = this.modalContainer.querySelector(".btn_set_pinecone_secret");
    this.btn_set_pinecone_secret.addEventListener("click", () => this.setPineconeField("pineconeSecret"));

    this.btn_clear_pinecone_secret = this.modalContainer.querySelector(".btn_clear_pinecone_secret");
    this.btn_clear_pinecone_secret.addEventListener("click", () => this.setPineconeField("pineconeSecret", true));

    this.btn_generate_external_secret = this.modalContainer.querySelector(".btn_generate_external_secret");
    this.btn_generate_external_secret.addEventListener("click", () => this.setExternalSecret());

    this.btn_clear_external_secret = this.modalContainer.querySelector(".btn_clear_external_secret");
    this.btn_clear_external_secret.addEventListener("click", () => this.setExternalSecret(true));
  }
  /** 
   * @param { boolean } clear
  */
  async setExternalSecret(clear = false) {
    let newSecret = this.app.uuidv4();
    if (clear) newSecret = "";
    await ChatDocument.setOwnerOnlyField(this.chatDocumentId, this.app.basePath, "externalSessionAPIKey", newSecret);
    await this.updateDisplayData();
  }
  /**
   * @param { string } field
   * @param { boolean } clear
   */
  async setPineconeField(field: string, clear = false) {
    let value = this.ownerOnlyData[field];
    if (value === undefined) value = "";
    if (field === "pineconeSecret") value = "";
    let newValue: any = "";
    let cancel = false;

    if (!clear) {
      newValue = prompt("Value for " + field, value);
      if (newValue !== null) {
        newValue = newValue.trim();
        newValue = newValue.substring(0, 5000);

        if (field === "pineconeSecret" && newValue === "") {
          alert("Please provide a value for pineconeSecret");
          cancel = true;
        }
      } else {
        cancel = true;
      }
    }

    if (!cancel) {
      await ChatDocument.setOwnerOnlyField(this.chatDocumentId, this.app.basePath, field, newValue);
      await this.updateDisplayData();
    }
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
                    <td class="pineconeIndex_display">loading...</td>
                    <td>
                      <button class="btn btn-secondary prompt_for_new_pinecone_index">
                      <i class="material-icons">edit</i></button>
                    </td>
                  </tr>
                  <tr>
                      <td>Environment</td>
                      <td class="pineconeEnvironment_display"></td>
                      <td>
                        <button class="btn btn-secondary prompt_for_new_pinecone_environment">
                        <i class="material-icons">edit</i></button>
                      </td>
                  </tr>
                  <tr>
                      <td>Top K</td>
                      <td class="pineconeTopK_display"></td>
                      <td>
                        <button class="btn btn-secondary prompt_for_new_pinecone_top_k">
                        <i class="material-icons">edit</i></button>
                      </td>
                  </tr>
              <tr>
                <td>Pinecone Key</td>
                  <td class="pineconeSecret_display"></td>
                  <td style="white-space:nowrap">
                    <button class="btn btn-secondary btn_clear_pinecone_secret">
                      <i class="material-icons">delete</i>
                    </button>
                    <button class="btn btn-secondary btn_set_pinecone_secret">
                      <i class="material-icons">edit</i></button>
                    </button>
                  </td>
              </tr>
                  <tr>
                    <td>API Secret</td>
                      <td class="externalSessionAPIKey_display">None</td>
                      <td style="white-space:nowrap">
                        <button class="btn btn-secondary btn_clear_external_secret">
                          <i class="material-icons">delete</i>
                        </button>
                        <button class="btn btn-secondary btn_generate_external_secret">
                          <i class="material-icons">casino</i>
                        </button>
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
  async updateDisplayData() {
    this.ownerOnlyData = await ChatDocument.fetchOwnerOnlyData(this.chatDocumentId, this.app.basePath);

    let pIndex = this.ownerOnlyData.pineconeIndex;
    if (pIndex === undefined) pIndex = "";
    this.modalContainer.querySelector(".pineconeIndex_display").innerHTML = pIndex;

    let pEnv = this.ownerOnlyData.pineconeEnvironment;
    if (pEnv === undefined) pEnv = "";
    this.modalContainer.querySelector(".pineconeEnvironment_display").innerHTML = pEnv;

    let topK = this.ownerOnlyData.pineconeTopK;
    if (topK === undefined) topK = "";
    this.modalContainer.querySelector(".pineconeTopK_display").innerHTML = topK;

    const pSecret = this.ownerOnlyData.pineconeSecret ? "Loaded" : "None";
    this.modalContainer.querySelector(".pineconeSecret_display").innerHTML = pSecret;

    let externalKey = this.ownerOnlyData.externalSessionAPIKey;
    if (externalKey === undefined) externalKey = "";
    this.modalContainer.querySelector(".externalSessionAPIKey_display").innerHTML = externalKey;
  }
  /**
   * @param { string } chatDocumentId
   * @param { any } doc
   */
  async show(chatDocumentId: string, doc: any) {
    this.chatDocumentId = chatDocumentId;
    this.documentData = doc;
    this.isOwner = doc.createUser === this.app.uid;
    this.modal = new window.bootstrap.Modal("#embeddingSettingsModal", {});

    this.updateDisplayData();
    this.modal.show();
  }
}
