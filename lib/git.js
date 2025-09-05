import { execSync } from "child_process";
import ora from "ora";
import chalk from "chalk";

export async function doall(commitMsg = "Auto commit from gitpusher", branch = "") {
  let spinner;

  try {
    // 🔍 detect repo root (so it works even if user runs inside bin/)
    const repoRoot = execSync("git rev-parse --show-toplevel").toString().trim();

    spinner = ora("📂 Adding files...").start();
    execSync("git add .", { cwd: repoRoot });
    spinner.succeed("📂 Files added.");

    spinner = ora("📝 Committing...").start();
    try {
      const safeMsg = commitMsg.replace(/"/g, '\\"');
      execSync(`git commit -m "${safeMsg}"`, { cwd: repoRoot });
      spinner.succeed(`📝 Commit done. (${commitMsg})`);
    } catch (err) {
      const output =
        (err.stdout?.toString() || "") +
        (err.stderr?.toString() || "") +
        (err.message || "");

      if (
        output.includes("nothing to commit") ||
        output.includes("no changes added to commit")
      ) {
        spinner.stopAndPersist({ symbol: "📌", text: "Nothing to commit." });
        return;
      } else {
        spinner.fail("❌ Commit failed!");
        console.log(chalk.redBright(output));
        return;
      }
    }

    // Decide branch
    let targetBranch = branch;
    if (!targetBranch) {
      targetBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot })
        .toString()
        .trim();
    }

    // Check if branch exists locally
    const branches = execSync("git branch --list", { cwd: repoRoot }).toString();
    if (!branches.includes(targetBranch)) {
      execSync(`git checkout -b ${targetBranch}`, { cwd: repoRoot });
    } else {
      execSync(`git checkout ${targetBranch}`, { cwd: repoRoot });
    }

    spinner = ora(`🚀 Pushing to ${targetBranch}...`).start();
    const repoUrl = execSync("git config --get remote.origin.url", { cwd: repoRoot })
      .toString()
      .trim();

    execSync(`git push -u origin ${targetBranch}`, { cwd: repoRoot, stdio: "pipe" });
    spinner.succeed(`✅ Pushed (branch: ${targetBranch}, repo: ${repoUrl})`);

  } catch (err) {
    spinner?.fail("❌ Git process failed!");
    console.log(chalk.redBright(err.message));
  }
}
