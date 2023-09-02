import fs from "fs";
import Handlebars from "handlebars";
import SharedWithBackend from "./uicode/sharedwithbackend";

/** */
export default class WebPage {
    /** http endpoint for generating homepage
    * @param { any } req http request object
    * @param { any } res http response object
    */
    static async homeHTML(req: any, res: any): Promise<any> {
        return new Promise((resolve: any) => {
            const rawPrices = WebPage.generateRawPricingRows();
            const tokensPerCredit = SharedWithBackend.generateCreditPricingRows();
            fs.readFile("./html/home.html", async (err: any, html: any) => {
                if (err) {
                    throw err;
                }
                const flyerHTML = SharedWithBackend.getFlyerListTemplate();
                const outHTML = html.toString();
                const template = Handlebars.compile(outHTML);
                resolve((<any>res).status(200).send(template({
                    flyerHTML,
                    rawPrices,
                    tokensPerCredit,
                })));
            });
        });
    }
    /**
     * @return { string } html for table rows
     */
    static generateRawPricingRows(): string {
        const models = SharedWithBackend.getModels();
        let html = "";
        html += `<tr>
        <th>Model</th>
        <th>Input</th>
        <th>Output</th>
    </tr>`;
        const modelNames = Object.keys(models);
        modelNames.forEach((model: string) => {
            html += `<tr>
            <td>${model}</td>
            <td>${models[model].input}</td>
            <td>${models[model].output}</td>
            </tr>`;
        });

        return html;
    }
}
