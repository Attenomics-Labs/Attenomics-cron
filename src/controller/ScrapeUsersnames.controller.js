import fetch from "node-fetch";
import https from "https";
import { adduserByusername } from "../component/scrape.component.js";

const scrapeUsersnames = async () => {
    try {
        await new Promise((resolve, reject) => {
            https.get(process.env.YAPER_URI, (res) => {
                let data = '';
                let usernames = [];
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', async () => {
                    try {
                        const jsonData = JSON.parse(data);
                        await Promise.all(
                            Object.keys(jsonData['yappers']).map(async userId => {
                                console.log(userId);
                                const username = jsonData["yappers"][userId]["username"]
                                // usernames.push(username);
                                await adduserByusername(username);
                            })
                        );
                        resolve(true);

                    } catch (err) {
                        console.error('❌ Error parsing or saving JSON:', err);
                        reject(err);
                    }
                });
            }).on('error', (err) => {
                console.error('❌ Error fetching data:', err);
                reject(err);
            });
        });
    } catch (err) {
        console.log("Error", err);
        const msg = String(err).toLowerCase();
        if (msg.includes("rate limit") || msg.includes("429")) {
            console.warn("Rate limited, halting scrapeAllUsers");
            return;
        }
    }
};



export { scrapeUsersnames };