import { getAllUser } from "../component/users.component.js";
import { getWriteSession } from "../DB/neo4j.DB.js";
import { client } from "../DB/Postgress.DB.js";
import { insertSuppoterquery, supportervalues } from "../models/supporter.model.js";

/**
 * Every 24 h, for each registered user (creator), find
 * all tweets in the last 24 h by other registered users
 * that reply, quote or mention them—and create a SUPPORTS edge.
 */
export async function updateSupporterRelationships() {
  try {
    console.log("🔔 Starting updateSupporterRelationships…");
    // cutoff timestamp (seconds)
    // const sinceTs = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

    // fetch all creators
    const creators = await getAllUser();
    let tweets = {};
    await client.query(
      `SELECT * FROM tweets 
        WHERE timestamp > NOW() - INTERVAL '3 day';`
    ).then(async (twt) => {
      twt.rows.map(t => {
        const tweet = t;
        if (tweets[tweet['username']] == undefined) {
          tweets[tweet['username']] = [tweet];
        }
        else {
          tweets[tweet['username']].push(tweet);
        }
      });
    });
    let idx = 0;
    for (const creator of creators) {
      const mention = "@" + creator;
      console.log(`🔍 Searching for tweets mentioning @${creator}…`);
      // find all supporter tweets in last 24 h
      // console.log(tweets[creator]);
      if (tweets[creator] == undefined) {
        continue;
      }
      let tweetsRes = [];
      for (const supporter of creators) {
        if (supporter == creator) {
          continue;
        }
        if (tweets[supporter] == undefined) {
          continue;
        }
        tweets[supporter].map(t => {
          // Check the three conditions from the query
          const isReplyToCreator =
            t.isReply === true &&
            t.inReplyToStatusId !== null &&
            tweets[creator].some(orig => orig.tweetID === t.inReplyToStatusId);

          const isQuoteOfCreator =
            t.isQuoted === true &&
            t.conversationId !== null &&
            tweets[creator].some(orig => orig.tweetID === t.conversationId);

          const containsMention =
            t.text.includes(mention);

          // Return true if any of the conditions are met
          if (isReplyToCreator || isQuoteOfCreator || containsMention) {
            tweetsRes.push({
              supporter: supporter,
              tweetID: t.tweet_id,
              isReply: t.isReply,
              isQuoted: t.isQuoted,
              text: t.text
            })
          };
        });
      }

      console.log(`${tweetsRes.length} suppoters found for ${creator}`);
      for (const rec of tweetsRes) {
        const supporter = rec["supporter"];
        const tweetID = rec["tweetID"];
        const isReply = rec["isReply"];
        const isQuoted = rec["isQuoted"];
        const type = isReply ? "reply" : isQuoted ? "quote" : "mention";
        console.log(
          `  Found tweet ${tweetID} by @${supporter} (${type})`
        );
        // check the existence of supports
        const isexist = await client.query(
          `SELECT * FROM supporters WHERE creator ='${creator}' AND suppoter ='${supporter}' AND tweet_id='${tweetID}';`
        );
        if (isexist.rows.length == 0) {
          // create or update SUPPORTS relationship
          const props = {
            "creator": creator,
            "suppoter": supporter,
            "tweet_id": tweetID,
            "type": type,
            "text": rec["text"],
          };
          const value = supportervalues(props);
          await client.query(insertSuppoterquery, value);
          await client.query('COMMIT');
        }
      }
    }
    console.log("🔔 updateSupporterRelationships done");
  } catch (err) {
    console.error("❌ updateSupporterRelationships error:", err);
  }
}