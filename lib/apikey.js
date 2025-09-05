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


export async function handleInvalidApiKey() {
  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "❌ API key not valid. What do you want to do?",
      choices: [
        { name: "🔑 Make new API key", value: "new" },
        { name: "🗑️ Delete existing key", value: "delete" },
        { name: "❌ Exit (Esc)", value: "exit" }
      ],
    },
  ]);

  if (choice === "new") {
    const spinner = ora("⠧ Creating new API key...").start();
    await createNewApiKey();
    spinner.succeed("✅ New API key created!");
  } else if (choice === "delete") {
    const spinner = ora("⠧ Deleting API key...").start();
    await deleteApiKeyFromDB();
    spinner.succeed("✅ API key deleted!");
  } else {
    console.log("👋 Exiting...");
    process.exit(0);
  }
}