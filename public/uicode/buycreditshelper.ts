declare const firebase: any;
declare const window: any;

/** login dialog helper - displays automatically if not home page */
export default class BuyCreditsHelper {
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
    this.modal = new window.bootstrap.Modal("#buyCreditsModal", {});
  }
  /** get modal template
   * @return { string } template
   */
  getModalTemplate(): string {
    return `<div class="modal fade " id="buyCreditsModal" tabindex="-1" aria-labelledby="buyCreditsModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h4 class="modal-title" id="buyCreditsModalLabel">Buy Credits</h4>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            3 levels:
            <br>
            $5
            <br><br>
            $25
            <br><br>
            $100
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
    this.modal.show();
  }
}
