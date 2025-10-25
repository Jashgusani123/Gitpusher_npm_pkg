# 🚀 GitPusher

> **AI-Powered Git Automation Tool**  
> Beautifully designed CLI with secure cloud integration for effortless commits and pushes.

GitPusher now brings a **powerful full-stack experience** — combining a **web dashboard**, **secure API key management**, and an **intelligent CLI** — to make your Git workflow smarter, faster, and safer.

<div align="center">

[![npm version](https://img.shields.io/npm/v/@jashg91/gitpusher?color=brightgreen)](https://www.npmjs.com/package/@jashg91/gitpusher)
[![Downloads](https://img.shields.io/npm/dm/@jashg91/gitpusher.svg?color=brightgreen)](https://www.npmjs.com/package/@jashg91/gitpusher)
[![Node.js Version](https://img.shields.io/node/v/@jashg91/gitpusher.svg?color=brightgreen)](https://nodejs.org/)

</div>

---

## ✨ Features

🎨 **Beautiful Terminal UI** — Modern bordered interface with icons and progress indicators  
🤖 **AI-Generated Commits** — Uses Google Gemini AI for natural, meaningful commit messages  
🔐 **Secure Cloud Integration** — Your API key stays encrypted and managed safely in the cloud  
🧠 **Smart Usage Analytics** — Tracks CLI usage and syncs with your dashboard automatically  
⚙️ **Flexible Configurations** — Works with multiple remotes and custom branches  
📊 **Dashboard Overview** — Manage API keys, usage, and stats visually  
🧱 **Project-Level Isolation** — Secure config file created per project  
🛡️ **Built for Security** — Hashed key storage, token verification, IP matching, and JWT protection  

---

## 🌐 Web Dashboard

> Manage everything from one place — your API keys, usage, and analytics.

🖥️ **Visit:** [https://gitpusher-dashboard.vercel.app/](https://gitpusher-dashboard.vercel.app/)

From the dashboard, you can:
- Add and manage **API keys**
- View **usage stats and limits**
- Sync **CLI activity**
- Delete your key permently 

---

## 🛠️ Installation

### Global Installation
```bash
npm install -g @jashg91/gitpusher
````

### Verify Installation

```bash
gitpusher --version

// OR you can use 

gipusher --v
```

---

## 🚀 Getting Started (Step-by-Step Setup)

### 🧩 Step 1: Create Your Account

Go to [GitPusher Dashboard](https://gitpusher-dashboard.vercel.app/) and **sign up** with your email.

---

### 🔐 Step 2: Generate Secure API Key

* After login, add your **API key** in the dashboard.
* GitPusher securely stores your key in the DataBase (hashed) and gives you a **one-time setup token**.
* Copy this token — you’ll use it to link your CLI.

---

### ⚙️ Step 3: Configure GitPusher CLI

In your project folder, run:

```bash
gitpusher config

? What would you like to do? (Use arrow keys)
❯ 🔑 Add Token
  📊 View Usage Info
  🔄 Sync Usage Cache
  🗑️  Delete Configuration
  ❌ Exit
```


Choose **“Add Token”** and paste the token you copied from the dashboard.

GitPusher automatically:

* Validates your token with the backend
* Retrieves your encrypted API key
* Generates a local config file 

🧱 **Important:**
Add this line to your `.gitignore` file:

```
gitpusher_config.json
gitpusher_usage_cache.json
```

This ensures your configuration never leaves your local system.

---

### ⚡ Step 4: Start Using GitPusher

```bash
# Generate AI-powered commit message and push automatically
gitpusher "add new features"

# Push to specific remote or branch
gitpusher "deploy to production" --remote origin
```

The CLI:

* Uses your **securely stored API key** for AI commits
* Tracks your usage
* Syncs data with the dashboard every 3 runs automatically

---

## 🔒 Security Highlights

| Layer                       | Protection                              | Description                                  |
| --------------------------- | --------------------------------------- | -------------------------------------------- |
| **API Key**                 | 🔐 Hashed and never shown in plain text | Stored securely in backend                   |
| **Dashboard Communication** | 🍪 JWT in httpOnly cookie               | Prevents frontend access to sensitive tokens |
| **CLI Auth**                | 🧩 One-time setup token                 | Prevents direct key exposure                 |
| **IP Verification**         | 🌍 IP stored during first use           | Prevents token theft or key reuse            |
| **Config File**             | 🧱 Local only + gitignored              | Prevents accidental upload to GitHub         |
| **Usage Sync**              | 🔁 Auto sync every 3 uses               | Keeps analytics and usage limits accurate    |


Every layer of GitPusher is designed to protect both your **API credentials** and your **development environment**.

---

## 🧠 How It Works (End-to-End Flow)

```text
[Frontend Dashboard] → [Backend Server] → [CLI Config] → [Git Operations] → [Dashboard Analytics]
```

### 🔄 Detailed Flow:

1. **User registers/login** on the [GitPusher Dashboard](https://gitpusher-dashboard.vercel.app/).
2. Dashboard securely generates a **hashed API key** and returns a **token** to the user.
3. User runs `gitpusher config` in the CLI and enters that token.
4. CLI calls the backend to **verify** and **store the API key** securely in `.gitpusher_config.json`.
5. GitPusher performs smart git operations using that key (AI commits, pushes).
6. Every **3rd CLI use**, usage data syncs back to the dashboard for analytics and tracking.

---

## 📊 Example Workflow

```
╭────────────────────────────────────────╮
│               🚀 GitPusher              │
╰────────────────────────────────────────╯

📋 Files to commit:
├────────────────────────────────────────
├── 📝 Modified: src/App.js
├── ➕ Added: src/utils/aiCommit.js
└── 📄 New: README.md
╰────────────────────────────────────────

✅ Files staged successfully  
✅ Commit created: "feat: add AI-powered commit system"
✅ Pushed to origin/main

📊 Push Summary:
├── 🌿 Branch: main
├── 📡 Remote: origin  
├── 💬 Message: feat: add AI-powered commit system
╰────────────────────────────────────────
🎉 Done! Synced with your dashboard.
```

---

## 🧠 Dashboard Insights

Once you start using the CLI:

* Your **usage statistics** auto-sync after every 3 pushes
* You can see **commit count**, **AI usage**, and **remaining quota**
* You can **delete or regenerate keys** anytime

---

## 🧩 Why GitPusher is Secure by Design

✅ No plain API key exposure
✅ End-to-end encrypted key exchange
✅ IP-locked token validation
✅ Local isolated config (never shared)
✅ Regular backend verification
✅ JWT-secured dashboard session

---
## 📝 Note 
The frontend dashboard is fully functional for API key management, analytics, and syncing.
However, a few features like updating your profile, custom preferences, and usage history filters are currently under development and will be available soon in future updates. 🚧

Stay tuned for the upcoming version with enhanced personalization and live usage tracking!


---

## 📄 License

This project is proprietary software.
**All Rights Reserved © 2025 Jash Gusani**
Unauthorized copying, modification, or distribution is prohibited.

---

## 🧑‍💻 Author

**Jash Gusani**

* 🌐 [GitHub](https://github.com/Jashgusani123)
* 📦 [npm Profile](https://www.npmjs.com/~jashg91)
* 💼 [LinkedIn](https://www.linkedin.com/in/gusanijash91/)

---

## ⭐ Support the Project

If GitPusher enhances your workflow:

* ⭐ Star the repository
* 💡 Suggest new features
* 🐛 Report bugs
* 📤 Share it with your team

---

<div align="center">

**Made with ❤️ by [Jash Gusani](https://github.com/Jashgusani123)**
*Transforming the way developers interact with Git — securely and intelligently.*

</div>