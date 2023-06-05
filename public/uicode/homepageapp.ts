import BaseApp from "./baseapp.js";
import LoginHelper from "./loginhelper.js";
import DocCreateHelper from "./doccreatehelper.js";
import ProfileHelper from "./profilehelper.js";

/** Guess app class */
export class HomePageApp extends BaseApp {
    login = new LoginHelper(this);
    documentCreate = new DocCreateHelper(this);
    profileHelper = new ProfileHelper(this);
    show_profile_modal: any = document.querySelector(".show_profile_modal");
    show_create_modal: any = document.querySelector(".show_create_modal");
    checkTemplateURL = false;
    /** */
    constructor() {
        super();
        this.show_profile_modal.addEventListener("click", (event: any) => {
            event.stopPropagation();
            event.preventDefault();

            this.profileHelper.show();
        });
        this.show_create_modal.addEventListener("click", (event: any) => {
            event.stopPropagation();
            event.preventDefault();

            this.documentCreate.show();
        });

    }
    authUpdateStatusUI(): void {
        if (this.profile) {
            if (!this.checkTemplateURL) {
                this.checkTemplateURL = true;
                const title = this.urlParams.get("title");
                if (title) this.documentCreate.create_modal_title_field.value = title;
                const templatePath = this.urlParams.get("templatepath");
                if (templatePath) this.showCreateDialog(templatePath);
            }
        }
    }
    async showCreateDialog(templatePath: string) {
        const templateData = await this.readJSONFile(templatePath, "importTemplateFilePath");
        const pathParts = templatePath.split("/");
        const fileName = pathParts[pathParts.length - 1];
        const file = new File([JSON.stringify(templateData)], fileName, {type: 'application/json'});
        const transfer = new DataTransfer();
        transfer.items.add(file);
        this.documentCreate.create_modal_template_file.files = transfer.files;
        const templateRows = await this.documentCreate.updateParsedFileStatus();
        if (!templateRows || templateRows.length === 0) {
            this.documentCreate.create_modal_template_file.value = "";
            alert("not importable rows round");
        } else {
            this.documentCreate.show();
        }

    }
}
