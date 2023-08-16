declare const firebase: any;
declare const window: any;

import BaseApp from "./baseapp.js";

const creditsForDollars: any = {
  "5": 3000,
  "25": 16000,
  "100": 75000,
};

/** login dialog helper - displays automatically if not home page */
export default class BuyCreditsHelper {
  app: BaseApp;
  modalContainer: any = null;
  modal: any = null;
  order: any = {};
  purchase_amount_select: any;
  pay_for_credits: any;
  amount_description: any;
  payment_details_cancel: any;
  paymentFormRendered = false;
  paymentHistoryInited = false;
  payments_history_view: any;
  lastPaymentHistorySnapshot: any;
  payment_history_tab: any;
  card_container: any;
  payment_form_wrapper: any;
  cardHolderName: any;
  paymentHistory: any = {};

  /**
   * @param { any } app baseapp derived instance
   */
  constructor(app: BaseApp) {
    this.app = app;

    const html = this.getModalTemplate();
    this.modalContainer = document.createElement("div");
    this.modalContainer.innerHTML = html;
    document.body.appendChild(this.modalContainer);
    this.modal = new window.bootstrap.Modal("#buyCreditsModal", {});
    this.purchase_amount_select = this.modalContainer.querySelector(".purchase_amount_select");
    let selectHTML = `<option value="none">Select an amount</option>`;
    const keys = Object.keys(creditsForDollars);
    keys.forEach((key: string) => {
      selectHTML += `<option value="${key}">$${key} US for ${creditsForDollars[key]} Credits</option>`;
    });
    this.purchase_amount_select.innerHTML = selectHTML;
    this.purchase_amount_select.selectedIndex = 0;
    this.purchase_amount_select.addEventListener("input", () => {
      if (this.purchase_amount_select.selectedIndex === 0) {
        this.resetForm();
      } else {
        this.payment_form_wrapper.style.display = "block";
      }
    });
    this.payments_history_view = this.modalContainer.querySelector(".payments_history_view");
    this.payment_history_tab = this.modalContainer.querySelector("#payment_history_tab");
    this.card_container = this.modalContainer.querySelector(".card_container");
    this.payment_form_wrapper = this.modalContainer.querySelector(".payment_form_wrapper");
    this.cardHolderName = document.getElementById("card-holder-name");
    this.cardHolderName.addEventListener("keydown", (e: any) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }
  /** get modal template
   * @return { string } template
   */
  getModalTemplate(): string {
    return `<div class="modal fade scrollable_modal" id="buyCreditsModal" tabindex="-1" aria-labelledby="buyCreditsModalLabel"
    aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content app_panel">
            <div class="modal-header">
                <h4 class="modal-title" id="buyCreditsModalLabel">Buy Credits</h4>
                <div style="flex:1"></div>
                <a class="btn btn-secondary show_modal_profile_help" href="/help/#buycredits" target="help"><i
                        class="material-icons">help_outline</i></a>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" style="display:flex;flex-direction:column">
                <ul class="nav nav-tabs mb-2" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active" id="new_payment_tab" data-bs-toggle="tab"
                            href="#new_payment_tab_view" role="tab" aria-controls="new_payment_tab_view"
                            aria-selected="false">New Purchase</a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="payment_history_tab" data-bs-toggle="tab"
                            href="#payment_history_tab_view" role="tab" aria-controls="payment_history_tab_view"
                            aria-selected="true">History</a>
                    </li>
                </ul>
                <div class="tab-content" style="overflow:hidden;display:flex;height:95vh;">
                    <div class="tab-pane fade show active" id="new_payment_tab_view" role="tabpanel"
                        aria-labelledby="new_payment_tab" style="overflow:auto;">
                        <div style="margin-left: 20px;">
                            <label>Purchase Amount</label>
                            <select class="form-select purchase_amount_select"></select>
                        </div>
                        <div class="payment_form_wrapper" style="display:none;">
                            <div class="card_container">
                                <form id="card-form">
                                    <label for="card-number">Card Number</label>
                                    <div id="card-number" class="card_field"></div>
                                    <div>
                                        <label for="expiration-date">Expiration Date</label>
                                        <div id="expiration-date" class="card_field"></div>
                                    </div>
                                    <div>
                                        <label for="cvv">CVV</label>
                                        <div id="cvv" class="card_field"></div>
                                    </div>
                                    <label for="card-holder-name">Name on Card</label>
                                    <input type="text" id="card-holder-name" name="card-holder-name" autocomplete="off"
                                        placeholder="card holder name">
                                    <br><br>
                                    <button
                                        class="payment_details_cancel header_button btn btn-secondary">Cancel</button>
                                    <button value="submit" id="submit"
                                        class="btn header_button default_action_button btn btn-primary">Pay</button>
                                </form>
                            </div>
                            <br>
                            <a href="/content/pricing/" target="_blank" style="margin-left:20px;">Terms and
                                Conditions</a>
                            <br>
                            <br>
                            <div id="paypal-button-container" class="paypal-button-container"></div>

                            <div class="clear:both"></div>
                        </div>
                    </div>
                    <div class="tab-pane fade" style="overflow:auto;" id="payment_history_tab_view" role="tabpanel"
                        aria-labelledby="payment_history_tab">
                        <div class="payments_history_view"></div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="material-icons">cancel</i>
                    Close
                </button>
            </div>
        </div>
    </div>
</div>`;
  }
  /** */
  async renderPaymentForm() {
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.app.basePath + "lobbyApi/payment/token", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        token,
      },
      body: "",
    });
    const json = await fResult.json();
    if (json.success) {
      const clientToken = json.client_token;
      const clientId = json.client_id;
      let paypalScript = document.getElementById("paypalscript");
      if (paypalScript) paypalScript.remove();
      paypalScript = document.createElement("script");
      paypalScript.setAttribute("src", `https://www.paypal.com/sdk/js?components=buttons,hosted-fields&client-id=${clientId}`);
      paypalScript.setAttribute("data-client-token", `${clientToken}`);
      document.body.append(paypalScript);
      this._initPaypal();

      return true;
    }

    return false;
  }
  /** */
  resetForm() {
    this.purchase_amount_select.selectedIndex = 0;
    this.payment_form_wrapper.style.display = "none";
  }
  /** update UI to show payment submit started */
  setPaymentSubmitInProgress() {
    this.payment_history_tab.click();
  }
  /** */
  _initPaypal() {
    if (!window.paypal) {
      setTimeout(() => this._initPaypal(), 50);
      return;
    }

    window.paypal
      .Buttons({
        // Sets up the transaction when a payment button is clicked
        createOrder: async (/* data: any, actions: any */) => {
          await this.getPayPalOrder();
          return this.order.id;
        },
        onCancel: async (data: any) => {
          this.resetForm();
          this.payPalError(data);
        },
        onError: async (err: any) => {
          console.log(err);
          alert("Error");
        },
        // Finalize the transaction after payer approval
        onApprove: (/* data: any, actions: any */) => {
          return this.payPalAccepted();
        },
      })
      .render("#paypal-button-container");

    if (window.paypal.HostedFields.isEligible()) {
      // Renders card fields
      window.paypal.HostedFields.render({
        // Call your server to set up the transaction
        createOrder: async () => {
          return await this.getPayPalOrder();
        },
        styles: {
          ".valid": {
            color: "green",
          },
          ".invalid": {
            color: "red",
          },
        },
        fields: {
          number: {
            selector: "#card-number",
            placeholder: "4111 1111 1111 1111",
          },
          cvv: {
            selector: "#cvv",
            placeholder: "123",
          },
          expirationDate: {
            selector: "#expiration-date",
            placeholder: "MM/YY",
          },
        },
      }).then((cardFields: any) => {
        document.querySelector("#card-form")?.addEventListener("submit", (event) => {
          event.preventDefault();

          cardFields
            .submit({
              // Cardholder"s first and last name
              cardholderName: this.cardHolderName.value,
            })
            .then(() => this.payPalAccepted())
            .catch((err: any) => this.payPalError(err));
        });
      });
    } else {
      const cardForm: any = document.querySelector("#card-form");
      // Hides card fields if the merchant isn"t eligible
      cardForm.style.display = "none";
    }
  }
  /** */
  async getPayPalOrder() {
    const purchaseAmount = this.purchase_amount_select.value;
    const details: any = {
      purchaseAmount,
    };
    this.resetForm();
    const formBody: any = [];
    Object.keys(details).forEach((property: string) => {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(details[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    });
    const body = formBody.join("&");
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.app.basePath + "lobbyApi/payment/order", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        token,
      },
      body,
    });
    this.setPaymentSubmitInProgress();
    const json = await fResult.json();
    if (json.success) {
      console.log("order created", json);
      this.order = json.order;
      return json.order.id;
    }

    return null;
  }
  /** */
  async payPalAccepted() {
    const data = {
      orderId: this.order.id,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.app.basePath + "lobbyApi/payment/capture", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        token,
      },
      body: JSON.stringify(data),
    });
    const json = await fResult.json();
    console.log("paymentResult", json);
    this.resetForm();
    alert(json.processingStatus);
  }
  /**
   *
   * @param { any } err
   */
  async payPalError(err: any) {
    const holderName: any = document.getElementById("card-holder-name");
    const exp: any = document.getElementById("expiration-date");
    const cvv: any = document.getElementById("cvv");

    let alertMsg = "Payment could not be processed!";
    try {
      const msg = err.details[0].description;
      alertMsg += " " + msg;
    } catch (err: any) {
      console.log(err);
    }
    const data = {
      type: "payPal Decline",
      errorJSON: JSON.stringify(err),
      name: holderName.value,
      exp: exp.value,
      cvv: cvv.value,
      orderId: this.order.id,
    };
    const token = await firebase.auth().currentUser.getIdToken();
    const fResult = await fetch(this.app.basePath + "lobbyApi/payment/error", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        token,
      },
      body: JSON.stringify(data),
    });
    console.log("Paypal Error", data);
    console.log("fResult", fResult);
    alert(alertMsg);
  }
  /**
   * @param { any } e
   */
  cancelSignup(e: any) {
    e.preventDefault();
    this.modal.hide();
  }
  /** */
  initPaymentHistory() {
    if (this.paymentHistoryInited) return;
    this.paymentHistoryInited = true;

    firebase.firestore().collection(`Users/${this.app.uid}/paymentHistory`)
      .orderBy(`purchaseDate`, "desc")
      .limit(100)
      .onSnapshot((snapshot: any) => this.updatePaymentHistory(snapshot));
  }
  /** paint payment document feed
  * @param { any } snapshot firestore query data snapshot
  */
  updatePaymentHistory(snapshot: any = null) {
    if (snapshot) this.lastPaymentHistorySnapshot = snapshot;
    else if (this.lastPaymentHistorySnapshot) snapshot = this.lastPaymentHistorySnapshot;
    else return;

    let html = "";
    this.lastPaymentHistorySnapshot.forEach((doc: any) => {
      const data = doc.data();
      let startB = data.startingBalance;
      let endB = data.endingBalance;
      if (startB === undefined) startB = 0;
      if (endB === undefined) endB = 0;

      const localeDate = BaseApp.isoToLocal(data.createdAt);
      const dateDesc = BaseApp.shortShowDate(localeDate) + " " + BaseApp.formatAMPM(new Date(data.createdAt));
      const rowHTML = `<div class="payment_history_card card ${data.processingStatus.toLowerCase()}">
          <div class="payment_date_div">
            ${dateDesc}
          </div>
          <div class="processing_status_div">
            ${data.processingStatus}
          </div>
          Id: ${doc.id}
          <br>
          $${data.purchaseAmount} for ${data.credits}
          <div class="new_balance_div">
            Balance <span class="new_balance_display">${endB.toFixed()}</span> Credits
            <button class="show_receipt btn btn-secondary" data-id="${doc.id}">Receipt</button>
          </div>
        </div>`;
      html += rowHTML;
      this.paymentHistory[doc.id] = doc.data();
    });
    this.payments_history_view.innerHTML = html;
    this.payments_history_view.querySelectorAll(".show_receipt").forEach(
      (btn: any) => btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        this.previewReceipt(id);
      }));
  }
  /**
   * @param { string } id
   */
  previewReceipt(id: string) {
    const data = this.paymentHistory[id];
    let startB = data.startingBalance;
    let endB = data.endingBalance;
    if (startB === undefined) startB = 0;
    if (endB === undefined) endB = 0;
    const localeDate = BaseApp.isoToLocal(data.createdAt);
    const dateDesc = BaseApp.shortShowDate(localeDate) + " " + BaseApp.formatAMPM(new Date(data.createdAt));

    const html = `<!DOCTYPE html>
    <html>
        <head>
            <title>Receipt for ${id}</title>
            <meta charset="utf-8">
        </head>
        <body>
        <div class="${data.processingStatus.toLowerCase()}">
    <div class="payment_date_div">
      ${dateDesc}
    </div>
    Id: ${id}
    <br>
    $${data.purchaseAmount} US Dollars
    <br>
    Unacog AI ${data.credits} Credits
    <br>
      Ending Balance <span class="new_balance_display">${endB.toFixed()}</span> Credits
    </div>
  </div></body></html>`;
    const winUrl = URL.createObjectURL(new Blob([html], {
      type: "text/html",
    }));
    const left = (screen.width - 350) / 2;
    const top = (screen.height - 500) / 4;
    window.open(winUrl, "Title",
      `resizable=yes,width=350,height=500,left=${left.toFixed()},top=${top.toFixed()}`);
  }
  /** */
  show() {
    if (this.app.fireUser && this.app.fireUser.isAnonymous) {
      alert("Anonymous users can't buy credits");
      return;
    }

    if (!this.paymentFormRendered) {
      this.paymentFormRendered = true;

      this.renderPaymentForm();
      this.payment_details_cancel = this.modalContainer.querySelector(".payment_details_cancel");
      this.payment_details_cancel.addEventListener("click", (e: any) => this.cancelSignup(e));
    }
    this.initPaymentHistory();
    this.modal.show();
  }
}
