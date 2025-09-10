#!/usr/bin/env node
import { GoogleGenAI } from "@google/genai";
import chalk from "chalk";
import { handleInvalidApiKey, handleNoApiKey } from "../lib/apikey.js"; // 👈 Always from config
import { SYSTEM_PROMPT } from "../lib/config.js"; // 👈 Always from config
import { doall } from "../lib/git.js";
import { getApiKeyFromDB } from "../lib/ip.js";

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
  const args = process.argv.slice(2);
  let userInput = "";
  let remote = "origin";
  
  // Parse arguments for remote specification
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--remote" || args[i] === "-r") {
      if (i + 1 < args.length) {
        remote = args[i + 1];
        args.splice(i, 2); // Remove --remote and its value
        i--; // Adjust index after removal
      }
    }
  }
  
  userInput = args.join(" ");
  
  if (!userInput) {
    console.log(chalk.cyan("\n╭─────────────────────────────────────╮"));
    console.log(chalk.cyan("│            🚀 GitPusher             │"));
    console.log(chalk.cyan("├─────────────────────────────────────┤"));
    console.log(chalk.cyan("│              Usage                  │"));
    console.log(chalk.cyan("╰─────────────────────────────────────╯"));
    console.log(chalk.white("\n💡 Basic Usage:"));
    console.log(chalk.cyan("   gitpusher") + chalk.white(' "push my changes"'));
    console.log(chalk.cyan("   gitpusher") + chalk.white(' "deploy to production"'));
    console.log(chalk.cyan("   gitpusher") + chalk.white(' "fix: resolve bug in authentication"'));
    
    console.log(chalk.white("\n🔧 Advanced Usage:"));
    console.log(chalk.cyan("   gitpusher") + chalk.white(' "push changes" ') + chalk.gray("--remote upstream"));
    console.log(chalk.cyan("   gitpusher") + chalk.white(' "deploy" ') + chalk.gray("-r fork"));
    
    console.log(chalk.white("\n📝 Examples for this project:"));
    console.log(chalk.green("   gitpusher") + chalk.white(' "feat: add new API endpoint"'));
    console.log(chalk.green("   gitpusher") + chalk.white(' "fix: resolve login issue"'));
    console.log(chalk.green("   gitpusher") + chalk.white(' "docs: update README"'));
    console.log(chalk.green("   gitpusher") + chalk.white(' "style: improve UI components"'));
    console.log(chalk.green("   gitpusher") + chalk.white(' "refactor: optimize database queries"'));
    
    console.log(chalk.white("\n🏷️  Options:"));
    console.log(chalk.gray("   --remote, -r") + chalk.white("  Specify remote repository (default: origin)"));
    console.log("");
    return;
  }

  if (!SYSTEM_PROMPT) {
    console.error("❌ SYSTEM_PROMPT is not set in .env");
    process.exit(1);
  }

  let { apiKey } = await getApiKeyFromDB();
  
  if (!apiKey) {
    console.log(chalk.yellow("\n⚠️  No API key found for this IP.\n"));
    await handleNoApiKey();
    // Get the API key again after handling
    const result = await getApiKeyFromDB();
    apiKey = result.apiKey;
    
    if (!apiKey) {
      console.log(chalk.red("❌  No valid API key available. Exiting..."));
      process.exit(1);
    }
    
    console.log(chalk.green("🚀  Continuing with git operations...\n"));
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
  } catch {
    await handleInvalidApiKey();   // 👈 call this
    // Get the API key again after handling
    const result = await getApiKeyFromDB();
    const newApiKey = result.apiKey;
    
    if (!newApiKey) {
      console.log("❌ No valid API key available. Exiting...");
      process.exit(1);
    }
    
    console.log(chalk.green("🚀  Continuing with git operations...\n"));
    
    // Retry with new API key
    const newClient = new GoogleGenAI({ apiKey: newApiKey });
    response = await newClient.models.generateContent({
      model: MODEL_ID,
      contents: [
        { role: "user", text: `${SYSTEM_PROMPT}\n\nUser request: ${userInput}` }
      ],
      generationConfig: { responseMimeType: "application/json" }
    });
  }
  

  let aiText = typeof response.text === "function" ? await response.text() : response.text;
  aiText = aiText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();

  try {
    const parsed = safeJson(aiText);
    
    // Always proceed with git operations, regardless of AI response status
    if (parsed?.content?.action === "doall" || parsed?.status === "success" || parsed?.status === "error") {
      let commitMsg = "Auto commit from gitpusher";
      let branch = "";
      
      // Extract commit message from AI response if available
      if (parsed.content?.commitMsg) {
        commitMsg = parsed.content.commitMsg;
      } else {
        // Create commit message from user input if AI didn't provide one
        commitMsg = userInput.includes(":") ? userInput : `feat: ${userInput}`;
      }
      
      // Extract branch if specified
      if (parsed.content?.branch) {
        branch = parsed.content.branch;
      }
      
      await doall(commitMsg, branch, remote);
    } else {
      // Fallback: proceed anyway with user input as commit message
      const commitMsg = userInput.includes(":") ? userInput : `feat: ${userInput}`;
      await doall(commitMsg, "", remote);
    }
  } catch (err) {
    console.error(chalk.red("❌ Failed to parse JSON: ") + err.message);
    // Fallback: proceed anyway with user input as commit message
    const commitMsg = userInput.includes(":") ? userInput : `feat: ${userInput}`;
    await doall(commitMsg, "", remote);
  }
}

main();
