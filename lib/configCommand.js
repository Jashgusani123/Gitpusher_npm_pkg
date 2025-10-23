import chalk from "chalk";
import inquirer from "inquirer";
import { verifyAndSaveToken, deleteApiKeyFromDB } from "./apikey.js";
import { getLimitInfo, forceSyncCache } from "./usageTracker.js";

export async function handleConfigCommand() {
  console.log(chalk.cyan("\n╭─────────────────────────────────────╮"));
  console.log(chalk.cyan("│       ⚙️  GitPusher Config          │"));
  console.log(chalk.cyan("╰─────────────────────────────────────╯\n"));

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: chalk.green("🔑 Add Token"), value: "add" },
        { name: chalk.blue("📊 View Usage Info"), value: "info" },
        { name: chalk.cyan("🔄 Sync Usage Cache"), value: "sync" },
        { name: chalk.red("🗑️  Delete Configuration"), value: "delete" },
        { name: chalk.gray("❌ Exit"), value: "exit" },
      ],
    },
  ]);

  if (action === "add") {
    await handleAddToken();
  } else if (action === "info") {
    await handleViewInfo();
  } else if (action === "sync") {
    await handleSyncCache();
  } else if (action === "delete") {
    await handleDeleteKey();
  } else {
    console.log(chalk.gray("\n👋 Exiting config..."));
    process.exit(0);
  }
}

async function handleAddToken() {
  const { token } = await inquirer.prompt([
    {
      type: "input",
      name: "token",
      message: chalk.cyan("🔑 Enter your token: "),
      validate: (input) => (input ? true : "Token cannot be empty"),
    },
  ]);

  await verifyAndSaveToken(token);
}

async function handleViewInfo() {
  const info = getLimitInfo();

  if (!info) {
    console.log(chalk.red("\n❌ No configuration found."));
    console.log(chalk.yellow("💡 Run 'gitpusher config' and add a token first.\n"));
    return;
  }

  console.log(chalk.cyan("\n╭─────────────────────────────────────╮"));
  console.log(chalk.cyan("│         📊 Usage Information        │"));
  console.log(chalk.cyan("╰─────────────────────────────────────╯\n"));
  console.log(chalk.cyan("├── Token:    ") + chalk.white(info.token));
  console.log(chalk.cyan("├── API Key:  ") + chalk.white(info.apikey));
  console.log(chalk.cyan("└── Remaining Limit: ") + chalk.white(info.limit));

  if (info.limit <= 10) {
    console.log(chalk.yellow("\n⚠️  Warning: Low usage limit remaining!"));
  }
  console.log();
}

async function handleSyncCache() {
  console.log(chalk.cyan("\n🔄 Attempting to sync cached usage data...\n"));
  await forceSyncCache();
  console.log();
}

async function handleDeleteKey() {
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: chalk.yellow("⚠️  Are you sure you want to delete your configuration?"),
      default: false,
    },
  ]);

  if (confirm) {
    const result = await deleteApiKeyFromDB();
    if (result) {
      console.log(chalk.green("\n✅ Configuration deleted successfully!"));
    } else {
      console.log(chalk.red("\n❌ Failed to delete configuration."));
    }
  } else {
    console.log(chalk.gray("\n👋 Cancelled."));
  }
}
