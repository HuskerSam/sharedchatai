import * as firebaseAdmin from "firebase-admin";
import * as functions from "firebase-functions";
import {
    FieldValue,
} from "firebase-admin/firestore";
import BaseClass from "./baseclass";
import fetch from "node-fetch";
import type {
    Request,
    Response,
} from "express";

const creditsForDollars: any = {
    "5": 3000,
    "25": 16000,
    "100": 75000,
};

/** Handle PayPal API for payments to buy credits */
export default class PaymentAPI {
    /**
   * @param { Request } req http request object
   * @param { Response } res http response object
   */
    static async getClientToken(req: Request, res: Response) {
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        try {
            const clientToken = await PaymentAPI.generateClientToken(localInstance);

            return res.status(200).send({
                client_id: localInstance.privateConfig.paypal_clientid,
                client_token: clientToken,
                success: true,
            });
        } catch (error) {
            functions.logger.error(error, {
                structuredData: true,
            });
        }

        return res.status(200).send({
            success: false,
        });
    }
    /**
     * @param { any } localInstance
     */
    static async generateClientToken(localInstance: any) {
        const base = localInstance.privateConfig.paypal_url;
        const accessToken = await PaymentAPI.generateAccessToken(localInstance);
        console.log("at", accessToken);
        const response = await fetch(`${base}/v1/identity/generate-token`, {
            method: "post",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Accept-Language": "en_US",
                "Content-Type": "application/json",
            },
        });
        const data = await response.json();
        localInstance.client_token = data.client_token;
        return data.client_token;
    }
    /** access token is used to authenticate all REST API requests
     * @param { any } localInstance
    */
    static async generateAccessToken(localInstance: any) {
        const base = localInstance.privateConfig.paypal_url;
        const auth = Buffer.from(localInstance.privateConfig.paypal_clientid + ":" +
            localInstance.privateConfig.paypal_appsecret).toString("base64");
        const response = await fetch(`${base}/v1/oauth2/token`, {
            method: "post",
            body: "grant_type=client_credentials",
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });
        const data = await response.json();
        return data.access_token;
    }
    /**
     *
     * @param { any } localInstance
     * @param { any } authResults
     * @param { string } purchaseAmount
     * @return { Promise<any> }
     */
    static async createOrder(localInstance: any, authResults: any, purchaseAmount: string): Promise<any> {
        const base = localInstance.privateConfig.paypal_url;

        const accessToken = await PaymentAPI.generateAccessToken(localInstance);
        const url = `${base}/v2/checkout/orders`;
        const body = {
            intent: "CAPTURE",
            purchase_units: [{
                amount: {
                    currency_code: "USD",
                    value: purchaseAmount,
                },
            }],
        };
        const response = await fetch(url, {
            method: "post",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        data.body = body;
        data.createdAt = new Date().toISOString();
        data.purchaseDate = new Date().toISOString();
        data.uid = authResults.uid;
        data.purchaseAmount = purchaseAmount;
        data.processingStatus = "Running";
        data.credits = creditsForDollars[purchaseAmount];

        await firebaseAdmin.firestore().doc(`PaypalOrders/${data.id}`).set(data);
        await firebaseAdmin.firestore().doc(`Users/${data.uid}/paymentHistory/${data.id}`).set(data);

        return data;
    }
    /**
     *
     * @param { any } localInstance
     * @param { any } authResults
     * @param { string } orderId
     * @return { Promise<any> }
     */
    static async capturePayment(localInstance: any, authResults: any, orderId: string) {
        const base = localInstance.privateConfig.paypal_url;
        const accessToken = await PaymentAPI.generateAccessToken(localInstance);
        const url = `${base}/v2/checkout/orders/${orderId}/capture`;
        const response = await fetch(url, {
            method: "post",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        let errorMessage = "Processing Error";
        const json = await response.json();
        let success = false;
        if (json.status === "COMPLETED") {
            if (json.purchase_units && json.purchase_units[0]) {
                const purchaseUnit = json.purchase_units[0];
                if (purchaseUnit.payments && purchaseUnit.payments.captures &&
                    purchaseUnit.payments.captures[0]) {
                    if (purchaseUnit.payments.captures[0].status === "COMPLETED") {
                        success = true;
                    } else {
                        errorMessage = purchaseUnit.payments.captures[0].status;
                        success = false;
                    }
                }
            }
        }
        const resultData: any = {
            success,
            captureResult: json,
        };

        if (success) {
            const origOrderQ = await firebaseAdmin.firestore().doc(`Users/${authResults.uid}/paymentHistory/${orderId}`).get();
            const orderData: any = origOrderQ.data();
            const purchaseAmount = orderData.purchaseAmount;
            resultData.credits = creditsForDollars[purchaseAmount];

            if (!resultData.credits) {
                errorMessage = "No credits value found for purchase amount, contact support";
                success = false;
            }
        }

        if (success) {
            const usageQ = await firebaseAdmin.firestore().doc(`Users/${authResults.uid}/internal/tokenUsage`).get();
            let usageData = usageQ.data();
            if (!usageData) usageData = {};
            resultData.startingBalance = BaseClass.getNumberOrDefault(usageData.availableCreditBalance, 0);
            resultData.endingBalance = resultData.startingBalance + resultData.credits;
            await firebaseAdmin.firestore().doc(`Users/${authResults.uid}/internal/tokenUsage`).set({
                availableCreditBalance: FieldValue.increment(resultData.credits),
            }, {
                merge: true,
            });
        }

        resultData.success = success;
        if (!success) resultData.errorMessage = errorMessage;
        resultData.processingStatus = success ? "Complete" : "Error";

        await firebaseAdmin.firestore().doc(`PaypalOrders/${orderId}`).set(resultData, {
            merge: true,
        });
        await firebaseAdmin.firestore().doc(`Users/${authResults.uid}/paymentHistory/${orderId}`).set(resultData, {
            merge: true,
        });

        return resultData;
    }
    /**
   * @param { any } req http request object
   * @param { any } res http response object
   */
    static async getNewOrder(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const purchaseAmount = req.body.purchaseAmount;

        try {
            const order = await PaymentAPI.createOrder(localInstance, authResults, purchaseAmount);
            const clientToken = await PaymentAPI.generateClientToken(localInstance);

            return res.status(200).send({
                order,
                client_token: clientToken,
                client_id: localInstance.privateConfig.paypal_clientid,
                success: true,
            });
        } catch (error) {
            functions.logger.error(error, {
                structuredData: true,
            });
        }

        return res.status(200).send({
            success: false,
        });
    }
    /**
    * @param { any } req http request object
    * @param { any } res http response object
    */
    static async postError(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();
        const orderId = req.body.orderId;

        await firebaseAdmin.firestore().doc(`PaypalErrors/${new Date().toISOString()}`).set(req.body);

        await firebaseAdmin.firestore().doc(`Users/${authResults.uid}/paymentHistory/${orderId}`).set({
            processingStatus: "Error",
        }, {
            merge: true,
        });
        return res.status(200).send({
            success: true,
        });
    }
    /**
    * @param { any } req http request object
    * @param { any } res http response object
    */
    static async postPayment(req: Request, res: Response) {
        const authResults = await BaseClass.validateCredentials(<string>req.headers.token);
        if (!authResults.success) return BaseClass.respondError(res, authResults.errorMessage);
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();
        const orderId = req.body.orderId;

        try {
            const paymentResult = await PaymentAPI.capturePayment(localInstance, authResults, orderId);

            return res.status(200).send(paymentResult);
        } catch (error) {
            functions.logger.error(error, {
                structuredData: true,
            });
        }

        return res.status(200).send({
            success: false,
        });
    }
}
