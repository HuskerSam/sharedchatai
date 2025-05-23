import BaseApp from "./baseapp";
import {
  doc,
  onSnapshot,
  getFirestore,
} from "firebase/firestore";

/** static functions account  */
export default class AccountHelper {
    /** fetch account info
     * @param { any } app
     * @param { any } callback paint function for account data
    */
    static accountInfoUpdate(app: any, callback: any) {
        const docRef = doc(getFirestore(), `Users/${app.uid}/internal/tokenUsage`);
          onSnapshot(docRef, (snapshot: any) => {
            let usageData = snapshot.data();
            if (!usageData) usageData = {};

            const today = new Date().toISOString();
            const yearFrag = today.substring(0, 4);
            const yearMonthFrag = today.substring(0, 7);
            const ymdFrag = today.substring(0, 10);
            let runningTokens: any = {};
            if (usageData.runningTokens) runningTokens = usageData.runningTokens;

            const allTimeTotalTokens = BaseApp.numberWithCommas(usageData.totalTokens);
            const allTimePromptTokens = BaseApp.numberWithCommas(usageData.promptTokens);
            const allTimeCompletionTokens = BaseApp.numberWithCommas(usageData.completionTokens);
            const allTimeCreditUsage = BaseApp.numberWithCommas(usageData.creditUsage);

            const yearlyTotalTokens = BaseApp.numberWithCommas(runningTokens["total_" + yearFrag]);
            const yearlyPromptTokens = BaseApp.numberWithCommas(runningTokens["prompt_" + yearFrag]);
            const yearlyCompletionTokens = BaseApp.numberWithCommas(runningTokens["completion_" + yearFrag]);
            const yearlyCreditUsage = BaseApp.numberWithCommas(runningTokens["credit_" + yearFrag]);

            const monthlyTotalTokens = BaseApp.numberWithCommas(runningTokens["total_" + yearMonthFrag]);
            const monthlyPromptTokens = BaseApp.numberWithCommas(runningTokens["prompt_" + yearMonthFrag]);
            const monthlyCompletionTokens = BaseApp.numberWithCommas(runningTokens["completion_" + yearMonthFrag]);
            const monthlyCreditUsage = BaseApp.numberWithCommas(runningTokens["credit_" + yearMonthFrag]);
            let nMonthlyCreditUsage = runningTokens["credit_" + yearMonthFrag];
            if (!nMonthlyCreditUsage) nMonthlyCreditUsage = 0;

            const dailyTotalTokens = BaseApp.numberWithCommas(runningTokens["total_" + ymdFrag]);
            const dailyPromptTokens = BaseApp.numberWithCommas(runningTokens["prompt_" + ymdFrag]);
            const dailyCompletionTokens = BaseApp.numberWithCommas(runningTokens["completion_" + ymdFrag]);
            const dailyCreditUsage = BaseApp.numberWithCommas(runningTokens["credit_" + ymdFrag]);

            let availableCreditBalance = usageData.availableCreditBalance;
            if (!availableCreditBalance) availableCreditBalance = 0;

            callback({
                allTimeTotalTokens,
                allTimePromptTokens,
                allTimeCompletionTokens,
                allTimeCreditUsage,
                yearlyTotalTokens,
                yearlyPromptTokens,
                yearlyCompletionTokens,
                yearlyCreditUsage,
                monthlyTotalTokens,
                monthlyPromptTokens,
                monthlyCompletionTokens,
                monthlyCreditUsage,
                dailyTotalTokens,
                dailyPromptTokens,
                dailyCompletionTokens,
                dailyCreditUsage,
                availableCreditBalance,
                nMonthlyCreditUsage,
                usageData,
                runningTokens,
            });
          });
    }
}
