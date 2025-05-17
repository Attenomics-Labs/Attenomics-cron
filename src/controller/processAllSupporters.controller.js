import { processUserSupporters } from "../component/addsuppoters.component.js";
import { today } from "../component/datetime.component.js";
import { getAllUser } from "../component/users.component.js";
import { client } from "../DB/Postgress.DB.js";
import { insertsuppoterStatusquery, statusvalues } from "../models/ScrapeStatus.model.js";


const processAllSupporters = async () => {
    try {
        // Get all users
        const usernames = await getAllUser();
        const date = today();
        console.log(`Found ${usernames.length} users to process for supporter scores`);
        
        let isexistuser = {};
        try {
            const result = await client.query(
                `SELECT * FROM suppoterstatus WHERE date='${date}'`
            );
            result.rows.forEach(user => {
                isexistuser[user['username']] = true;
            });
            console.log(`Found ${Object.keys(isexistuser).length} users already processed today`);
        } catch (dbError) {
            console.error('❌ Error checking existing users:', dbError.message);
        }
        
        let processedCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < usernames.length; i++) {
            const username = usernames[i];
            console.log(`Processing user ${i+1}/${usernames.length}: ${username}`);
            
            try {
                if (isexistuser[username] != undefined) {
                    console.log(`⏭️ ${username} is already processed today, skipping`);
                    continue;
                }
                
                // Double check in the database
                const isexist = await client.query(
                    `SELECT * FROM suppoterstatus WHERE date='${date}' AND username='${username}'`
                );
                
                if (isexist.rows.length == 0) {
                    console.log(`📊 Processing supporters for ${username}`);
                    
                    await processUserSupporters(username);
                    
                    // Mark user as processed
                    const value = statusvalues({
                        'username': username,
                        'date': date,
                    });
                    await client.query(insertsuppoterStatusquery, value);
                    await client.query("COMMIT");
                    
                    processedCount++;
                    console.log(`✅ Completed processing for ${username}`);
                } else {
                    console.log(`⏭️ ${username} is already processed (found in database check)`);
                }
            } catch (err) {
                errorCount++;
                console.error(`❌ Error processing @${username}: ${err.message}`);
                console.error(`Error details: ${err.stack || JSON.stringify(err)}`);
                
                // Skip current user but continue processing others
                continue;
            }
        }
        
        console.log(`✅ Finished processing user supporter scores. Processed: ${processedCount}, Errors: ${errorCount}, Skipped: ${usernames.length - processedCount - errorCount}`);
    } catch (error) {
        console.error('❌ Error in processAllSupporters:', error.message);
        console.error('Error stack:', error.stack || JSON.stringify(error));
    }
}

export { processAllSupporters };