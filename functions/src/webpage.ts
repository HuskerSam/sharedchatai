import fs from "fs";
import fsp from "fs/promises";
import Handlebars from "handlebars";
import SharedWithBackend from "./../../public/uicode/sharedwithbackend";

/** */
export default class WebPage {
    /** http endpoint for generating content page
    * @param { any } req http request object
    * @param { any } res http response object
    */
    static async contentHTML(req: any, res: any): Promise<any> {
        const news = SharedWithBackend.getNews();
        let contentItem: any = null;
        news.forEach((item: any) => {
            if (req.path === item.link) contentItem = item;
        });

        if (!contentItem) return res.status(404).send("Page Not Found");
        const contentFile = await fsp.readFile("." + contentItem.link.slice(0, -1) + ".html");
        const templateFile = await fsp.readFile("./content/template.html");
        const outHTML = templateFile.toString();
        const template = Handlebars.compile(outHTML);
        const content = contentFile.toString();
        return res.status(200).send(template({
            content,
            contentItem,
        }));
    }
    /** http endpoint for generating homepage
    * @param { any } req http request object
    * @param { any } res http response object
    */
    static async aboutHTML(req: any, res: any): Promise<any> {
        return new Promise((resolve: any) => {
            const rawPrices = WebPage.generateRawPricingRows();
            const flyerHTML = SharedWithBackend.getFlyerListTemplate();
            const tokensPerCredit = SharedWithBackend.generateCreditPricingRows();
            fs.readFile("./html/about.html", async (err: any, html: any) => {
                if (err) {
                    throw err;
                }
                const outHTML = html.toString();
                const template = Handlebars.compile(outHTML);
                resolve((<any>res).status(200).send(template({
                    rawPrices,
                    flyerHTML,
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
    /** http endpoint for generating sitemap
    * @param { any } req http request object
    * @param { any } res http response object
    */
    static async generateSiteXMLMap(req: any, res: any): Promise<any> {
        res.set("Access-Control-Allow-Origin", "*");
        if (req.method === "GET") {
            const html = await WebPage.getSiteMap();
            res.set("Content-Type", "text/xml");
            return res.status(200).send(html);
        }
        return res.send("GET Only");
    }
    /** */
    static async getSiteMap() {
        let rowsXML = "";

        SharedWithBackend.getNews().forEach((item: any) => {
            if (item.link.substring(0, 4) !== "http") {
                rowsXML += `<url>
            <loc>https://unacog.com${item.link}</loc>
            <changefreq>daily</changefreq>
            <priority>1</priority>
        </url>
        `;
            }
        });

        return `<?xml version="1.0" encoding="utf-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
      <url>
          <loc>https://unacog.com</loc>
          <lastmod>${new Date().toISOString().substring(0, 10)}</lastmod>
          <changefreq>daily</changefreq>
          <priority>1</priority>
      </url>
      <url>
      <loc>https://unacog.com/help/</loc>
      <lastmod>${new Date().toISOString().substring(0, 10)}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1</priority>
    </url>
     <url>
          <loc>https://unacog.com/embedding/</loc>
          <lastmod>${new Date().toISOString().substring(0, 10)}</lastmod>
          <changefreq>daily</changefreq>
          <priority>1</priority>
      </url>
      <url>
      <loc>https://unacog.com/about/</loc>
      <lastmod>${new Date().toISOString().substring(0, 10)}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1</priority>
  </url>
      ${rowsXML}
  </urlset>`;
    }
}
