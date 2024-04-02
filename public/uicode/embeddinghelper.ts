import ChatDocument from "./chatdocument";
import SharedWithBackend from "./sharedwithbackend";
import BaseApp from "./baseapp";
/** login dialog helper - displays automatically if not home page */
export default class PineconeHelper {
    app: BaseApp;
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
    prompt_for_new_pinecone_max_tokens: any;
    prompt_for_new_pinecone_threshold: any;
    ownerOnlyData: any = {};
    prompt_template_text_area: any;
    document_template_text_area: any;
    prompt_template_save_button: any;
    prompt_template_reset_button: any;
    btn_enable_chrome_extension: any;
    /**
     * @param { any } app baseapp derived instance
     */
    constructor(app: BaseApp) {
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

        this.prompt_for_new_pinecone_max_tokens = this.modalContainer.querySelector(".prompt_for_new_pinecone_max_tokens");
        this.prompt_for_new_pinecone_max_tokens.addEventListener("click", () => this.setPineconeField("pineconeMaxTokens"));

        this.btn_set_pinecone_secret = this.modalContainer.querySelector(".btn_set_pinecone_secret");
        this.btn_set_pinecone_secret.addEventListener("click", () => this.setPineconeField("pineconeKey"));

        this.btn_clear_pinecone_secret = this.modalContainer.querySelector(".btn_clear_pinecone_secret");
        this.btn_clear_pinecone_secret.addEventListener("click", () => this.setPineconeField("pineconeKey", true));

        this.btn_generate_external_secret = this.modalContainer.querySelector(".btn_generate_external_secret");
        this.btn_generate_external_secret.addEventListener("click", () => this.setExternalSecret());

        this.btn_clear_external_secret = this.modalContainer.querySelector(".btn_clear_external_secret");
        this.btn_clear_external_secret.addEventListener("click", () => this.setExternalSecret(true));

        this.prompt_for_new_pinecone_threshold = this.modalContainer.querySelector(".prompt_for_new_pinecone_threshold");
        this.prompt_for_new_pinecone_threshold.addEventListener("click", () => this.setPineconeField("pineconeThreshold"));

        this.prompt_template_text_area = this.modalContainer.querySelector(".prompt_template_text_area");
        this.document_template_text_area = this.modalContainer.querySelector(".document_template_text_area");

        this.prompt_template_save_button = this.modalContainer.querySelector(".prompt_template_save_button");
        this.prompt_template_save_button.addEventListener("click", () => this.savePromptTemplates());

        this.prompt_template_reset_button = this.modalContainer.querySelector(".prompt_template_reset_button");
        this.prompt_template_reset_button.addEventListener("click", () => this.resetPromptTemplates());

        this.btn_enable_chrome_extension = this.modalContainer.querySelector(".btn_enable_chrome_extension");
        this.btn_enable_chrome_extension.addEventListener("click", () => this.enableChromeExtension());
    }
    /** */
    async enableChromeExtension() {
        let externalKey = this.ownerOnlyData.externalSessionAPIKey;
        if (externalKey === undefined) externalKey = "";
        const response = await (<any>window).chrome.runtime.sendMessage("hkpikaghojmimbaepiiiheiheghlfafd", { 
            sessionId: this.app.documentId,
            apiToken: externalKey
          });
        // do something with response here, not outside the function
        console.log(response);
    }

