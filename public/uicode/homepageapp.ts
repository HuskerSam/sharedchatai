import BaseApp from "./baseapp.js";
import LoginHelper from "./loginhelper.js";

/** Guess app class */
export class HomePageApp extends BaseApp {
    login = new LoginHelper(this);
    /** */
    constructor() {
        super();
    }
}
