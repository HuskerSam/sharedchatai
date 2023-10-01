declare const firebase: any;
declare const window: any;

/** login dialog helper - displays automatically if not home page */
export default class PineconeHelper {
  app: any = null;
  modalContainer: any = null;
  modal: any = null;

  /**
   * @param { any } app baseapp derived instance
   */
  constructor(app: any) {
    this.app = app;
    const html = this.getModalTemplate();
    this.modalContainer = document.createElement("div");
    this.modalContainer.innerHTML = html;
    document.body.appendChild(this.modalContainer);

    const modal: any = document.getElementById("embeddingSettingsModal");
    modal?.addEventListener("hidden.bs.modal", () => {
    });
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

        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            <i class="material-icons">cancel</i>
            Close
        </button>
        </div>
      </div>
    </div>
  </div>`;
  }
  /** */
  show() {
    this.modal = new window.bootstrap.Modal("#embeddingSettingsModal", {});
    this.modal.show();
  }
}
