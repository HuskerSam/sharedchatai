/** for showing popup with iframe /help directory files  */
export class HelpHelper {
    app: any = null;
    modalContainer: any = null;
    help_show_modal: any;
    help_viewer_iframe: any;
    wrapperClass = "";
    help_dialog_header: any = null;
    /**
     * @param { any } app BaseApp derived application instance
     * @param { string } wrapperClass class to add to modal wrapper
     */
    constructor(app: any, wrapperClass = "") {
        this.app = app;
        this.wrapperClass = wrapperClass;
        this.addModalToDOM();
    }
    /** instaniate and add modal #loginModal */
    addModalToDOM() {
        const html = this.getModalTemplate();
        this.modalContainer = document.createElement("div");
        this.modalContainer.innerHTML = html;
        document.body.appendChild(this.modalContainer);
        if (this.wrapperClass) this.modalContainer.classList.add(this.wrapperClass);

        this.help_show_modal = document.querySelector(".help_show_modal");
        this.help_viewer_iframe = document.querySelector(".help_viewer_iframe");
        this.help_dialog_header = document.querySelector(".help_dialog_header");
    }
    /** template as string for modal
    * @return { string } html template as string
    */
    getModalTemplate() {
        return `<div class="modal fade scrollable_modal" id="helpIframeModal" tabindex="-1" aria-labelledby="helpIframeModalLabel"
        aria-hidden="true">
        <div class="modal-dialog app_panel">
            <div class="modal-content app_panel">
                <div class="modal-header">
                    <h5 class="modal-title help_dialog_header" id="helpIframeModalLabel">Help Information</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <iframe class="help_viewer_iframe"></iframe>
                </div>
                <div class="modal-footer">
                    <div style="flex:1"></div>
                    <button type="button" class="btn btn-secondary modal_close_button"
                        data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>`;
    }
    /** populate modal fields and show for help viewer
     *  @param { string } topic /helphtml/[topic].html is loaded into help viewer
    */
    show(topic: string) {
        this.help_viewer_iframe.src = "/helphtml/" + topic + ".html";
        this.help_dialog_header.innerHTML = topic.charAt(0).toUpperCase() + topic.slice(1);
        this.help_show_modal.click();
        return;
    }
}
