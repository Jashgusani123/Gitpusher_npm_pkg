# gitpusher

> 🚀 Simple & AI powered Git auto commit + push tool

`gitpusher` makes it super easy to **commit and push your code** — either with your own message or with an **AI generated one**.

---

## ✨ Features
- 🖱️ Just one command to stage, commit & push
- 🤖 Auto-generate commit messages with AI (if you skip message)
- 🔥 Fun, simple commit messages in your own style (e.g. `"bhai push it"`)
- 🌐 Works with any GitHub/Git remote
- 📦 Global CLI install

---

## 📦 Installation

### Global install
```sh
npm install -g @jashg91/gitpusher
```

Now you can run `gitpusher` anywhere.

---

## 🚀 Usage
> ⚠️ **Note:** First-time users need to set a **Google Gemini API Key** if they want to use AI commit messages.  
> Without it, you can still use your own commit messages normally.
First time setup in your project:
```sh
git init
git remote add origin <your-repo-url>
```

Then push your code:

```sh
# With your own message
gitpusher "bhai push it"

# Another fun example
gitpusher "project khatam 🚀"


```

---

## 🛠 Example Output

```
✔ 📂 Files staged
✔ 🤖 Commit message: "fix: added login flow"
✔ 🚀 Code pushed to origin/main
```

---

## 📖 Commands

| Command              | Description                               |
| -------------------- | ----------------------------------------- |
| `gitpusher`          | Stage, commit, push with AI message       |
| `gitpusher "msg"`    | Commit & push with your own message       |
|                      |                                           |

---

## 🧑‍💻 Author
**Jash Rajivbhai Gusani**  
[@jashg91 on npm](https://www.npmjs.com/~jashg91)

---

## 📜 License
This project is proprietary software.  
All Rights Reserved © 2025 Jash Gusani.  
Unauthorized copying, modification, or distribution is prohibited.

