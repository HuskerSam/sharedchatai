import BaseApp from "./baseapp";
import SharedWithBackend from "./sharedwithbackend";

/** app class for content pages */
export class KlydeFeedHelper extends BaseApp {
    klyde_helper_news_feed_btn: any = document.querySelector(".klyde_helper_news_feed_btn");


    /**
     * @param { boolean } contentPage true if content page for all items
     */
    constructor() {
        super();

        this.klyde_helper_news_feed_btn.addEventListener("click", () => {
            this.addNewsEntry();
        });

    }
    async addNewsEntry() {
        let newsSiteList = ["url=https://apnews.com||clipCount=10||urlScrape=true||htmlElementsSelector=.Page-content .PagePromo-title a",
            "url=https://cnn.com||clipCount=5||urlScrape=true||htmlElementsSelector=.stack_condensed a",
            "url=https://english.news.cn/world/index.htm||clipCount=5||urlScrape=true||htmlElementsSelector=.part01 a",
        ];
        const promises: any[] = [];
        newsSiteList.forEach((newsSite: string) => {
            const newsSiteOptions = SharedWithBackend.processOptions(newsSite);

            promises.push((async () => {
                try {
                    const packet = { specialAction: "serverScrapeUrl", options: newsSite, url: newsSiteOptions.url };
                    const response = await (<any>window).chrome.runtime.sendMessage("jiodhbindaigedkochckfeocdjbgdeaa", packet);
                    return { response, url: newsSiteOptions.url };
                } catch (e: any) {
                    console.log("serverScrapeUrl error", e.message);
                    return {
                        success: false,
                        message: e.message,
                    };
                }
            })());

        });

        const results = await Promise.all(promises);
        const promptsList: any[] = [];
        results.forEach((result: any) => {
            if (result.response && result.response.success) {
                console.log("result", result);
                const pageUrls = result.response.response.text.split("\n").slice(0, 5);
                pageUrls.forEach((url: string) => {
                    promptsList.push({
                        url,
                        siteUrl: result.url,
                    });
                });
            }
        });
        console.log("promptsList", promptsList);

    }
}
