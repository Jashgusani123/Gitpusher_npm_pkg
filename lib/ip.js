// lib/ip.js
import fetch from "node-fetch";
import { MongoClient } from "mongodb";
import readline from "readline";
import { MONGO_URI, DB_NAME, COLLECTION } from "./config.js";

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans.trim());
  }));
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
    if (!record) {
      console.log("⚠️ No API key found for this IP.");
      const newKey = await prompt("👉 Please enter your API key: ");
      if (!newKey) throw new Error("No API key entered");

      await collection.insertOne({ ip, apiKey: newKey });
      record = { ip, apiKey: newKey };
    }

    await client.close();
    return { apiKey: record.apiKey, ip };   // ✅ ensure return always
  } catch (err) {
    console.error("❌ Something went wrong, (47)", err);
    return {};
  }
}

export async function createNewApiKey() {
  const { apiKey } = await inquirer.prompt([
    {
      type: "input",
      name: "apiKey",
      message: "Enter your new API key:",
    },
  ]);

  fs.writeFileSync(DB_FILE, JSON.stringify({ apiKey }, null, 2));
  console.log("✅ API key saved!");
  return { apiKey };
}

export async function deleteApiKeyFromDB() {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
    console.log("🗑️ API key deleted.");
  } else {
    console.log("⚠️ No API key found to delete.");
  }
}