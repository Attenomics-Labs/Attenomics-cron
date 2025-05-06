// src/index.js
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import cron from "node-cron";
import { verifyConnectivity } from "./DB/neo4j.DB.js";
import { cronfunction } from "./component/cronfuntions.component.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(resolve(__dirname, "../public")));



const PORT = process.env.PORT || 8000;


app.listen(PORT, async () => {
  await verifyConnectivity();
  await cronfunction();
  console.log(`✅ Server running on port ${PORT}`);
});

app.get("/api/", (req, res) => {
  return res.status(200).json(
    {
      'message': 'api is working successfully'
    }
  );
});



// cron.schedule("0 0 * * *", cronfunction);
