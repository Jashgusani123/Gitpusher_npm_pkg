import chalk from "chalk";
import inquirer from "inquirer";
import { getPublicIP } from "./ip.js";
import ora from "ora";
import fs from "fs";
import path from "path";

// Removed: saveApiKeyToDB() - no longer needed, using .gitpusher_config.json

export async function getApiKeyFromDB() {
  try {
    const configPath = path.join(process.cwd(), ".gitpusher_config.json");

    if (!fs.existsSync(configPath)) {
      return { apiKey: null };
    }

    const configData = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configData);

    return { apiKey: config.apikey || null };
  } catch (err) {
    console.log(chalk.red("❌ Error reading API key from config:", err.message));
    return { apiKey: null };
  }
}

export async function deleteApiKeyFromDB() {
  try {
    const configPath = path.join(process.cwd(), ".gitpusher_config.json");

    if (!fs.existsSync(configPath)) {
      console.log(chalk.yellow("⚠️  No config file found."));
      return false;
    }

    fs.unlinkSync(configPath);
    console.log(chalk.yellow("🗑️  Configuration deleted successfully."));
    return true;
  } catch (err) {
    console.log(chalk.red("❌ Error deleting config: " + err.message));
    return false;
  }
}

// Removed: createNewApiKey() - no longer needed, using token-based auth
// Removed: generateTokenForIP() - no longer needed, token provided by user

export async function handleNoApiKey() {
  console.log(chalk.blue("\n╔════════════════════════════════════╗"));
  console.log(chalk.blue("║        🔑 API Key Required         ║"));
  console.log(chalk.blue("╚════════════════════════════════════╝\n"));

  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "No API key found. What would you like to do?",
      choices: [
        { name: chalk.green("🔑 Add Token"), value: "token" },
        { name: chalk.gray("❌ Exit"), value: "exit" },
      ],
    },
  ]);

  if (choice === "token") {
    const { token } = await inquirer.prompt([
      {
        type: "input",
        name: "token",
        message: chalk.cyan("🔑 Enter your token: "),
        validate: (input) => (input ? true : "Token cannot be empty"),
      },
    ]);
    await verifyAndSaveToken(token);
  } else {
    console.log(chalk.gray("\n👋 Exiting..."));
    process.exit(0);
  }
}

export async function handleInvalidApiKey() {
  console.log(chalk.red("\n❌ Invalid API key.\n"));
  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "Choose an option:",
      choices: [
        { name: chalk.green("🔑 Update Token"), value: "token" },
        { name: chalk.gray("❌ Exit"), value: "exit" },
      ],
    },
  ]);

  if (choice === "token") {
    const { token } = await inquirer.prompt([
      {
        type: "input",
        name: "token",
        message: chalk.cyan("🔑 Enter your token: "),
        validate: (input) => (input ? true : "Token cannot be empty"),
      },
    ]);
    await verifyAndSaveToken(token);
  } else {
    process.exit(0);
  }
}

export async function verifyAndSaveToken(token) {
  const spinner = ora("Verifying token...").start();

  try {
    const ip = await getPublicIP();
    const res = await fetch("http://localhost:5000/api/keys/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ randomAPIkey:token , ip }),
    });

    if (!res.ok) {
      spinner.fail(chalk.red("❌ Token verification failed."));
      console.log(chalk.yellow("⚠️ Please check your token and try again."));
      return false;
    }

    const data = await res.json();

    if (data.success && data.details) {
      const { apikey, limit } = data.details;

      // Save to local config file
      const configPath = path.join(process.cwd(), ".gitpusher_config.json");

      // Check if config already exists and preserve it
      let existingConfig = {};
      if (fs.existsSync(configPath)) {
        try {
          const existing = fs.readFileSync(configPath, "utf8");
          existingConfig = JSON.parse(existing);
        } catch (err) {
          // Ignore parsing errors
        }
      }

      const config = {
        ...existingConfig,
        apikey,
        limit,
        token,
        ip,
        savedAt: new Date().toISOString(),
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      spinner.succeed(chalk.green("✅ Token verified and saved successfully!"));
      console.log(chalk.cyan("\n📊 Configuration Details:"));
      console.log(chalk.cyan("├── API Key: ") + chalk.white(apikey));
      console.log(chalk.cyan("└── Limit: ") + chalk.white(limit));
      return true;
    } else {
      spinner.fail(chalk.red("❌ Invalid token response."));
      return false;
    }
  } catch (err) {
    spinner.fail(chalk.red("❌ Error verifying token: " + err.message));
    console.log(chalk.yellow("💡 Please check your backend server and try again."));
    return false;
  }
}
