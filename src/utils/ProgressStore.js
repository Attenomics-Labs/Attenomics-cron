// src/utils/ProgressStore.js
import fs from "fs";
import path from "path";

//creating path for scrapeProgress.json

let PROGRESS_FILE = path.resolve(process.cwd(), "./public/scrapeProgress.json");

//reading from scrapeProgress file
export function loadProgress(ispoint = false) {
  try {
    if (ispoint) {
      PROGRESS_FILE = path.resolve(process.cwd(), "genpointprogress.json");
    }
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
  } catch {
    // no file yet, start at zero
    return { index: 0, startedAt: Date.now() };
  }
}

export function saveProgress(progress, ispoint = false) {
  if (ispoint) {
    PROGRESS_FILE = path.resolve(process.cwd(), "genpointprogress.json");
  }
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), "utf8");
}
