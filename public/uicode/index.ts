import { EmbeddingApp } from "./embeddingapp";
import { DashboardApp } from "./dashboardapp";
import { SessionApp } from "./sessionapp";
import { StaticPageApp } from "./staticpageapp";
declare const window: any;

window.addEventListener("load", async () => {
    const firstSlug = window.location.pathname.split("/")[1];
    if (firstSlug === "embedding") window.EmbeddingApp = new EmbeddingApp();
    else if (firstSlug === "") window.StaticPageApp = new DashboardApp();
    else if (firstSlug === "session") window.SessionApp = new SessionApp();
    else window.StaticPageApp = new StaticPageApp();
});