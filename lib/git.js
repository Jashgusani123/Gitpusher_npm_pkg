import chalk from "chalk";
import { execSync } from "child_process";
import ora from "ora";
import { ensureApiKey } from "./keyManager.js"; // 🔑 new utility for key/token handling

export async function doall(
  commitMsg = "chore: auto commit from gitpusher",
  branch = "",
  remote = "origin"
) {
  let spinner;
  let gitDetails = {
    branch: "",
    remote: remote,
    repolink: "",
  };

  try {
    // 🔑 Step 1: Check API key before doing anything
    const hasKey = await ensureApiKey();
    if (!hasKey) {
      console.log(chalk.red("\n❌ No API key available. Aborting push.\n"));
      return;
    }

    // 🔍 Step 2: Detect repo root
    const repoRoot = execSync("git rev-parse --show-toplevel").toString().trim();

    // Enhanced header
    console.log(chalk.cyan("\n╭─────────────────────────────────────╮"));
    console.log(chalk.cyan("│           🚀 GitPusher              │"));
    console.log(chalk.cyan("╰─────────────────────────────────────╯"));

    // Step 3: Git status
    spinner = ora({
      text: "Checking for changes...",
      spinner: "dots",
      color: "cyan",
    }).start();

    let gitStatus;
    try {
      gitStatus = execSync("git status --porcelain", { cwd: repoRoot })
        .toString()
        .trim();
    } catch (err) {
      spinner.fail(chalk.red("❌ Failed to check git status!"));
      console.log(chalk.red(`   Error: ${err.message}`));
      return;
    }

    if (!gitStatus) {
      spinner.stopAndPersist({
        symbol: chalk.yellow("📌"),
        text: chalk.yellow("No changes detected. Nothing to commit or push."),
      });
      console.log(chalk.cyan("╰─────────────────────────────────────╯\n"));
      return;
    }

    spinner.succeed(chalk.green(" Changes detected"));

    // Step 4: Show files
    const changedFiles = gitStatus.split("\n").slice(0, 3);
    const totalFiles = gitStatus.split("\n").length;

    console.log(chalk.cyan("\n📋 Files to commit:"));
    console.log(chalk.cyan("├─────────────────────────────────────"));
    changedFiles.forEach((file, index) => {
      const status = file.substring(0, 2);
      const filename = file.substring(3);
      const statusIcon = status.includes("M")
        ? chalk.yellow("📝")
        : status.includes("A")
        ? chalk.green("➕")
        : status.includes("D")
        ? chalk.red("🗑️")
        : status.includes("??")
        ? chalk.blue("📄")
        : chalk.gray("📋");

      const prefix =
        index === changedFiles.length - 1 && totalFiles <= 3 ? "└──" : "├──";
      console.log(chalk.cyan(prefix) + ` ${statusIcon} ${chalk.white(filename)}`);
    });

    if (totalFiles > 3) {
      console.log(
        chalk.cyan(`└── ${chalk.gray(`... and ${totalFiles - 3} more files`)}`)
      );
    }
    console.log(chalk.cyan("╰─────────────────────────────────────"));

    // Step 5: Stage
    spinner = ora("Adding files...").start();
    execSync("git add .", { cwd: repoRoot, stdio: "ignore" });
    spinner.succeed(chalk.green(" Files staged"));

    // Step 6: Commit
    spinner = ora(`Committing: "${commitMsg}"...`).start();
    try {
      const safeMsg = commitMsg.replace(/"/g, '\\"');
      execSync(`git commit -m "${safeMsg}"`, { cwd: repoRoot, stdio: "ignore" });
      spinner.succeed(chalk.green(` Commit created: "${chalk.white(commitMsg)}"`));
    } catch (err) {
      spinner.stopAndPersist({
        symbol: chalk.yellow("📌"),
        text: chalk.yellow("Nothing to commit."),
      });
      console.log(chalk.cyan("╰─────────────────────────────────────╯\n"));
      return;
    }

    // Step 7: Branch setup
    let targetBranch = branch;
    if (!targetBranch) {
      targetBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: repoRoot,
      })
        .toString()
        .trim();
    }

    const branches = execSync("git branch --list", { cwd: repoRoot }).toString();
    if (!branches.includes(targetBranch)) {
      execSync(`git checkout -b ${targetBranch}`, { cwd: repoRoot, stdio: "ignore" });
    } else {
      execSync(`git checkout ${targetBranch}`, { cwd: repoRoot, stdio: "ignore" });
    }

    // Store branch info
    gitDetails.branch = targetBranch;

    // Step 8: Push
    spinner = ora(`Pushing to ${remote}/${targetBranch}...`).start();

    let repoUrl = "";
    try {
      repoUrl = execSync(`git config --get remote.${remote}.url`, {
        cwd: repoRoot,
      })
        .toString()
        .trim();
    } catch {
      repoUrl = `(no remote '${remote}' configured)`;
    }

    // Store repolink
    gitDetails.repolink = repoUrl;

    try {
      execSync(`git push -u ${remote} ${targetBranch}`, {
        cwd: repoRoot,
        stdio: "ignore",
      });
      spinner.succeed(
        chalk.green(` Pushed to ${chalk.white(remote)}/${chalk.white(targetBranch)}`)
      );

      console.log(chalk.cyan("\n📊 Push Summary:"));
      console.log(chalk.cyan("├── 🌿 Branch: ") + chalk.white(targetBranch));
      console.log(chalk.cyan("├── 📡 Remote: ") + chalk.white(remote));
      console.log(chalk.cyan("├── 🔗 Repo:   ") + chalk.white(repoUrl));
      console.log(chalk.cyan("├── 💬 Msg:    ") + chalk.white(commitMsg));
      console.log(chalk.cyan("╰─────────────────────────────────────"));
      console.log(chalk.green("🎉 All done! Code is live.\n"));

      return gitDetails;
    } catch (pushErr) {
      spinner.fail(chalk.red("❌ Push failed!"));
      console.log(chalk.red(`   Error: ${pushErr.message}`));
      throw pushErr;
    }
  } catch (err) {
    spinner?.fail(chalk.red("❌ Git process failed!"));
    console.log(chalk.red(`   Error: ${err.message}`));
    throw err;
  }
}
