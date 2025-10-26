import fs from "fs";
import path from "path";
import chalk from "chalk";

const CONFIG_PATH = path.join(process.cwd(), ".gitpusher_config.json");
const USAGE_CACHE_PATH = path.join(process.cwd(), ".gitpusher_usage_cache.json");
const BATCH_SIZE = 3;

/**
 * Read the config file
 */
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return null;
    }
    const data = fs.readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.log(chalk.red("❌ Error reading config file:", err.message));
    return null;
  }
}

/**
 * Write to the config file
 */
function writeConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.log(chalk.red("❌ Error writing config file:", err.message));
    return false;
  }
}

/**
 * Read usage cache
 */
function readUsageCache() {
  try {
    if (!fs.existsSync(USAGE_CACHE_PATH)) {
      return [];
    }
    const data = fs.readFileSync(USAGE_CACHE_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

/**
 * Write usage cache
 */
function writeUsageCache(cache) {
  try {
    fs.writeFileSync(USAGE_CACHE_PATH, JSON.stringify(cache, null, 2));
    return true;
  } catch (err) {
    console.log(chalk.red("❌ Error writing usage cache:", err.message));
    return false;
  }
}

/**
 * Check if user has remaining limit
 */
export function checkLimit() {
  const config = readConfig();
  if (!config) {
    console.log(chalk.red("❌ Config file not found. Please run 'gitpusher config' first."));
    return false;
  }

  if (config.limit <= 0) {
    console.log(chalk.red("\n╔════════════════════════════════════════════╗"));
    console.log(chalk.red("║   ❌ Your usage limit has been reached!   ║"));
    console.log(chalk.red("╚════════════════════════════════════════════╝"));
    console.log(chalk.yellow("\n💡 Please contact support or upgrade your plan."));
    console.log(chalk.cyan(`   Token: ${config.token}`));
    console.log(chalk.cyan(`   Current Limit: ${config.limit}\n`));
    return false;
  }

  return true;
}

/**
 * Decrement limit by 1
 */
export function decrementLimit() {
  const config = readConfig();
  if (!config) {
    return false;
  }

  config.limit = Math.max(0, config.limit - 1);
  return writeConfig(config);
}

/**
 * Send usage data to API
 */
async function syncUsageToAPI(usageArray) {
  const config = readConfig();
  if (!config || !config.token) {
    console.log(chalk.red("❌ Cannot sync usage: missing token"));
    return false;
  }

  try {
    const response = await fetch("https://gitpusher-backend.vercel.app//api/usage/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: config.token,
        limit: config.limit,
        usageData: usageArray,
      }),
    });

    if (!response.ok) {
      console.log(chalk.yellow(`⚠️  Failed to sync usage data: ${response.statusText}`));
      return false;
    }

    const result = await response.json();
    if (result.success) {
      console.log(chalk.green("✅ Usage data synced successfully!"));
      return true;
    }
    return false;
  } catch (err) {
    console.log(chalk.yellow(`⚠️  Error syncing usage data: ${err.message}`));
    return false;
  }
}

/**
 * Track AI usage and store analytics
 */
export async function trackUsage(data) {
  const {
    commitMessage,
    status,
    branch = "",
    remote = "origin",
    repolink = "",
    userInput,
    modelResponseLength,
    responseMimeType = "application/json",
  } = data;

  // Create usage record matching your schema
  const usageRecord = {
    commitMessage,
    status,
    branch,
    remote,
    repolink,
    requestDetails: {
      userInput,
      modelResponseLength,
      responseMimeType,
    },
    timestamp: new Date().toISOString(),
  };

  // Read existing cache
  const cache = readUsageCache();
  cache.push(usageRecord);

  // Write updated cache
  writeUsageCache(cache);

  console.log(chalk.cyan(`📊 Usage tracked. Cache size: ${cache.length}/${BATCH_SIZE}`));

  // If we have 3 or more records, send to API
  if (cache.length >= BATCH_SIZE) {
    console.log(chalk.cyan("\n🔄 Syncing usage data to server..."));
    const success = await syncUsageToAPI(cache);

    if (success) {
      // Clear the cache after successful sync
      writeUsageCache([]);
    }
  }

  // Decrement the limit
  decrementLimit();

  // Check if limit reached zero
  const config = readConfig();
  if (config && config.limit === 0) {
    console.log(chalk.red("\n╔════════════════════════════════════════════╗"));
    console.log(chalk.red("║   ⚠️  Warning: This was your last use!    ║"));
    console.log(chalk.red("╚════════════════════════════════════════════╝"));
    console.log(chalk.yellow("\n💡 Your limit is now 0. Please upgrade to continue."));

    // Force sync any remaining cached data
    const remainingCache = readUsageCache();
    if (remainingCache.length > 0) {
      console.log(chalk.cyan("\n🔄 Syncing remaining usage data..."));
      await syncUsageToAPI(remainingCache);
      writeUsageCache([]);
    }
  }
}

/**
 * Get current limit info
 */
export function getLimitInfo() {
  const config = readConfig();
  if (!config) {
    return null;
  }

  return {
    limit: config.limit,
    token: config.token,
    apikey: config.apikey,
  };
}

/**
 * Force sync remaining cache (useful for cleanup)
 */
export async function forceSyncCache() {
  const cache = readUsageCache();
  if (cache.length === 0) {
    console.log(chalk.gray("No cached usage data to sync."));
    return true;
  }

  console.log(chalk.cyan(`\n🔄 Syncing ${cache.length} cached usage record(s)...`));
  const success = await syncUsageToAPI(cache);

  if (success) {
    writeUsageCache([]);
  }

  return success;
}
