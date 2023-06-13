/** for showing popup with iframe /help directory files  */
export default class HelpHelper {
    app: any = null;
    modalContainer: any = null;
    help_show_modal: any;
    help_viewer_iframe: any;
    wrapperClass = "";
    help_dialog_header: any = null;
    help_dialog_close_button: any = null;
    help_navigation_bar: any = null;
    helpTopic = "";
    helpContentData: Array<any> = [];
    currentHelpData: any = {};
    /**
     * @param { any } app BaseApp derived application instance
     * @param { string } wrapperClass class to add to modal wrapper
     */
    constructor(app: any, wrapperClass = "") {
        this.app = app;
        this.wrapperClass = wrapperClass;
        this.addModalToDOM();

        this.modalContainer.addEventListener("hidden.bs.modal", () => {
            if (document.body.querySelector(".modal.show")) document.body.classList.add("modal-open");
        });
    }
    /** instaniate and add modal #loginModal */
    addModalToDOM() {
        const html = this.getModalTemplate();
        this.modalContainer = document.createElement("div");
        this.modalContainer.innerHTML = html;
        document.body.appendChild(this.modalContainer);
        this.help_dialog_close_button = this.modalContainer.querySelector(".help_dialog_close_button");
        if (this.wrapperClass) this.modalContainer.classList.add(this.wrapperClass);

        /*
        this.modalContainer.children[0].addEventListener("shown.bs.modal", () => {
            this.help_dialog_close_button.focus();
        });
        */
        this.help_show_modal = document.querySelector(".help_show_modal");
        this.help_viewer_iframe = document.querySelector(".help_viewer_iframe");
        this.help_dialog_header = document.querySelector(".help_dialog_header");
        this.help_navigation_bar = document.querySelector(".help_navigation_bar");
    }
    /** init content from json file
     * @param { string } topic json topic
    */
    async loadHelpDetails(topic = "") {
        this.helpTopic = topic;
        if (this.helpContentData.length === 0) {
            this.helpContentData = await this.readJSONFile("/helphtml/help.json");
        }
        let html = "";
        this.helpContentData.forEach((data: any) => {
            if (this.helpTopic === data.topic) {
                this.currentHelpData = data;
                html += `<a>${data.title}</a>`;
            } else {
                html += `<a href="${data.topic}">${data.title}</a>`;
            }
        });
        this.help_navigation_bar.innerHTML = html;
        this.help_navigation_bar.querySelectorAll("a").forEach((anchor: any) => {
            anchor.addEventListener("click", (event: any) => {
                event.stopPropagation();
                event.preventDefault();
                if (!anchor.getAttribute("href")) return;
                this.loadHelpDetails(anchor.getAttribute("href"));
            });
        });

        this.help_viewer_iframe.src = "/helphtml/" + this.currentHelpData.topic + ".html";
        this.help_dialog_header.innerHTML = this.currentHelpData.title;
    }
    /** template as string for modal
    * @return { string } html template as string
    */
    getModalTemplate() {
        return `<div class="modal fade scrollable_modal" id="helpIframeModal" tabindex="-1" aria-labelledby="helpIframeModalLabel"
        aria-hidden="true">
        <div class="modal-dialog app_panel  modal-lg">
            <div class="modal-content app_panel">
                <div class="modal-header">
                    <h5 class="modal-title" id="helpIframeModalLabel">
                        <span class="dialog_header_icon"><i class="material-icons">help</i></span>
                        Help - 
                        <span class="help_dialog_header"></span>
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="help_navigation_bar"></div>
                    <iframe class="help_viewer_iframe" tabindex="1"></iframe>
                </div>
                <div class="modal-footer">
                    <div style="flex:1"></div>
                    <button type="button" class="btn btn-primary modal_close_button help_dialog_close_button"
                        data-bs-dismiss="modal">
                        <i class="material-icons">cancel</i>
                        Close</button>
                </div>
            </div>
        </div>
    </div>`;
    }
    /** populate modal fields and show for help viewer
     *  @param { string } topic /helphtml/[topic].html is loaded into help viewer
     * @param { any } event dom event to prevent default
    */
    async show(topic: string, event: any = null) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        await this.loadHelpDetails(topic);
        this.help_show_modal.click();
        return;
    }
    /** reads a json file async and sets window.varName to it's value
     * @param { string } path url to json data
     * @return { any } file contents or {}
     */
    async readJSONFile(path: string): Promise<any> {
        try {
            const response = await fetch(path);
            return await response.json();
        } catch (e) {
            console.log("ERROR with download of " + path, e);
            return {};
        }
    }
}
