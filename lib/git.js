import { execSync } from "child_process";
import ora from "ora";
import chalk from "chalk";

export async function doall(commitMsg = "Auto commit from gitpusher", branch = "") {
  let spinner;
  try {
    spinner = ora("📂 Adding files...").start();
    execSync("git add .");
    spinner.succeed("📂 Files added.");

    spinner = ora("📝 Committing...").start();
    try {
      const safeMsg = commitMsg.replace(/"/g, '\\"');
      execSync(`git commit -m "${safeMsg}"`);
      spinner.succeed(`📝 Commit done. (${commitMsg})`);
    } catch (err) {
      if ((err.stdout?.toString() || "").includes("nothing to commit")) {
        spinner.stopAndPersist({ symbol: "📌", text: "Nothing to commit." });
        return;
      }
      spinner.fail("❌ Commit failed!");
      console.log(chalk.redBright(err.message));
      return;
    }

    // Decide branch
    let targetBranch = branch;
    if (!targetBranch) {
      targetBranch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
    }

    // Check if branch exists locally
    const branches = execSync("git branch --list").toString();
    if (!branches.includes(targetBranch)) {
      execSync(`git checkout -b ${targetBranch}`);
    } else {
      execSync(`git checkout ${targetBranch}`);
    }

    spinner = ora(`🚀 Pushing to ${targetBranch}...`).start();
    const repoUrl = execSync("git config --get remote.origin.url").toString().trim();

    execSync(`git push -u origin ${targetBranch}`, { stdio: "pipe" });
    spinner.succeed(`✅ Pushed (branch: ${targetBranch}, repo: ${repoUrl})`);

  } catch (err) {
    spinner?.fail("❌ Git process failed!");
    console.log(chalk.redBright(err.message));
  }
}
