// lib/ip.js
import inquirer from "inquirer";
import { MongoClient } from "mongodb";
import fetch from "node-fetch";
import { GoogleGenAI } from "@google/genai";
import chalk from "chalk";
import { COLLECTION, DB_NAME, MONGO_URI } from "./config.js";

// 👇 Create readline once
async function prompt(question) {
  const { answer } = await inquirer.prompt([
    {
      type: "input",
      name: "answer",
      message: question,
    },
  ]);
  return answer.trim();
}

/**
 * Validate the API key with retry mechanism for overload errors
 */
async function validateApiKey(apiKey, retries = 3) {
  if (!apiKey || apiKey.length < 30) {
    return { valid: false, error: "API key too short" };
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = new GoogleGenAI({ apiKey });
      // Simple test request
      await client.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", text: "test" }],
      });
      return { valid: true };
    } catch (error) {
      let msg = error.message || "Unknown error";

      if (msg.includes("API key not valid")) {
        return { valid: false, error: "Invalid API key" };
      }

      if (msg.includes("overloaded") || msg.includes("503")) {
        console.log(
          chalk.yellow(
            `⚠️  Model overloaded (attempt ${attempt}/${retries}). Retrying...`
          )
        );
        await new Promise((res) => setTimeout(res, attempt * 2000)); // backoff
        continue;
      }

      return { valid: false, error: msg };
    }
  }

  return { valid: false, error: "Model overloaded. Please try again later." };
}

export async function getPublicIP() {
  const res = await fetch("https://api.ipify.org?format=json");
  const { ip } = await res.json();
  return ip;
}

export async function getApiKeyFromDB() {
  try {
    const ip = await getPublicIP();

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    let record = await collection.findOne({ ip });
    await client.close();

    if (!record) {
      return {};
    }

    return { apiKey: record.apiKey, ip };
  } catch (err) {
    console.log(chalk.red("❌ Database connection failed: " + err.message));
    return {};
  }
}

export async function createNewApiKey() {
  console.log(chalk.blue("\n╔════════════════════════════════════╗"));
  console.log(chalk.blue("║           🔑 API Key Setup         ║"));
  console.log(chalk.blue("╚════════════════════════════════════╝\n"));

  const ip = await getPublicIP();

  while (true) {
    const newKey = await prompt(chalk.cyan("🔑  Enter your Google API key: "));

    if (!newKey) {
      console.log(
        chalk.red("\n❌  API key cannot be empty. Please try again.\n")
      );
      continue;
    }

    console.log(chalk.yellow("\n🔍  Validating API key..."));

    const validation = await validateApiKey(newKey);

    if (!validation.valid) {
      console.log(chalk.red("❌  " + validation.error));
      if (validation.error.includes("Invalid API key")) {
        console.log(
          chalk.gray("💡  Please check your API key and try again.\n")
        );
      } else if (validation.error.includes("overloaded")) {
        console.log(chalk.gray("💡  Gemini servers are busy, try again later.\n"));
      }
      continue; // stay in loop
    }

    console.log(chalk.green("✅  API key is valid!"));

    try {
      const client = new MongoClient(MONGO_URI);
      await client.connect();
      const db = client.db(DB_NAME);
      const collection = db.collection(COLLECTION);

      await collection.updateOne(
        { ip },
        { $set: { apiKey: newKey, updatedAt: new Date() } },
        { upsert: true }
      );

      await client.close();
      console.log(chalk.green("💾  API key saved successfully!\n"));

      return { apiKey: newKey, ip };
    } catch (err) {
      console.log(chalk.red("❌  Failed to save API key: " + err.message));
      console.log(chalk.gray("💡  Please try again.\n"));
      continue;
    }
  }
}

export async function deleteApiKeyFromDB() {
  try {
    const ip = await getPublicIP();

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    const result = await collection.deleteOne({ ip });
    await client.close();

    if (result.deletedCount > 0) {
      console.log(chalk.green("✅  API key deleted successfully."));
    } else {
      console.log(chalk.yellow("⚠️  No API key found to delete for this IP."));
    }
  } catch (err) {
    console.log(chalk.red("❌  Failed to delete API key: " + err.message));
  }
}
