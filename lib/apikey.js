import chalk from "chalk";
import fs from "fs";
import inquirer from "inquirer";
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


export async function handleNoApiKey() {
  console.log(chalk.blue("\n╔════════════════════════════════════╗"));
  console.log(chalk.blue("║        🔑 API Key Required         ║"));
  console.log(chalk.blue("╚════════════════════════════════════╝\n"));
  
  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "What would you like to do?",
      choices: [
        { name: chalk.green("🔑 Add API key"), value: "new" },
        { name: chalk.gray("❌ Exit"), value: "exit" }
      ],
    },
  ]);

  if (choice === "new") {
    await createNewApiKey();
  } else {
    console.log(chalk.gray("\n👋  Exiting..."));
    process.exit(0);
  }
}

export async function handleInvalidApiKey() {
  console.log(chalk.red("\n❌  API key not valid. What do you want to do?\n"));
  
  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "Choose an option:",
      choices: [
        { name: chalk.green("🔑 Add new API key"), value: "new" },
        { name: chalk.yellow("🗑️  Delete existing key"), value: "delete" },
        { name: chalk.gray("❌ Exit"), value: "exit" }
      ],
    },
  ]);

  if (choice === "new") {
    await createNewApiKey();
  } else if (choice === "delete") {
    console.log(chalk.yellow("\n🗑️  Deleting API key..."));
    await deleteApiKeyFromDB();
    console.log(chalk.green("✅  API key deleted!\n"));
    return;
  } else {
    console.log(chalk.gray("\n👋  Exiting..."));
    process.exit(0);
  }
}