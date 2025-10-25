#!/usr/bin/env node
import { GoogleGenAI } from "@google/genai";
import chalk from "chalk";
import {
  handleInvalidApiKey,
  handleNoApiKey,
  getApiKeyFromDB,
} from "../lib/apikey.js";
import { SYSTEM_PROMPT } from "../lib/config.js";
import { doall } from "../lib/git.js";
import { handleConfigCommand } from "../lib/configCommand.js";
import { checkLimit, trackUsage } from "../lib/usageTracker.js";
import fs from "fs";

const MODEL_ID = "gemini-2.5-flash";

function safeJson(str) {
  if (!str) return null;
  let clean = str.replace(/```json/gi, "").replace(/```/g, "").trim();
  clean = clean.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error(chalk.red("❌ JSON parse failed:"), e.message);
    console.error("Raw AI output:", str);
    return null;
  }
}

/**
 * Loop until a valid API key is available or user exits
 */
async function getValidApiKey() {
  let { apiKey } = await getApiKeyFromDB();

  while (true) {
    if (!apiKey) {
      console.log(chalk.yellow("\n⚠️  No API key found for this IP.\n"));
      await handleNoApiKey();
      const result = await getApiKeyFromDB();
      apiKey = result.apiKey;
      continue;
    }

    // Check key validity by making a lightweight test request
    const client = new GoogleGenAI({ apiKey });
    try {
      await client.models.generateContent({
        model: MODEL_ID,
        contents: [{ role: "user", text: "Test key validity" }],
        generationConfig: { responseMimeType: "application/json" },
      });
      return apiKey; // ✅ valid key
    } catch (err) {
      console.log(err);
      
      await handleInvalidApiKey(); // prompt user: add/delete/exit
      const result = await getApiKeyFromDB();
      apiKey = result.apiKey; // updated key or null
      continue; // loop again
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
// --- Handle version command ---
  if (args.includes("--version") || args.includes("-v")) {
    // Dynamically import package.json to get version
    const { version } = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url)));
    console.log(chalk.cyan(`\n🚀 GitPusher version: ${version}\n`));
    return;
  }
  // Check if user wants to access config
  if (args[0] === "config") {
    await handleConfigCommand();
    return;
  }

  let userInput = "";
  let remote = "origin";

  // parse --remote flag
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--remote" || args[i] === "-r") {
      if (i + 1 < args.length) {
        remote = args[i + 1];
        args.splice(i, 2);
        i--;
      }
    }
  }
  userInput = args.join(" ");

  if (!userInput) {
    console.log(chalk.cyan('\nUsage: gitpusher "your commit message"'));
    console.log(chalk.gray('Or use: gitpusher config\n'));
    return;
  }

  if (!SYSTEM_PROMPT) {
    console.error(chalk.red("❌ SYSTEM_PROMPT is not set in .env"));
    process.exit(1);
  }

  // Check if user has remaining limit
  if (!checkLimit()) {
    process.exit(1);
  }

  // Get a valid API key (loops until valid or user exits)
  const apiKey = await getValidApiKey();
  const client = new GoogleGenAI({ apiKey });

  // Generate content using AI
  let response;
  try {
    response = await client.models.generateContent({
      model: MODEL_ID,
      contents: [
        {
          role: "user",
          text: `${SYSTEM_PROMPT}\n\nUser request: ${userInput}`,
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    });
  } catch (err) {
    console.log(chalk.red("❌ Unexpected error from AI API:"), err.message);
    process.exit(1);
  }

  let aiText =
    typeof response.text === "function" ? await response.text() : response.text;
  aiText = aiText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();

  let commitMsg = "";
  let gitStatus = "success";
  let gitDetails = {
    branch: "",
    remote: remote,
    repolink: "",
  };

  try {
    const parsed = safeJson(aiText);
    commitMsg =
      parsed?.content?.commitMsg || (userInput.includes(":") ? userInput : `feat: ${userInput}`);
    const branch = parsed?.content?.branch || "";

    try {
      const details = await doall(commitMsg, branch, remote);
      gitDetails = details || gitDetails;
      gitStatus = "success";
    } catch (gitErr) {
      gitStatus = "failure";
      console.log(chalk.red("❌ Git operation failed:", gitErr.message));
    }
  } catch {
    commitMsg = userInput.includes(":") ? userInput : `feat: ${userInput}`;
    try {
      const details = await doall(commitMsg, "", remote);
      gitDetails = details || gitDetails;
      gitStatus = "success";
    } catch (gitErr) {
      gitStatus = "failure";
      console.log(chalk.red("❌ Git operation failed:", gitErr.message));
    }
  }

  // Track usage after AI call
  await trackUsage({
    commitMessage: commitMsg,
    status: gitStatus,
    branch: gitDetails.branch,
    remote: gitDetails.remote,
    repolink: gitDetails.repolink,
    userInput: userInput,
    modelResponseLength: aiText.length,
    responseMimeType: "application/json",
  });
}

main();
