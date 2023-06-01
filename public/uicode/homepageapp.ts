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
}
