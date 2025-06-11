// Enhanced ranking system with supporters, attention, and yaps - PostgreSQL Version
import fetch from "node-fetch";
import { today } from "../component/datetime.component.js";
import { client } from "../DB/Postgress.DB.js";
import { insertValuequery, normsvalues } from "../models/Values.model.js";

/**
 * Enhanced ranking system that considers:
 * - 33.33% User Attention Score (from PostgreSQL attentions table)
 * - 33.33% User Yaps Score (last 24h from Kaito API)
 * - 33.33% Supporters Score (from PostgreSQL supporters table with quantity bonus)
 */

export async function enhancedNormalizeAllUserPoints() {
  console.log(
    "🔔 Starting enhanced ranking system with supporters (PostgreSQL)…"
  );
  const date = new Date(today()).getTime(); // make one day prev  date

  try {
    // Step 1: Get all users with their attention scores
    console.log("📊 Step 1: Fetching user attention scores from PostgreSQL...");
    const attentionRes = await client.query(
      `SELECT username, norm FROM values WHERE date=${date}`
    );

    if (attentionRes.rows.length === 0) {
      console.log("❌ No attention scores found for today");
      return;
    }

    // Step 2: Get all active users from the system
    console.log("👥 Step 2: Fetching all active users...");
    const usersRes = await client.query(
      `SELECT username FROM users WHERE is_blocked = false`
    );

    const allUsernames = usersRes.rows.map((r) => r.username);
    console.log(`Found ${allUsernames.length} total users`);

    // Step 3: Fetch yaps data for all users from Kaito API
    console.log("🗣 Step 3: Fetching yaps data for all users...");
    const userYapsData = await fetchAllUserYaps(allUsernames);

    // Step 4: Fetch supporters data for all users from PostgreSQL
    console.log("🤝 Step 4: Fetching supporters data from PostgreSQL...");
    const supportersData = await fetchAllSupportersData(allUsernames);

    // Step 5: Combine all data and calculate scores
    console.log("🧮 Step 5: Calculating comprehensive scores...");
    const userData = [];

    for (const attentionRecord of attentionRes.rows) {
      const username = attentionRecord.username;
      // Use minimum value of 1 for user attention (RAW attention points)
      const attention = Math.max(
        Number(attentionRecord.attention_score ?? 0),
        1
      );

      // Get yaps data (24h yaps, default to 1 if not found)
      const yaps = Math.max(userYapsData[username]?.yaps_l24h || 0, 1);

      // Get supporters data (default to empty array if not found)
      const supporters = supportersData[username] || [];

      userData.push({
        username,
        attention,
        yaps,
        supporters,
      });
    }

    console.log(`💾 Combined data for ${userData.length} users`);

    // Step 6: Calculate comprehensive scores using the ranking algorithm
    const scoredUsers = calculateComprehensiveScores(userData);

    // Step 7: Normalize scores to total 2400 and assign ranks
    console.log("📈 Step 7: Normalizing scores and assigning ranks...");
    const totalRawScore = scoredUsers.reduce(
      (sum, user) => sum + user.finalScore,
      0
    );

    // Sort by final score (highest first)
    scoredUsers.sort((a, b) => b.finalScore - a.finalScore);

    // Step 8: Save normalized scores to PostgreSQL database
    console.log("💾 Step 8: Saving results to PostgreSQL database...");
    for (let i = 0; i < scoredUsers.length; i++) {
      const user = scoredUsers[i];
      const normalizedScore =
        totalRawScore > 0 ? (user.finalScore / totalRawScore) * 2400 : 1;
      const rank = i + 1;

      // Check if record exists
      const existingRecord = await client.query(
        `SELECT * FROM values WHERE date = ${date} AND username='${user.username}'`
      );

      if (existingRecord.rows.length > 0) {
        // Update existing record
        console.log(`🔄 Updating values for ${user.username}`);
        await client.query(
          `UPDATE values SET 
            avg_norm = ${normalizedScore}, 
            final_rank = ${rank}
           WHERE date = ${date} AND username='${user.username}';`
        );
      }

      await client.query("COMMIT");

      console.log(
        `✨ @${user.username}: final=${user.finalScore.toFixed(
          2
        )}, normalized=${normalizedScore.toFixed(2)}, rank=${rank}`
      );
      console.log(
        `   📊 Breakdown - Attention: ${user.breakdown.userAttentionScore.toFixed(
          1
        )}, Yaps: ${user.breakdown.userYapsScore.toFixed(
          1
        )}, Supporters: ${user.breakdown.supportersScore.toFixed(1)} (${
          user.breakdown.supportersCount
        } supporters)`
      );
    }
    console.log("🎉 Enhanced ranking system completed successfully!");
  } catch (err) {
    console.error("❌ Enhanced ranking system error:", err);
  }
}

