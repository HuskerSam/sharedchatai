declare const firebase: any;
declare const window: any;

import BaseApp from "./baseapp";

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
    let selectHTML = "";
    const keys = Object.keys(creditsForDollars);
    keys.forEach((key: string) => {
      selectHTML += `<option value="${key}">$${key} for ${creditsForDollars[key]} Unacog Credits</option>`;
    });
    this.purchase_amount_select.innerHTML = selectHTML;
    this.purchase_amount_select.selectedIndex = 0;
    this.payments_history_view = this.modalContainer.querySelector(".payments_history_view");
  }
  /** get modal template
   * @return { string } template
   */
  getModalTemplate(): string {
    return `<div class="modal fade scrollable_modal" id="buyCreditsModal" tabindex="-1" 
      aria-labelledby="buyCreditsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content app_panel">
            <div class="modal-header">
                <h4 class="modal-title" id="buyCreditsModalLabel">Buy Credits - Sandbox</h4>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" style="display:flex;flex-direction:column">
              <ul class="nav nav-tabs mb-2" role="tablist">
                <li class="nav-item" role="presentation">
                    <a class="nav-link active" id="new_payment_tab" data-bs-toggle="tab"
                        href="#new_payment_tab_view" role="tab" aria-controls="new_payment_tab_view"
                        aria-selected="false">New Payment</a>
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
                    <select class="form-select purchase_amount_select"></select>
                    <br>
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
                                placeholder="card holder name" />
                            <br /><br />
                            <button class="payment_details_cancel header_button btn btn-secondary">Cancel</button>
                            <button value="submit" id="submit"
                                class="btn header_button default_action_button btn btn-primary">Pay</button>
                        </form>
                    </div>
                    <br>
                    <div id="paypal-button-container" class="paypal-button-container"></div>

                    <div class="clear:both"></div>
                  </div>
                  <div class="tab-pane fade" id="payment_history_tab_view" role="tabpanel"
                      aria-labelledby="payment_history_tab">
                      <div class="payments_history_view"></div>
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
    const fResult = await fetch(this.app.basePath + "lobbyApi/payment/token", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
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
  /** update UI to show payment submit started */
  setPaymentSubmitInProgress() {
    return;
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
          if (!this.order) {
            await this.getPayPalOrder();
          }
          this.setPaymentSubmitInProgress();

          return this.order.id;
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
        createOrder: () => {
          this.setPaymentSubmitInProgress();
          return this.getPayPalOrder();
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
        const holderName: any = document.getElementById("card-holder-name");
        document.querySelector("#card-form")?.addEventListener("submit", (event) => {
          event.preventDefault();
          cardFields
            .submit({
              // Cardholder"s first and last name
              cardholderName: holderName.value,
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
    alert("Order creating");
    const purchaseAmount = this.purchase_amount_select.value;
    const details: any = {
      purchaseAmount,
    };
    const formBody: any = [];
    Object.keys(details).forEach((property: string) => {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(details[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    });
    const body = formBody.join("&");

    const fResult = await fetch(this.app.basePath + "lobbyApi/payment/order", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
    });
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
    console.log("success", this.order.id);

    const data = {
      orderId: this.order.id,
    };

    const fResult = await fetch(this.app.basePath + "lobbyApi/payment/capture", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify(data),
    });
    console.log(fResult);
    // Show a success message or redirect
    alert("Payment succeeded, adding credits...");

    // this._createUserAccount();
  }
  /**
   *
   * @param { any } err
   */
  async payPalError(err: any) {
    const holderName: any = document.getElementById("card-holder-name");
    const exp: any = document.getElementById("expiration-date");
    const cvv: any = document.getElementById("cvv");

    const alertMsg = "Payment could not be captured! " + JSON.stringify(err);
    const data = {
      type: "payPal Decline",
      errorJSON: JSON.stringify(err),
      name: holderName.value,
      exp: exp.value,
      cvv: cvv.value,
    };
    const fResult = await fetch(this.app.basePath + "lobbyApi/payment/error", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify(data),
    });
    console.log(fResult);
    alert(alertMsg);

    console.log("Paypal Error", data);
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
      .orderBy(`purchased`, "desc")
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
        const purchaseDate = this.app.showGmailStyleDate(new Date(data.purchaseDate));
        const rowHTML = `<li>
          ${purchaseDate} $${data.purchaseAmount} for ${data.creditsAmount}
        </li>`;
        html += rowHTML;
    });
    this.payments_history_view.innerHTML = html;
  }
  /** */
  show() {
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
