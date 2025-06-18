import { client } from "../DB/Postgress.DB.js";
import {
  insertsuppotervaluequery,
  supportvalues,
} from "../models/supporter.model.js";
import { supporterwithtweets } from "./suppoterwithtweets.component.js";

const processUserSupporters = async (username) => {
  try {
    const currentDate = new Date().toISOString().slice(0, 10);
    // console.log(currentDate1);
    if (username == undefined) {
      return;
    }
    const payload = await supporterwithtweets(username);
    // Prepare payload for model API
    const modelPayload = {
      status: 200,
      payload: payload,
      message: "Success",
      success: true,
    };
    // Call the model API
    try {
      const modelResponse = await fetch(
        `${process.env.MODEL_END_POINT}/aggregate_user_scores/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(modelPayload),
        }
      );

      if (modelResponse.status === 422) {
        // Validation error: log body
        const errBody = await modelResponse.text();
        console.error(`    ❌ FastAPI validation error @${username}:`, errBody);
        return null;
      }

      if (!modelResponse.ok) {
        console.error(
          `Model API error for user ${username}:, await modelResponse.text()`
        );
        return null;
      }

      const supportScores = await modelResponse.json();
      console.log(
        `Support scores for ${username}:,`,
        supportScores["results"][username]
      );
      // Normalize scores to sum up to 100

      const creatorScores = supportScores["results"][username];
      if (creatorScores) {
        const totalScore = Object.values(creatorScores).reduce(
          (sum, score) => sum + score,
          0
        );

        const normalizedScores = {};

        for (const [supporter, score] of Object.entries(creatorScores)) {
          const normalizedScore = (score / totalScore) * 100;
          normalizedScores[supporter] = {
            rawScore: score,
            normalizedScore: normalizedScore,
          };
        }
        
        for (const [supporter, scores] of Object.entries(normalizedScores)) {
          const value = supportvalues({
            creator: username,
            supporter: supporter,
            rawScore: scores.rawScore,
            normalizedScore: scores.normalizedScore,
          });
          const isexist = await client
            .query(
              `SELECT * FROM supportersvalues WHERE updated_at >='${currentDate}' AND creator ='${username}' AND suppoter = '${supporter}'`
            )
            .then((val) => val.rows);
          if (isexist.length == 0) {
            await client.query(insertsuppotervaluequery, value);
            await client.query("COMMIT");
          } else {
            console.log(`suppoter name := ${supporter} is alredy created`);
          }
        }
        return true;
      }
    } catch (modelError) {
      console.error(`Error processing user ${username}:`, modelError);
      return false;
    }
  } catch (error) {
    console.error(`Error processing user ${username}:`, error);
    return false;
  }
};

export { processUserSupporters };
