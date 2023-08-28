import BaseApp from "./baseapp.js";
declare const firebase: any;
declare const window: any;

/** static functions for UI and api calls  */
export default class ChatDocument {
  static bulkEmailSubjectTemplate = `{{displayName}} invited you to a Unacog Session`;
  static bulkEmailBodyTemplate = `Dear {{name}},
  {{title}} - {{bulkLabel}}

  Use this link to join - {{link}}
  
  Session hosted by: {{displayName}}
  
  feedback: support@unacog.com

From
{{displayName}}`;

  /** import ticket to api
   * @param { string } documentId chat doc id
   * @param { Array<any> } importedTickets imported ticket array
   * @param { any } basePath API basePath
   * @return { Promise<boolean> } returns true if error
  */
  static async sendImportTicketToAPI(documentId: string, importedTickets: Array<any>, basePath: string): Promise<boolean> {
    const body = {
      gameNumber: documentId,
      importedTickets,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(basePath + "lobbyApi/session/message/import", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(body),
    });
    const json = await fResult.json();
    if (!json.success) {
      console.log("message post error", json);
      return true;
    }
    return false;
  }
  /**
   * @param { Array<any> } tickets raw import tickets
   * @return { any } array prompt/completion data and system message
  */
  static processImportTicketsToUpload(tickets: Array<any>): any {
    const recordsToUpload: any = [];
    let systemMessage = "";
    for (let c = 0, l = tickets.length; c < l; c++) {
      const ticket: any = tickets[c];

      if (ticket.system) {
        systemMessage = ticket.system;
      } else {
        recordsToUpload.push({
          prompt: ticket.prompt,
          completion: ticket.completion,
          selected: ticket.selected,
        });
      }
    }
    return {
      recordsToUpload,
      systemMessage,
    };
  }
  /**
   * @param { any } fileInput DOM file input element
   * @return { Promise<Array<any>> } array of data
  */
  static async getImportDataFromDomFile(fileInput: any): Promise<Array<any>> {
    if (!fileInput.files[0]) {
      return [];
    }

    const fileContent = await fileInput.files[0].text();
    let formatFilter = "json";
    if (fileInput.files[0].name.slice(-4).toLowerCase() === ".csv") formatFilter = "csv";

    try {
      let records: Array<any> = [];
      if (formatFilter === "json") {
        records = JSON.parse(fileContent);
      } else {
        const result = window.Papa.parse(fileContent, {
          header: true,
        });
        records = result.data;
      }

      return records;
    } catch (importError) {
      console.log("Import ERROR", importError);
      return [];
    }
  }
  /**
   * @param { any } ticketData
   * @param { any } assistData
   * @return { boolean } true if ticket running
  */
  static isTicketRunning(ticketData: any, assistData: any = null): boolean {
    return !assistData || assistData.submitted !== ticketData.submitted;
  }
  /** return document shared status for a doc
   * @param { any } doc document
   * @param { string } uid user
   * @return { number } 0 for owner, not shared, 1 for shared not owner, 2 for owner and shared
   */
  static getDocumentSharedStatus(doc: any, uid: string) {
    let sharedStatus = 0;
    let memberCount = 0;
    if (doc.members) memberCount = Object.keys(doc.members).length;

    if (memberCount > 1) {
      if (doc.createUser === uid) sharedStatus = 1;
      else sharedStatus = 2;
    }

    return sharedStatus;
  }
  /**
   * @param { string } id doc id
   * @param { any } doc data from doc.data()
   * @param { string } ownerUid user to test for owner
   * @return { any } html and uid for user
  */
  static getSharedUser(id: string, doc: any, ownerUid: string): any {
    const status = ChatDocument.getDocumentSharedStatus(doc, ownerUid);
    let html = "";
    let uid = "";

    if (status === 2) {
      uid = doc.createUser;
    }

    if (status === 1) {
      let members: any = {};
      if (doc.members) members = doc.members;
      let membersList = Object.keys(members);
      membersList = membersList.sort((a: string, b: string) => {
        if (doc.members[a] > doc.members[b]) return -1;
        if (doc.members[a] < doc.members[b]) return 1;
        return 0;
      });
      let member = "";
      for (let c = 0, l = membersList.length; c < l; c++) {
        if (membersList[c] !== ownerUid) {
          member = membersList[c];
          break;
        }
      }
      if (member) {
        uid = member;
      }
    }

    if (uid) {
      html = `
      <div>
        <span class="dashboard_user_image member_profile_image" docid="${id}" uid="${uid}"></span>
        <div class="members_feed_online_status member_online_status" sessionid="${id}" data-uid="${uid}"></div>
      </div>
      <div class="dasboard_user_name member_profile_name" docid="${id}" uid="${uid}"></div>`;
    }

    return {
      html,
      uid,
    };
  }
  /** generate export data
   * @param { any } docData document data
   * @param { any } lastTicketsSnapshot from the session app
   * @param { any } assistsLookup map of assist docs
   * @param { boolean } allTickets true to force all tickets included
   * @param { string } fileFormat output format (Text, HTML, CSV and JSON)
   * @return { string } text for selected format and tickets
  */
  static generateExportData(docData: any, lastTicketsSnapshot: any, assistsLookup: any, allTickets: boolean, fileFormat: string): any {
    if (!lastTicketsSnapshot) {
      return {
        resultText: "",
        format: "",
        fileName: "",
      };
    }

    let resultText = "";
    const tickets: Array<any> = [];
    lastTicketsSnapshot.forEach((ticket: any) => {
      if (ticket.data().includeInMessage || allTickets) tickets.unshift(ticket);
    });

    let format = "";
    let fileName = "";
    let displayText = "";
    let systemMessage = "";
    if (docData.systemMessage) systemMessage = docData.systemMessage;

    if (fileFormat === "JSON") {
      format = "application/json";
      fileName = "export.json";
      if (docData.title) fileName = docData.title.substring(0, 50) + ".json";

      const rows: any = [];
      if (systemMessage) {
        rows.push({
          prompt: "",
          completion: "",
          selected: "",
          system: systemMessage,
        });
      }
      tickets.forEach((ticket: any) => {
        rows.push({
          prompt: ticket.data().message,
          completion: ChatDocument.messageForCompletion(assistsLookup, ticket.id),
          selected: ticket.data().includeInMessage ? "y" : "n",
          system: "",
        });
      });
      const jsonText = JSON.stringify(rows, null, "  ");
      resultText = jsonText;
      displayText = BaseApp.escapeHTML(resultText);
    } else if (fileFormat === "CSV") {
      format = "application/csv";
      fileName = "export.csv";
      if (docData.title) fileName = docData.title.substring(0, 50) + ".csv";

      const rows: any = [];
      if (systemMessage) {
        rows.push({
          prompt: "",
          completion: "",
          selected: "",
          system: systemMessage,
        });
      }
      tickets.forEach((ticket: any) => {
        rows.push({
          prompt: ticket.data().message,
          completion: ChatDocument.messageForCompletion(assistsLookup, ticket.id),
          selected: ticket.data().includeInMessage ? "y" : "n",
          system: "",
        });
      });
      const csvText = window.Papa.unparse(rows);
      resultText = csvText;
      displayText = BaseApp.escapeHTML(resultText);
    } else if (fileFormat === "Text") {
      format = "plain/text";
      fileName = "report.txt";
      // resultText += "Exported: " + new Date().toISOString().substring(0, 10) + "\n";
      tickets.forEach((ticket: any) => {
        const completion = ChatDocument.messageForCompletion(assistsLookup, ticket.id);
        const prompt = ticket.data().message;

        resultText += "Prompt:\n" + prompt + "\n\n";
        if (completion) resultText += "Assist:\n" + completion + "\n";
        resultText += "\n";
        displayText = BaseApp.escapeHTML(resultText);
      });
    } else if (fileFormat === "HTML") {
      fileName = "report.html";
      format = "text/html";
      tickets.forEach((ticket: any) => {
        const prompt = BaseApp.escapeHTML(ticket.data().message);
        const completion = BaseApp.escapeHTML(ChatDocument.messageForCompletion(assistsLookup, ticket.id));
        const selected = ticket.data().includeInMessage ? "✅ " : "🔲 ";

        resultText += `<div class="ticket-item">\n`;
        resultText += `    <div class="prompt-text">${selected} ${prompt}</div>\n`;
        resultText += `    <br>\n`;
        resultText += `    <div class="completion-text">${completion}</div>\n`;
        resultText += `    <br>\n`;
        resultText += `</div>`;
        displayText = resultText;
      });
    }

    return {
      displayText,
      resultText,
      format,
      fileFormat,
      fileName,
    };
  }
  /** check for assist message
   * @param { any } assistsLookup map of assist docs
  * @param { string } assistId ticket id to check for assist
  * @return { any } message
  */
  static messageForCompletion(assistsLookup: any, assistId: string): string {
    try {
      const assistData: any = assistsLookup[assistId];
      if (!assistData || !assistData.assist || !assistData.assist.choices ||
        !assistData.assist.choices["0"] || !assistData.assist.choices["0"].message ||
        !assistData.assist.choices["0"].message.content) return "";
      return assistData.assist.choices["0"].message.content;
    } catch (assistError: any) {
      console.log(assistError);
      return "";
    }
  }
  /** min and max returned in multiples of 20
   * @param { string } name model name
   * @return { any } returns model meta (contextualLimit, completionMax, completionMin)
  */
  static getModelMeta(name = ""): any {
    let contextualLimit = 4096;
    let defaultCompletion = 500;
    let completionMax = 2048;
    let type = "gpt";
    const completionMin = 20;
    let temperature = 1;
    if (name === "gpt-3.5-turbo-16k") {
      contextualLimit = 16394;
      defaultCompletion = 2000;
      completionMax = 4000;
    }
    if (name === "gpt-4") {
      contextualLimit = 8192;
      defaultCompletion = 1000;
      completionMax = 4000;
    }
    if (name === "chat-bison-001") {
      contextualLimit = 8192;
      defaultCompletion = 1000;
      completionMax = 3000;
      type = "bard";
      temperature = 0.2;
    }
    const defaults = {
      max_tokens: defaultCompletion,
      temperature,
      top_p: 1,
      top_k: 40,
      presence_penalty: 0,
      frequency_penalty: 0,
    };
    return {
      contextualLimit,
      completionMax,
      completionMin,
      defaultCompletion,
      type,
      defaults,
    };
  }
}
