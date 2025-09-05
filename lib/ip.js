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
    return { apiKey: record.apiKey, ip };
  } catch (err) {
    console.error("❌ Something went wrong in getApiKeyFromDB", err);
    return {};
  }
}

export async function createNewApiKey() {
  try {
    const ip = await getPublicIP();

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    const newKey = await prompt("👉 Enter your new API key: ");
    if (!newKey) throw new Error("No API key entered");

    // upsert = replace old key if exists
    await collection.updateOne(
      { ip },
      { $set: { apiKey: newKey } },
      { upsert: true }
    );

    await client.close();
    console.log("✅ API key saved to DB!");
    return { apiKey: newKey, ip };
  } catch (err) {
    console.error("❌ Failed to create new API key", err);
    return {};
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
      console.log("🗑️ API key deleted from DB.");
    } else {
      console.log("⚠️ No API key found to delete for this IP.");
    }
  } catch (err) {
    console.error("❌ Failed to delete API key", err);
  }
}
