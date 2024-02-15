import {
    EmbeddingApp,
} from "./embeddingapp";
import {
    DashboardApp,
} from "./dashboardapp";
import {
    SessionApp,
} from "./sessionapp";
import {
    StaticPageApp,
} from "./staticpageapp";
import {
    initializeApp,
} from "firebase/app";

window.addEventListener("load", async () => {
    const response = await fetch("/__/firebase/init.json");
    const config = await response.json();
    initializeApp(config);

    const firstSlug = window.location.pathname.split("/")[1];
    if (firstSlug === "embedding") (<any>window).AppInstance = new EmbeddingApp();
    else if (firstSlug === "") (<any>window).AppInstance = new DashboardApp();
    else if (firstSlug === "session") (<any>window).AppInstance = new SessionApp();
    else (<any>window).AppInstance = new StaticPageApp();

    if ((<any>window).document.body.classList.contains("static_page")) {
        (<any>window).AppInstance.login.disableReload = true;
    }
});
