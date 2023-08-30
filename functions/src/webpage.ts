import fs from "fs";
import Handlebars from "handlebars";

export default class WebPage {
    static async homeHTML(req: any, res: any): Promise<any> {
        return new Promise((resolve: any) => {
            fs.readFile('./html/home.html', async (err: any, html: any) => {
                if (err) {
                    throw err;
                }

                const outHTML = html.toString();
                const template = Handlebars.compile(outHTML);
                resolve((<any>res).status(200).send(template({})));
            });
        });
    }
}