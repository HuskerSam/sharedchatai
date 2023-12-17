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
import {
    getFirestore,
} from "firebase/firestore";
import {
    getAuth,
} from "firebase/auth";

declare const window: any;
window.addEventListener("load", async () => {
    const response = await fetch("/__/firebase/init.json");
    const config = await response.json();
    const firebaseApp = initializeApp(config);
    window.firestoreDb = getFirestore(firebaseApp);
    window.firebaseAuth = getAuth(firebaseApp);
    window.firebaseApp = firebaseApp;

    const firstSlug = window.location.pathname.split("/")[1];
    if (firstSlug === "embedding") window.EmbeddingApp = new EmbeddingApp();
    else if (firstSlug === "") window.StaticPageApp = new DashboardApp();
    else if (firstSlug === "session") window.SessionApp = new SessionApp();
    else window.StaticPageApp = new StaticPageApp();
});