/**
 * Fetch yaps data for all users from the Kaito API
 * Uses batch processing with rate limiting to avoid API overload
 */
async function fetchAllUserYaps(usernames) {
  console.log(
    `🔍 Fetching yaps for ${usernames.length} users from Kaito API...`
  );
  const yapsData = {};

  // Process users in batches to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < usernames.length; i += batchSize) {
    const batch = usernames.slice(i, i + batchSize);
    console.log(
      `   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        usernames.length / batchSize
      )}`
    );

    // Fetch yaps for each user in the batch
    const batchPromises = batch.map(async (username) => {
      try {
        const response = await fetch(
          `https://api.kaito.ai/api/v1/yaps?username=${username}`
        );

        if (response.ok) {
          const data = await response.json();
          // Use minimum value of 1 instead of 0 for 24h yaps
          yapsData[username] = {
            yaps_l24h: Math.max(data.yaps_l24h || 0, 1),
            yaps_all: Math.max(data.yaps_all || 0, 1),
          };
          console.log(
            `   ✅ Fetched yaps for @${username}: ${Math.max(
              data.yaps_l24h || 0,
              1
            )} (24h)`
          );
        } else {
          console.log(
            `   ⚠ No yaps data for @${username} - using default value 1`
          );
          yapsData[username] = { yaps_l24h: 1, yaps_all: 1 };
        }
      } catch (error) {
        console.error(
          `   ❌ Error fetching yaps for @${username}:`,
          error.message
        );
        yapsData[username] = { yaps_l24h: 1, yaps_all: 1 };
      }
    });

    await Promise.all(batchPromises);

    // Small delay between batches to be respectful to the API
    if (i + batchSize < usernames.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return yapsData;
}

/**
 * Fetch supporters data from PostgreSQL supporters table
 * Gets supporters and their attention/yaps data for comprehensive scoring
 */
async function fetchAllSupportersData(usernames) {
  console.log(
    `🤝 Fetching supporters data for ${usernames.length} users from PostgreSQL...`
  );
  const prevDate = new Date();
  prevDate.setDate(prevDate.getDate() - 1);
  const yesterday = prevDate.toISOString().split("T")[0];
  const supportersData = {};

    const date = await client
      .query(
        `select updated_at from supportersvalues order by updated_at desc limit 1`
      )
      .then((val) => val.rows[0]["updated_at"]);
    // Get date in YYYY-MM-DD format
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const dateOnly = `${year}-${month}-${day}`;

  for (const username of usernames) {
    try {
      // Get supporters for this user from PostgreSQL supporters table
      // Assuming you have a supporters table with creator_username and supporter_username columns
      const supportersRes = await client.query(
        `SELECT suppoter, raw_score 
        FROM supportersvalues 
        WHERE creator = '${username}' AND updated_at >= '${dateOnly}'`
      );

      const supporters = [];

      for (const supporterRecord of supportersRes.rows) {
        const supporterUsername = supporterRecord.suppoter;
        const supportScore = Number(supporterRecord.raw_score || 0);

        // Get supporter's attention score from attentions table
        const supporterAttentionRes = await client.query(
          `SELECT norm FROM values WHERE username='${supporterUsername}' order by date desc limit 1`
        );

        // Use minimum value of 1 for supporter attention (RAW attention points)
        const supporterAttention =
          supporterAttentionRes.rows.length > 0
            ? Math.max(
                Number(supporterAttentionRes.rows[0].attention_score || 0),
                1
              )
            : 1;

        // Add supporter with placeholder yaps (will be filled later)
        supporters.push({
          username: supporterUsername,
          attention: supporterAttention,
          yaps: 1, // Will be filled later with actual 24h yaps
          supportScore: supportScore,
        });
      }

      supportersData[username] = supporters;
      console.log(`   📊 @${username} has ${supporters.length} supporters`);
    } catch (error) {
      console.error(
        `   ❌ Error fetching supporters for @${username}:`,
        error.message
      );
      supportersData[username] = [];
    }
  }

  // Now fetch yaps data for all unique supporters
  const allSupporterUsernames = [
    ...new Set(
      Object.values(supportersData)
        .flat()
        .map((supporter) => supporter.username)
    ),
  ];

  if (allSupporterUsernames.length > 0) {
    console.log(
      `🗣 Fetching yaps for ${allSupporterUsernames.length} unique supporters...`
    );
    const supporterYapsData = await fetchAllUserYaps(allSupporterUsernames); // scraping yaps for suppoters

    // Update supporters data with yaps information (24h yaps)
    for (const [username, supporters] of Object.entries(supportersData)) {
      for (const supporter of supporters) {
        // Use minimum value of 1 for supporter yaps (24h)
        supporter.yaps = Math.max(
          supporterYapsData[supporter.username]?.yaps_l24h || 0,
          1
        );
      }
    }
  }

  return supportersData;
}

/**
 * Calculate comprehensive scores using the crypto Twitter ranking algorithm
 * Implements 33.33% each for: User Attention, User Yaps, Supporters Score
 */
function calculateComprehensiveScores(userData) {
  console.log("🧮 Calculating comprehensive scores with ranking algorithm...");

  // Get bounds for normalization (all values will be >= 1 due to our minimum value handling)
  const allAttentions = userData.map((u) => u.attention);
  const allYaps = userData.map((u) => u.yaps);
  const allSupporterAttentions = userData.flatMap((u) =>
    u.supporters.map((s) => s.attention)
  );
  const allSupporterYaps = userData.flatMap((u) =>
    u.supporters.map((s) => s.yaps)
  );

  const bounds = {
    userAttention: {
      min: Math.min(...allAttentions),
      max: Math.max(...allAttentions),
    },
    userYaps: {
      min: Math.min(...allYaps),
      max: Math.max(...allYaps),
    },
    supporterAttention: {
      min:
        allSupporterAttentions.length > 0
          ? Math.min(...allSupporterAttentions)
          : 1,
      max:
        allSupporterAttentions.length > 0
          ? Math.max(...allSupporterAttentions)
          : 1,
    },
    supporterYaps: {
      min: allSupporterYaps.length > 0 ? Math.min(...allSupporterYaps) : 1,
      max: allSupporterYaps.length > 0 ? Math.max(...allSupporterYaps) : 1,
    },
  };

  console.log("📏 Normalization bounds:", bounds);

  // Normalization function (scales values to 0-100)
  function normalize(value, min, max) {
    return max === min ? 50 : ((value - min) / (max - min)) * 100; // Use 50 as default when all values are same
  }

  // Calculate scores for each user
  const scoredUsers = userData.map((user) => {
    // Component 1: User Attention Score (33.33%) - RAW attention points
    const userAttentionScore = normalize(
      user.attention,
      bounds.userAttention.min,
      bounds.userAttention.max
    );

    // Component 2: User Yaps Score (33.33%) - 24h yaps
    const userYapsScore = normalize(
      user.yaps,
      bounds.userYaps.min,
      bounds.userYaps.max
    );

    // Component 3: Supporters Score with quantity bonus (33.33%)
    let supportersScore = 0;
    if (user.supporters.length > 0) {
      // Calculate individual supporter scores (50% attention + 50% yaps)
      const supporterScores = user.supporters.map((supporter) => {
        const suppAttentionScore = normalize(
          supporter.attention,
          bounds.supporterAttention.min,
          bounds.supporterAttention.max
        );
        const suppYapsScore = normalize(
          supporter.yaps,
          bounds.supporterYaps.min,
          bounds.supporterYaps.max
        );

        // 50% attention + 50% yaps for each supporter
        return 0.5 * suppAttentionScore + 0.5 * suppYapsScore;
      });

      // Calculate average quality and apply logarithmic quantity bonus
      const averageQuality = supporterScores.reduce(
        (sum, score) => sum + score,
        0
      ); // user.supporters.length;
      const quantityBonus = Math.log(1 + user.supporters.length);
      supportersScore = averageQuality * quantityBonus;
    }

    // Final weighted score: 33.33% + 33.33% + 33.33% = 100%
    const finalScore =
      0.333 * userAttentionScore +
      0.333 * userYapsScore +
      0.333 * supportersScore;

    return {
      username: user.username,
      finalScore: Math.max(finalScore, 1), // Ensure minimum final score of 1
      breakdown: {
        userAttentionScore: userAttentionScore,
        userYapsScore: userYapsScore,
        supportersScore: supportersScore,
        supportersCount: user.supporters.length,
      },
      rawData: {
        attention: user.attention,
        yaps: user.yaps,
        supportersCount: user.supporters.length,
      },
    };
  });

  return scoredUsers;
}

/**
 * Alternative function name to replace your existing normalizeAllUserPoints
 * This maintains compatibility with your existing code structure
 */
export async function AvgnormalizeAllUserPoints() {
  console.log("🔄 Calling enhanced ranking system...");
  await enhancedNormalizeAllUserPoints();
}