    /**
     * @param { boolean } clear
    */
    async setExternalSecret(clear = false) {
        let newSecret = this.app.uuidv4();
        if (clear) newSecret = "";
        console.log("externalSessionAPIKey", newSecret);
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
        if (field === "pineconeKey") value = "";
        let newValue: any = "";
        let cancel = false;

        if (!clear) {
            newValue = prompt("Value for " + field, value);
            if (newValue !== null) {
                newValue = newValue.trim();
                newValue = newValue.substring(0, 5000);

                if (field === "pineconeKey" && newValue === "") {
                    alert("Please provide a value for pineconeKey");
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
        <div class="modal-content app_panel">
            <div class="modal-header">
                <h4 class="modal-title" id="loginModalLabel">Embedding Configuration</h4>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <ul class="nav nav-tabs mb-3" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active" id="pinecone_setup_tab_button" data-bs-toggle="tab"
                            href="#pinecone_setup_tab_view" role="tab" aria-controls="pinecone_setup_tab_view"
                            aria-selected="true">Pinecone Setup</a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="prompt_template_tab_button" data-bs-toggle="tab"
                            href="#prompt_template_tab_view" role="tab" aria-controls="prompt_template_tab_view"
                            aria-selected="false">Prompt Template</a>
                    </li>
                </ul>
                <div class="tab-content">
                    <div class="tab-pane fade show active" id="pinecone_setup_tab_view" role="tabpanel"
                        aria-labelledby="pinecone_setup_tab_button">
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
                                <td>Embedding Size</td>
                                <td class="pineconeMaxTokens_display"></td>
                                <td>
                                    <button class="btn btn-secondary prompt_for_new_pinecone_max_tokens">
                                        <i class="material-icons">edit</i></button>
                                </td>
                            </tr>
                            <tr>
                                <td>Similarity Score</td>
                                <td class="pineconeThreshold_display"></td>
                                <td>
                                    <button class="btn btn-secondary prompt_for_new_pinecone_threshold">
                                        <i class="material-icons">edit</i></button>
                                </td>
                            </tr>
                            <tr>
                                <td>Pinecone Key</td>
                                <td class="pineconeKey_display"></td>
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
                            <tr>
                                <td>Use for Chrome Extension</td>
                                <td class="chrome_extension_status"></td>
                                <td>
                                    <button class="btn btn-secondary btn_enable_chrome_extension">
                                        <i class="material-icons">extension</i></button>
                                </td>
                            </tr>
                        </table>
                    </div>
                    <div class="tab-pane fade" id="prompt_template_tab_view" role="tabpanel" aria-labelledby="prompt_template_tab_button">
                      <br>
                      <label>Prompt Template: </label><br>
                      <textarea style="height:15em;width:90%;" class="prompt_template_text_area"></textarea>
                      <br>
                      <br>
                      <label>Embed Template: </label><br>
                      <textarea style="height:5em;width:90%;" class="document_template_text_area"></textarea>
                      <br>
                      <br>
                      <div style="text-align: right;">
                          <button class="btn btn-secondary prompt_template_reset_button">Reset</button>
                          &nbsp;
                          <button class="btn btn-primary prompt_template_save_button">Save Templates</button>
                      </div>
                    </div>
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
        if (topK === undefined) topK = "3";
        this.modalContainer.querySelector(".pineconeTopK_display").innerHTML = topK;

        let pineconeMaxTokens = this.ownerOnlyData.pineconeMaxTokens;
        if (pineconeMaxTokens === undefined) pineconeMaxTokens = "2000";
        this.modalContainer.querySelector(".pineconeMaxTokens_display").innerHTML = pineconeMaxTokens;

        let pineconeThreshold = this.ownerOnlyData.pineconeThreshold;
        if (pineconeThreshold === undefined) pineconeThreshold = "0";
        this.modalContainer.querySelector(".pineconeThreshold_display").innerHTML = pineconeThreshold;

        const pSecret = this.ownerOnlyData.pineconeKey ? "Loaded" : "None";
        this.modalContainer.querySelector(".pineconeKey_display").innerHTML = pSecret;

        let externalKey = this.ownerOnlyData.externalSessionAPIKey;
        if (externalKey === undefined) externalKey = "";
        this.modalContainer.querySelector(".externalSessionAPIKey_display").innerHTML = externalKey;

        let promptTemplate = this.documentData.promptMainTemplate;
        let documentTemplate = this.documentData.promptDocumentTemplate;
        if (!promptTemplate) promptTemplate = SharedWithBackend.defaultPromptMainTemplate;
        if (!documentTemplate) documentTemplate = SharedWithBackend.defaultPromptDocumentTemplate;
        this.prompt_template_text_area.value = promptTemplate;
        this.document_template_text_area.value = documentTemplate;
    }
    /** */
    savePromptTemplates() {
        let promptTemplate = this.prompt_template_text_area.value.trim();
        let documentTemplate = this.document_template_text_area.value.trim();
        if (!promptTemplate) promptTemplate = SharedWithBackend.defaultPromptMainTemplate;
        if (!documentTemplate) documentTemplate = SharedWithBackend.defaultPromptDocumentTemplate;
        this.app.saveDocumentOption(this.chatDocumentId, "promptMainTemplate", promptTemplate);
        this.app.saveDocumentOption(this.chatDocumentId, "promptDocumentTemplate", documentTemplate);
    }
    /** */
    resetPromptTemplates() {
        this.prompt_template_text_area.value = SharedWithBackend.defaultPromptMainTemplate;
        this.document_template_text_area.value = SharedWithBackend.defaultPromptDocumentTemplate;
        this.savePromptTemplates();
    }
    /**
     * @param { string } chatDocumentId
     * @param { any } doc
     */
    async show(chatDocumentId: string, doc: any) {
        this.chatDocumentId = chatDocumentId;
        this.documentData = doc;
        this.isOwner = doc.createUser === this.app.uid;
        this.modal = new (<any>window).bootstrap.Modal("#embeddingSettingsModal", {});

        this.updateDisplayData();
        this.modal.show();
    }
}
