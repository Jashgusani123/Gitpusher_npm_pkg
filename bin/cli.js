#!/usr/bin/env node
import { GoogleGenAI } from "@google/genai";
import { doall } from "../lib/git.js";
import { getApiKeyFromDB } from "../lib/ip.js";
import { SYSTEM_PROMPT } from "../lib/config.js";  // 👈 Always from config

// const SYSTEM_PROMPT = `
// You are an AI Agent that runs Git-related tasks.

// Rules:
// 1. Respond ONLY in raw JSON. Do not add \`\`\`json fences, backticks, comments, or extra text.
// 2. Always return JSON with this structure:
//    {
//      "status": "success" | "error",
//      "content": {
//        "action": "doall",
//        "commitMsg": "<short commit message>",
//        "branch": "<branch name or empty string>"
//      }
//    }
// 3. If the user asks to push code in any way (even informally), always return:
//    {
//      "status": "success",
//      "content": {
//        "action": "doall",
//        "commitMsg": "<short commit message extracted from input>",
//        "branch": "<branch if mentioned, else empty>"
//      }
//    }
// 4. Commit messages must be short (3–6 words), descriptive, and based on user input.
// 5. Never include explanations, markdown, or natural language — only valid JSON.
// `;


const MODEL_ID = "gemini-1.5-flash";
function safeJson(str) {
  if (!str) return null;

  // remove markdown fences
  let clean = str.replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // remove trailing commas (common LLM issue)
  clean = clean.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("❌ JSON parse failed:", e.message);
    console.error("Raw AI output:", str);
    return null;
  }
}

async function main() {
  const userInput = process.argv.slice(2).join(" ");
  if (!userInput) {
    console.log('👉 Usage: gitpusher "push kar do"');
    return;
  }

  if (!SYSTEM_PROMPT) {
    console.error("❌ SYSTEM_PROMPT is not set in .env");
    process.exit(1);
  }

  const { apiKey } = await getApiKeyFromDB();
  if (!apiKey) {
    console.log("❌ No API key found for this IP.");
    return;
  }

  const client = new GoogleGenAI({ apiKey });

  let response;
  try {
    response = await client.models.generateContent({
      model: MODEL_ID,
      contents: [
        { role: "user", text: `${SYSTEM_PROMPT}\n\nUser request: ${userInput}` }
      ],
      generationConfig: { responseMimeType: "application/json" }
    });
  } catch  {
  
    console.error("❌ API key not vaild ");
    process.exit(1);
  }
  

  let aiText = typeof response.text === "function" ? await response.text() : response.text;
  aiText = aiText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();

  try {
    const parsed = safeJson(aiText);
    if (parsed?.content?.action === "doall") {
      const commitMsg = parsed.content.commitMsg || "Auto commit from gitpusher";
      const branch = parsed.content.branch || "";
      await doall(commitMsg, branch);
    } else {
      console.error("❌ Model did not return expected JSON structure.");
    }
  } catch (err) {
    console.error("❌ Failed to parse JSON:", err.message);
    if ((aiText || "").includes("doall")) {
      await doall("Auto commit from gitpusher");
    }
  }
}

main();
