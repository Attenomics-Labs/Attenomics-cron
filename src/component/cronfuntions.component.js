import { deleteOldTweet } from "../controller/DeleteTweets.controller.js";
import { computeAttentionPoints, normalizeAllUserPoints } from "../controller/Attention.controller.js";
import { scrapeAllUsers } from "../controller/ScrapeTweets.controller.js";
import { updateSupporterRelationships } from "../controller/SupporterRelationship.controller.js";
import { scrapeUsersnames } from "../controller/ScrapeUsersnames.controller.js";
import { promisefunction } from "../utils/AsyncHandler.utils.js";


const cronfunction = async () => {
    console.log("🛠️  Running nightly pipeline...");
    try {
        await new Promise(async (resolve, reject) => {
            try {
                // console.log("scraping usernames from kiato");
                // await promisefunction(scrapeUsersnames())

                // console.log("Delete older than 4 days tweets");
                // await promisefunction(deleteOldTweet());

                console.log("scraping tweet");
                await promisefunction(scrapeAllUsers());

                console.log("computeRawPointsForAllUsers");
                await promisefunction(computeAttentionPoints());

                console.log("normalizeAllUserPoints");
                await promisefunction(normalizeAllUserPoints());

                console.log("creating graph from user and creator");
                await promisefunction(updateSupporterRelationships());

                resolve(true);
            } catch (error) {
                reject(true);
                console.log("Error ", error);
            }
        });
        console.log("🎉 Nightly pipeline complete!");
    } catch (err) {
        console.error("❌ Nightly pipeline failed:", err);
    }
};

export {
    cronfunction
}