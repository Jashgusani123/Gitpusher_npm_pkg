import fs from "fs";
import inquirer from "inquirer";
import ora from "ora";
import path from "path";
import readline from "readline";
import { createNewApiKey, deleteApiKeyFromDB } from "../lib/ip.js"; // example funcs
import { COLLECTION, DB_NAME } from "./config.js"; // 👈 use env values
import { connectDB } from "./db.js";
import { getPublicIP } from "./ip.js";

const CONFIG_DIR = path.join(process.cwd(), ".gitpusher");
const CONFIG_FILE = path.join(CONFIG_DIR, "activeUser.json");

export async function addApiKey() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((r) => rl.question(q, r));

  const apiKey = (await ask("🔑 Enter your Google API Key: ")).trim();
  rl.close();

  if (!apiKey) {
    console.log("⚠️ API Key required.");
    process.exit(1);
  }

  const ip = await getPublicIP();

  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey, ip }, null, 2));

  console.log("✨ API Key saved locally!");

  try {
    const db = await connectDB();
    await db.collection(COLLECTION).updateOne(
      { ip },
      { $set: { apiKey, ip, updatedAt: new Date() } },
      { upsert: true }
    );
    console.log(`📦 API Key saved in DB: ${DB_NAME}/${COLLECTION}`);
  } catch (err) {
    console.log("⚠️ Try after sometime.", err.message);
  }

  process.exit(0);
}

export async function getLocalApiKey() {
  if (!fs.existsSync(CONFIG_FILE)) return {};

  const { apiKey, ip } = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  let finalApiKey = apiKey;

  try {
    const db = await connectDB();
    const existing = await db.collection(COLLECTION).findOne({ ip });
    if (existing) finalApiKey = existing.apiKey;
  } catch (err) {
    console.log("⚠️ Using local API key.", err.message);
  }

  return { apiKey: finalApiKey, ip };
}


async function handleInvalidApiKey() {
  console.log("❌ API key not valid\n");

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What do you want to do?",
      choices: [
        { name: "🔑 Make new API key", value: "new" },
        { name: "🗑️ Delete existing key", value: "delete" },
        { name: "❌ Exit (ESC)", value: "exit" }
      ]
    }
  ]);

  if (action === "delete") {
    const spinner = ora("Deleting existing API key...").start();
    try {
      await deleteApiKeyFromDB();
      spinner.succeed("✅ API key deleted.");
    } catch (err) {
      spinner.fail("❌ Failed to delete API key.");
    }
  } else if (action === "new") {
    const spinner = ora("Creating new API key...").start();
    try {
      await createNewApiKey();
      spinner.succeed("✅ New API key created.");
    } catch (err) {
      spinner.fail("❌ Failed to create API key.");
    }
  } else {
    console.log("👋 Process ended.");
    process.exit(0);
  }
}
