import fetch from "node-fetch";
import chalk from "chalk";

export async function getPublicIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch (err) {
    console.log(chalk.red("❌ Failed to fetch public IP:", err.message));
    return "0.0.0.0";
  }
}
