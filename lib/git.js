import chalk from "chalk";
import { execSync } from "child_process";
import ora from "ora";

export async function doall(
  commitMsg = "Auto commit from gitpusher",
  branch = "",
  remote = "origin"
) {
  let spinner;

  try {
    // 🔍 detect repo root (so it works even if user runs inside bin/)
    const repoRoot = execSync("git rev-parse --show-toplevel").toString().trim();

    // Enhanced header
    console.log(chalk.cyan("\n╭─────────────────────────────────────╮"));
    console.log(chalk.cyan("│           🚀 GitPusher              │"));
    console.log(chalk.cyan("╰─────────────────────────────────────╯"));

    // Check git status first to see if there are any changes
    spinner = ora({
      text: "Checking for changes...",
      spinner: "dots",
      color: "cyan",
    }).start();

    let gitStatus;
    try {
      gitStatus = execSync("git status --porcelain", {
        cwd: repoRoot,
      }).toString().trim();
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

    spinner.succeed(chalk.green("✅ Changes detected"));

    // Show what files will be committed with enhanced styling
    const changedFiles = gitStatus.split("\n").slice(0, 3); // Show first 3 files
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
      const statusText = status.includes("M")
        ? chalk.yellow("Modified")
        : status.includes("A")
        ? chalk.green("Added")
        : status.includes("D")
        ? chalk.red("Deleted")
        : status.includes("??")
        ? chalk.blue("New")
        : chalk.gray("Changed");

      const prefix =
        index === changedFiles.length - 1 && totalFiles <= 3 ? "└──" : "├──";
      console.log(
        chalk.cyan(prefix) +
          ` ${statusIcon} ${statusText}: ${chalk.white(filename)}`
      );
    });

    if (totalFiles > 3) {
      console.log(
        chalk.cyan(`└── ${chalk.gray(`... and ${totalFiles - 3} more files`)}`)
      );
    }

    console.log(chalk.cyan("╰─────────────────────────────────────"));

    spinner = ora({
      text: "Adding files to staging area...",
      spinner: "dots",
      color: "cyan",
    }).start();
    execSync("git add .", { cwd: repoRoot, stdio: "ignore" });
    spinner.succeed(chalk.green("✅ Files staged successfully"));

    spinner = ora({
      text: `Creating commit: "${commitMsg}"...`,
      spinner: "dots",
      color: "cyan",
    }).start();
    try {
      const safeMsg = commitMsg.replace(/"/g, '\\"');
      execSync(`git commit -m "${safeMsg}"`, { cwd: repoRoot, stdio: "ignore" });
      spinner.succeed(
        chalk.green(`✅ Commit created: "${chalk.white(commitMsg)}"`)
      );
    } catch (err) {
      const output =
        (err.stdout?.toString() || "") +
        (err.stderr?.toString() || "") +
        (err.message || "");

      if (
        output.includes("nothing to commit") ||
        output.includes("no changes added to commit")
      ) {
        spinner.stopAndPersist({
          symbol: chalk.yellow("📌"),
          text: chalk.yellow("Nothing to commit."),
        });
        console.log(chalk.cyan("╰─────────────────────────────────────╯\n"));
        return; // 👉 stop here, no push if nothing to commit
      } else {
        spinner.fail(chalk.red("❌ Commit failed!"));
        console.log(chalk.red(`   Error: ${output}`));
        console.log(chalk.cyan("╰─────────────────────────────────────╯\n"));
        return;
      }
    }

    // Decide branch
    let targetBranch = branch;
    if (!targetBranch) {
      targetBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: repoRoot,
      })
        .toString()
        .trim();
    }

    // No "Already on main" message → suppress checkout output
    const branches = execSync("git branch --list", { cwd: repoRoot }).toString();
    if (!branches.includes(targetBranch)) {
      execSync(`git checkout -b ${targetBranch}`, {
        cwd: repoRoot,
        stdio: "ignore",
      });
    } else {
      execSync(`git checkout ${targetBranch}`, {
        cwd: repoRoot,
        stdio: "ignore",
      });
    }

    spinner = ora({
      text: `Pushing to ${remote}/${targetBranch}...`,
      spinner: "dots",
      color: "cyan",
    }).start();

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

    try {
      execSync(`git push -u ${remote} ${targetBranch}`, {
        cwd: repoRoot,
        stdio: "ignore",
      });
      spinner.succeed(
        chalk.green(
          `✅ Successfully pushed to ${chalk.white(remote)}/${chalk.white(
            targetBranch
          )}`
        )
      );

      console.log(chalk.cyan("\n📊 Push Summary:"));
      console.log(chalk.cyan("├─────────────────────────────────────"));
      console.log(chalk.cyan("├──") + ` 🌿 Branch: ${chalk.white(targetBranch)}`);
      console.log(chalk.cyan("├──") + ` 📡 Remote: ${chalk.white(remote)}`);
      console.log(chalk.cyan("├──") + ` 🔗 Repository: ${chalk.white(repoUrl)}`);
      console.log(chalk.cyan("├──") + ` 💬 Message: ${chalk.white(commitMsg)}`);
      console.log(chalk.cyan("╰─────────────────────────────────────"));
      console.log(chalk.green("🎉 All done! Your code is now pushed.\n"));
    } catch (pushErr) {
      spinner.fail(chalk.red("❌ Push failed!"));
      console.log(chalk.red(`   Error: ${pushErr.message}`));
      console.log(chalk.cyan("╰─────────────────────────────────────╯\n"));
    }
  } catch (err) {
    spinner?.fail(chalk.red("❌ Git process failed!"));
    console.log(chalk.red(`   Error: ${err.message}`));
    console.log(chalk.cyan("╰─────────────────────────────────────╯\n"));
  }
}
