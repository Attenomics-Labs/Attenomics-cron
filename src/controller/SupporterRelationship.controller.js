import { getWriteSession } from "../DB/neo4j.DB.js";

/**
 * Every 24 h, for each registered user (creator), find
 * all tweets in the last 24 h by other registered users
 * that reply, quote or mention them—and create a SUPPORTS edge.
 */
export async function updateSupporterRelationships() {
  const session = getWriteSession();
  try {
    console.log("🔔 Starting updateSupporterRelationships…");

    // cutoff timestamp (seconds)
    const sinceTs = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

    // fetch all creators
    const creatorsRes = await session.run(
      `MATCH (u:User) RETURN u.username AS username`
    );
    const creators = creatorsRes.records.map(r => r.get("username"));
    const tweets = await session.run(
      `MATCH (t:Tweet) RETURN t`
    ).then(async (twt) => {
      return twt.records.map(t => t.get('t').properties);
    });
    console.log(tweets.length);
    for (const creator of creators) {
      const mention = "@" + creator;
      console.log(`🔍 Searching for tweets mentioning @${creator}…`);
      // find all supporter tweets in last 24 h
      let tweetsRes = [];
      tweets.map(t => {
        // Check if tweet is not by creator and after the specified timestamp
        if (t.username === creator || t.timestamp < sinceTs) {
          // Check the three conditions from the query
          const isReplyToCreator =
            t.isReply === true &&
            t.inReplyToStatusId !== null &&
            tweets.some(orig =>
              orig.tweetID === t.inReplyToStatusId &&
              orig.username === creator
            );

          const isQuoteOfCreator =
            t.isQuoted === true &&
            t.conversationId !== null &&
            tweets.some(orig =>
              orig.tweetID === t.conversationId &&
              orig.username === creator
            );

          const containsMention =
            t.text.includes(mention);

          // Return true if any of the conditions are met
          if (isReplyToCreator || isQuoteOfCreator || containsMention) {
            tweetsRes.push({
              supporter: t.username,
              tweetID: t.tweetID,
              isReply: t.isReply,
              isQuoted: t.isQuoted,
              text: t.text
            })
          };

        }

      });
      console.log(`${tweetsRes.length} ${tweets.length}`);
      console.log(tweetsRes);
      return;
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
        const isexist = await session.run(
          `
          MATCH p=()-[:SUPPORTS {tweetID:$tweetID}]->() RETURN p;
          `,
          { tweetID }
        );
        if (isexist.records.length == 0) {
          // create or update SUPPORTS relationship
          await session.run(
            `
          MATCH (a:User {username:$supporter}), (b:User {username:$creator})
          MERGE (a)-[r:SUPPORTS {tweetID:$tweetID}]->(b)
          SET r.type = $type, r.text = $text, r.updatedAt = datetime()
          `,
            { supporter, creator, tweetID, type, text: rec["text"] }
          );
        }
      }
    }

    console.log("🔔 updateSupporterRelationships done");
  } catch (err) {
    console.error("❌ updateSupporterRelationships error:", err);
  } finally {
    await session.close();
  }
}



// const tweetsRes = await session.run(
//   `
//   MATCH (t:Tweet)
//   WHERE
//   t.username <> $creator
//   AND
//   t.timestamp >= $sinceTs
//     AND (
//       (t.isReply = true AND EXISTS {
//         MATCH (orig:Tweet {tweetID: t.inReplyToStatusId, username: $creator})
//       })
//       OR
//       (t.isQuoted = true AND EXISTS {
//         MATCH (orig:Tweet {tweetID: t.conversationId, username: $creator})
//       })
//       OR
//       t.text CONTAINS $mention
//     )
//   RETURN
//     t.username      AS supporter,
//     t.tweetID       AS tweetID,
//     t.isReply       AS isReply,
//     t.isQuoted      AS isQuoted,
//     t.text          AS text
//   `,
//   { sinceTs, creator, mention }
// );