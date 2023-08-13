import * as firebaseAdmin from "firebase-admin";
import * as functions from "firebase-functions";
import BaseClass from "./baseclass";
import fetch from "node-fetch";
import type {
    Request,
    Response,
} from "express";

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
     * @param { string } purchaseAmount
     * @return { Promise<any> }
     */
    static async createOrder(localInstance: any, purchaseAmount: string): Promise<any> {
        const base = localInstance.privateConfig.paypal_url;

        console.log("purchaseAmount", purchaseAmount);
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

        await firebaseAdmin.firestore().doc(`PaypalOrders/${data.id}`).set(data);

        return data;
    }
    /**
     *
     * @param { any } localInstance
     * @param { string } orderId
     * @return { Promise<any> }
     */
    static async capturePayment(localInstance: any, orderId: string) {
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

        const json = await response.json();
        const success = (json.status === "COMPLETED");
        const resultData = {
            success,
            captureResult: json,
        };
        await firebaseAdmin.firestore().doc(`PaypalOrders/${orderId}`).set(resultData, {
            merge: true,
        });

        return resultData;
    }
    /**
   * @param { any } req http request object
   * @param { any } res http response object
   */
    static async testOverride(req: Request, res: Response) {
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        let code = req.query.code;
        if (!code) code = "";

        if (code !== localInstance.privateConfig.override_code) {
            return res.status(200).send({
                success: false,
            });
        }

        return res.status(200).send({
            success: true,
        });
    }
    /**
   * @param { any } req http request object
   * @param { any } res http response object
   */
    static async getNewOrder(req: Request, res: Response) {
        const localInstance = BaseClass.newLocalInstance();
        await localInstance.init();

        const purchaseAmount = req.body.purchaseAmount;

        try {
            const order = await PaymentAPI.createOrder(localInstance, purchaseAmount);
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
}
