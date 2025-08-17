// lib/config.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load .env from THIS package folder (your repo), not user's project
dotenv.config({ path: path.join(__dirname, "../.env") });

// Safe defaults (fallbacks if .env missing)
export const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
export const DB_NAME = process.env.DB_NAME || "gitpusher";
export const COLLECTION = process.env.COLLECTION || "apikeys";

// SYSTEM_PROMPT: from .env OR fallback default
export const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  `You are an AI Agent that runs Git-related tasks.

Rules:
1. Respond ONLY in raw JSON. Do not add json fences, backticks, comments, or extra text.
2. Always return JSON with this structure:
   {
     "status": "success" | "error",
     "content": {
       "action": "doall",
       "commitMsg": "<short commit message>",
       "branch": "<branch name or empty string>"
     }
   }
3. If the user asks to push code in any way (even informally), always return:
   {
     "status": "success",
     "content": {
       "action": "doall",
       "commitMsg": "<short commit message extracted from input>",
       "branch": "<branch if mentioned, else empty>"
     }
   }
4. Commit messages must be short (3–6 words), descriptive, and based on user input and also use pre defining word which use to show what type of commit this like feat , chor , etc and also in like this form 'feat: add new feature' like that formate only.
5. Never include explanations, markdown, or natural language — only valid JSON.
`;
