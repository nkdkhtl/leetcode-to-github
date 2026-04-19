# LeetCode to GitHub 🚀

**Automatically push your accepted LeetCode solutions to GitHub with OAuth login!**

A browser extension that seamlessly syncs your LeetCode accepted submissions to your GitHub repository, helping you build your coding portfolio effortlessly.

[![Firefox Add-on](https://img.shields.io/badge/Firefox-141e24.svg?&style=for-the-badge&logo=firefox-browser&logoColor=white)](https://addons.mozilla.org/firefox/downloads/file/4705666/1abfcf45fe1b4dcfbd00-1.3.1.xpi)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-4285F4?style=for-the-badge&logo=GoogleChrome&logoColor=white)](https://chrome.google.com/webstore)
[![Edge Add-ons](https://img.shields.io/badge/Edge-0078D4?style=for-the-badge&logo=microsoftedge&logoColor=white)]([https://microsoftedge.microsoft.com/addons](https://microsoftedge.microsoft.com/addons/detail/leetcode-to-github/lfieopaebajihgpifihbjomjojiigjjd))

---

## ✨ Features

- 🔄 **Automatic Sync** - Push accepted solutions to GitHub instantly
- 🎛️ **Toggle Control** - Enable/disable auto-push with one click
- 📊 **Activity Log** - Track recent submissions in real-time
- 🔔 **Desktop Notifications** - Get notified on success or failure
- 📈 **Performance Stats** - Save runtime and memory statistics
- 🎯 **Smart Detection** - Push each solution only once
- 📁 **Organized Structure** - All solutions saved in `solution/` folder
- 🌐 **Multi-language Support** - C++, Java, Python, JavaScript, and more
- 🔒 **Privacy-First** - All data stored locally, no tracking
- 🔐 **OAuth Sign-in** - No manual PAT creation for end users

---

## 📸 Screenshots

<details>
<summary>Extension Popup</summary>

![Extension Popup](screenshots/popup.png)

</details>

<details>
<summary>Activity Log</summary>

![Activity Log](screenshots/activity.png)

</details>

---

## 🚀 Installation

### From Browser Stores

**Firefox:**

- [Install from Firefox Add-ons](https://addons.mozilla.org/firefox/downloads/file/4705666/1abfcf45fe1b4dcfbd00-1.3.1.xpi)

**Chrome:**

- [Install from Chrome Web Store](https://chrome.google.com/webstore) (Coming soon)

**Microsoft Edge:**

- [Install from Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/leetcode-to-github/lfieopaebajihgpifihbjomjojiigjjd)

### Manual Installation (Development)

**Firefox:**

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file

**Chrome:**

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension folder

**Microsoft Edge:**

1. Download or clone this repository
2. Open Edge and navigate to `edge://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension folder

---

## ⚙️ Setup

1. Click the extension icon in your browser toolbar
2. **Toggle Extension Status**: Turn ON/OFF as needed
3. Click **"CONNECT_GITHUB"** to sign in with GitHub OAuth
4. **Repository Path**: Enter your repo in format `username/repository`
5. Click **"SAVE_CONFIG"**
6. Start solving LeetCode problems!

### OAuth App Setup (for extension developers)

This extension uses GitHub OAuth Device Flow. Before building for users, configure your GitHub OAuth App client id in `scripts/background.js`:

1. Create an OAuth App in GitHub settings
2. Copy the Client ID
3. Set `GITHUB_OAUTH_CLIENT_ID` in `scripts/background.js`
4. Rebuild/reload the extension

---

## 💡 Usage

1. Go to [LeetCode](https://leetcode.com) and solve a problem
2. Submit your solution
3. When you see "Accepted" ✅, the extension automatically:
    - Extracts your code
    - Detects the programming language
    - Captures runtime & memory stats
    - Pushes to your GitHub repository
4. Check the **Activity Log** in the popup for status
5. View your solutions in the `solution/` folder on GitHub!

**Your GitHub Repo Structure:**

```
your-repo/
├── solution/
│   ├── two-sum.cpp
│   ├── add-two-numbers.py
│   ├── longest-substring.java
│   └── ...
└── README.md
```

---

## 🔒 Privacy

This extension respects your privacy:

- ✅ All configuration stored **locally** in your browser
- ✅ No data collection or tracking
- ✅ No external servers (except GitHub API)
- ✅ OAuth access token is stored locally in your browser storage
- ✅ Open source - inspect the code yourself!

See [PRIVACY.md](PRIVACY.md) for full details.

---

## 🛠️ Tech Stack

- **Manifest V3** - Latest extension API
- **Pure JavaScript** - No frameworks, lightweight
- **Chrome Storage API** - Local data persistence
- **GitHub API** - Direct repository integration
- **Monaco Editor Detection** - Accurate code extraction

---

## 📋 Requirements

- Firefox 112+ or Chrome 88+
- Microsoft Edge 88+ (Chromium)
- GitHub account (OAuth login)
- LeetCode account

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development

```bash
# Clone the repository
git clone https://github.com/nkdkhtl/leetcode-to-github.git
cd leetcode-to-github

# Make your changes...

# Build the extension
chmod +x build.sh
./build.sh
```

---

## 📝 Changelog

See the full changelog in [CHANGELOG.md](CHANGELOG.md)

**v1.0.0** - Initial Release

- ✨ Auto-push accepted solutions
- 🎛️ ON/OFF toggle
- 📊 Activity log
- 🔔 Desktop notifications

---

## ⚠️ Known Issues

- LeetCode may update their DOM structure - extension will be updated accordingly
- GitHub API rate limit: 5000 requests/hour
- Duplicate files will be overwritten

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by various LeetCode sync tools
- Built with ❤️ for the coding community

---

## 📧 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/nkdkhtl/leetcode-to-github/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/nkdkhtl/leetcode-to-github/discussions)
- ⭐ **Star this repo** if you find it helpful!

---

<p align="center">Made with ❤️ by <a href="https://github.com/nkdkhtl">Nam Khuc</a></p>
<p align="center">⭐ Star this repo if you find it useful!</p>
