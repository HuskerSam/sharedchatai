declare const firebase: any;
declare const window: any;

/** static functions for UI and api calls  */
export default class ChatDocument {
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
   * @return { Array<any> } array prompt/completion data
  */
  static processImportTicketsToUpload(tickets: Array<any>): Array<any> {
    const recordsToUpload: any = [];
    for (let c = 0, l = tickets.length; c < l; c++) {
      const ticket: any = tickets[c];

      recordsToUpload.push({
        prompt: ticket.prompt,
        completion: ticket.completion,
        selected: ticket.selected,
      });
    }
    return recordsToUpload;
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
  static getSharedUser(id: string, doc: any, ownerUid: string): any  {
    const status = ChatDocument.getDocumentSharedStatus(doc, ownerUid);
    let html = "";
    let uid = "";

    if (status === 2) {
      uid = doc.createUser;
      html = `
        <span class="dashboard_user_image member_profile_image" docid="${id}" uid="${uid}"></span>
        <div class="members_feed_online_status member_online_status" data-uid="${uid}"></div>
        <br>
        <span class="dasboard_user_name member_profile_name" docid="${id}" uid="${uid}"></span>`;

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
        html = `
        <span class="dashboard_user_image member_profile_image" docid="${id}" uid="${uid}"></span>
        <div class="members_feed_online_status member_online_status" data-uid="${uid}"></div>
        <br>
        <span class="dasboard_user_name member_profile_name" docid="${id}" uid="${uid}"></span>`;
      }
    }

    return {
      html,
      uid
    };
  }
}
