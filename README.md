# 🌉 AlgoBridge - LeetCode to GitHub Sync

**AlgoBridge** is a powerful Chrome extension that automatically syncs your LeetCode solutions directly to a GitHub repository. It helps you build a clean, organized portfolio of your DSA (Data Structures & Algorithms) solutions without any manual effort.

## 🚀 Features

- **Instant Sync**: Detects "Accepted" submissions on LeetCode and pushes them to GitHub immediately.
- **Auto-Repository Management**: Automatically creates the `dsa-solutions` repository if it doesn't exist.
- **Smart Organization**: Organizes solutions in a `leetcode/0001-two-sum/` structure with padded IDs for perfect sorting.
- **Comprehensive Documentation**: Every solution folder includes:
  - `README.md`: With the full problem description, constraints, and difficulty badges.
  - `solution.{ext}`: Your submitted code with performance metrics (Runtime/Memory) in the header.
- **Extensible Architecture**: Modular design prepared for future LLM-generated solution explanations and complexity analysis.
- **Sleek UI**: Modern, GitHub-style popup dashboard and non-intrusive on-screen notifications.

---

## 🛠️ Installation

1. **Download/Clone** this repository to your local machine (e.g., `D:\AlgoBridge`).
2. Open **Google Chrome** and navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** in the top right corner.
4. Click **"Load unpacked"**.
5. Select the `D:\AlgoBridge` folder.
6. The AlgoBridge icon should now appear in your extension toolbar.

---

## 🔑 Setup (GitHub Token)

To allow AlgoBridge to push code to your account, you need a GitHub Personal Access Token (PAT):

1. Go to [GitHub Token Settings](<https://github.com/settings/tokens/new?scopes=repo&description=AlgoBridge%20LeetCode%20Sync>).
2. Ensure the **`repo`** scope is selected (needed to create repositories and push code).
3. Click **"Generate token"**.
4. **Copy the token** (you won't see it again!).
5. Click the AlgoBridge extension icon in your browser.
6. Paste your token into the field and click **"Connect Account"**.
7. (Optional) Customize your repository name (default: `dsa-solutions`).

---

## 📖 How to Use

1. Navigate to any problem on [LeetCode](https://leetcode.com/problems/).
2. Solve the problem and click **"Submit"**.
3. Once the submission is **"Accepted"**, AlgoBridge will automatically:
   - Verify/Create your GitHub repository.
   - Parse the problem details and code.
   - Push the files to GitHub.
4. A toast notification will appear on the bottom-right of your screen with a link to the synced folder on GitHub.

---

## 🛠️ Technologies Used

- **Manifest V3**: Modern Chrome Extension architecture.
- **GitHub REST API**: For repository and content management.
- **LeetCode GraphQL API**: To fetch high-quality problem metadata.
- **Vanilla JavaScript**: Lightweight and fast performance.

---

## 🔮 Future Roadmap

- [ ] **LLM Explanations**: Automated generation of step-by-step intuition and formal complexity analysis using Claude/GPT.
- [ ] **Multi-Solution Support**: Track multiple versions/languages for the same problem.
- [ ] **Platform Expansion**: Support for HackerRank, Codeforces, and GFG.
- [ ] **Dark/Light Mode**: Full UI theme toggling.

---

### 🛡️ Privacy & Security

AlgoBridge stores your GitHub Token securely in `chrome.storage.sync` (synced across your Chrome instances if signed in). It only interacts with `leetcode.com` and `api.github.com`. Your token is used exclusively for syncing your own solutions to your chosen repository.

**Made with ❤️ for the DSA Community.**
claude --resume 16ac1453-64ea-43a2-b414-6be6d0d2e04f

claude --resume c8ffc6e5-dbc8-42ff-aedf-8372ab701797
