document.addEventListener("DOMContentLoaded", async () => {
    const repoSelect = document.getElementById("repo-select");
    const saveBtn = document.getElementById("save-btn");
    const authBtn = document.getElementById("auth-btn");
    const disconnectBtn = document.getElementById("disconnect-btn");
    const themeToggle = document.getElementById("theme-toggle");
    const authStatus = document.getElementById("auth-status");
    const configStatus = document.getElementById("config-status");
    const toggleSwitch = document.getElementById("toggle-switch");
    const githubProfile = document.getElementById("github-profile");
    const githubAvatar = document.getElementById("github-avatar");
    const githubName = document.getElementById("github-name");
    const githubUsername = document.getElementById("github-username");
    const oauthCodePanel = document.getElementById("oauth-code-panel");
    const oauthDeviceCode = document.getElementById("oauth-device-code");
    const copyDeviceCodeBtn = document.getElementById("copy-device-code-btn");
    const openDevicePageBtn = document.getElementById("open-device-page-btn");
    let oauthVerifyUrl = "";

    async function renderOAuthDeviceCode() {
        try {
            const result = await chrome.storage.local.get([
                "githubToken",
                "oauthDeviceUserCode",
                "oauthDeviceVerifyUrl",
            ]);

            const hasToken = Boolean(result?.githubToken);
            const code = (result?.oauthDeviceUserCode || "").trim();
            oauthVerifyUrl = (result?.oauthDeviceVerifyUrl || "").trim();

            if (!hasToken && code) {
                oauthCodePanel.hidden = false;
                oauthDeviceCode.innerText = code;
                openDevicePageBtn.disabled = !oauthVerifyUrl;
            } else {
                oauthCodePanel.hidden = true;
                oauthDeviceCode.innerText = "---- ----";
                openDevicePageBtn.disabled = true;
            }
        } catch (error) {
            console.error("Failed to render OAuth code:", error);
            oauthCodePanel.hidden = true;
            oauthVerifyUrl = "";
        }
    }

    function resetRepoSelect(message = "Connect GitHub to load repos") {
        repoSelect.innerHTML = "";
        const option = document.createElement("option");
        option.value = "";
        option.textContent = message;
        repoSelect.appendChild(option);
    }

    async function loadRepoOptions(selectedRepo = "") {
        try {
            const response = await chrome.runtime.sendMessage({
                action: "getGithubRepos",
            });

            if (!response?.success) {
                resetRepoSelect("Failed to load repositories");
                return;
            }

            const repos = response.repos || [];
            repoSelect.innerHTML = "";

            if (repos.length === 0) {
                resetRepoSelect("No repositories found");
                return;
            }

            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Select a repository";
            repoSelect.appendChild(placeholder);

            repos.forEach((repo) => {
                const option = document.createElement("option");
                option.value = repo.fullName;
                option.textContent = repo.private
                    ? `${repo.fullName} (private)`
                    : repo.fullName;
                repoSelect.appendChild(option);
            });

            if (selectedRepo) {
                repoSelect.value = selectedRepo;
            }
        } catch (error) {
            console.error("Failed to load GitHub repos:", error);
            resetRepoSelect("Failed to load repositories");
        }
    }

    function applyTheme(mode) {
        const nextMode = mode === "dark" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", nextMode);
        themeToggle.innerText =
            nextMode === "dark" ? "Light mode" : "Dark mode";
    }

    async function initTheme() {
        try {
            const result = await chrome.storage.local.get(["themeMode"]);
            applyTheme(result?.themeMode || "light");
        } catch (error) {
            console.error("Failed to load theme:", error);
            applyTheme("light");
        }
    }

    async function renderAuthStatus() {
        try {
            const result = await chrome.storage.local.get([
                "githubToken",
                "githubUsername",
                "githubName",
                "githubAvatarUrl",
                "repoPath",
            ]);

            if (result?.githubToken) {
                const username = result.githubUsername || "GitHub user";
                authStatus.innerText = `Connected as ${username}`;
                authBtn.innerText = "Reconnect GitHub";
                disconnectBtn.hidden = false;

                githubName.innerText = result.githubName || username;
                githubUsername.innerText = `@${username}`;
                githubAvatar.src =
                    result.githubAvatarUrl ||
                    `https://github.com/${username}.png?size=80`;
                githubProfile.hidden = false;

                await loadRepoOptions(result.repoPath || "");
            } else {
                authStatus.innerText = "Not connected";
                authBtn.innerText = "Connect GitHub";
                disconnectBtn.hidden = true;
                githubProfile.hidden = true;
                resetRepoSelect();
            }

            await renderOAuthDeviceCode();
        } catch (error) {
            console.error("Failed to render auth status:", error);
            authStatus.innerText = "Error: Failed to load auth status";
            disconnectBtn.hidden = true;
            githubProfile.hidden = true;
            resetRepoSelect("Failed to load repositories");
            await renderOAuthDeviceCode();
        }
    }

    // Load config from storage
    try {
        const result = await chrome.storage.local.get([
            "repoPath",
            "extensionEnabled",
        ]);
        if (result?.extensionEnabled !== undefined) {
            toggleSwitch.checked = result.extensionEnabled;
        }
    } catch (error) {
        console.error("Failed to load config:", error);
        configStatus.innerText = "Error: Failed to load config";
    }

    await initTheme();
    await renderAuthStatus();

    // Load activity log
    loadActivityLog();

    // Listen cho storage changes (real-time update)
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local") {
            if (changes.activityLog) {
                loadActivityLog();
            }

            if (
                changes.oauthDeviceUserCode ||
                changes.oauthDeviceVerifyUrl ||
                changes.githubToken
            ) {
                renderOAuthDeviceCode();
            }
        }
    });

    copyDeviceCodeBtn.addEventListener("click", async () => {
        const code = oauthDeviceCode.innerText.trim();
        if (!code || code === "---- ----") {
            return;
        }

        try {
            await navigator.clipboard.writeText(code);
            configStatus.innerText = "Device code copied.";
        } catch (error) {
            console.error("Failed to copy device code:", error);
            configStatus.innerText = "Failed to copy code.";
        }
    });

    openDevicePageBtn.addEventListener("click", async () => {
        if (!oauthVerifyUrl) {
            return;
        }

        try {
            await chrome.tabs.create({ url: oauthVerifyUrl, active: true });
        } catch (error) {
            console.error("Failed to open OAuth page:", error);
            configStatus.innerText = "Failed to open OAuth page.";
        }
    });

    // Toggle switch handler
    toggleSwitch.addEventListener("change", async () => {
        const isEnabled = toggleSwitch.checked;
        try {
            await chrome.storage.local.set({ extensionEnabled: isEnabled });
        } catch (error) {
            console.error("Failed to save extension status:", error);
        }
    });

    // Save config
    saveBtn.addEventListener("click", async () => {
        const repo = repoSelect.value.trim();

        if (!repo) {
            configStatus.innerText = "Error: Please select a repository.";
            repoSelect.focus();
            return;
        }

        try {
            await chrome.storage.local.set({
                repoPath: repo,
                saved_at: new Date().toISOString(),
            });

            configStatus.innerText = "Config saved successfully.";

            // Reset message after 3 seconds
            setTimeout(() => {
                configStatus.innerText = "System ready.";
            }, 3000);
        } catch (error) {
            console.error("Failed to save config:", error);
            configStatus.innerText = "Error: Failed to save config";
        }
    });

    authBtn.addEventListener("click", async () => {
        authBtn.disabled = true;
        disconnectBtn.disabled = true;
        authStatus.innerText = "Starting GitHub OAuth...";

        try {
            const response = await chrome.runtime.sendMessage({
                action: "startGithubOAuth",
            });

            if (response?.success) {
                authStatus.innerText = `Connected as ${response.username}`;
                configStatus.innerText = "GitHub OAuth connected.";
                disconnectBtn.hidden = false;
                await renderAuthStatus();
            } else {
                authStatus.innerText = `OAuth failed: ${response?.error || "Unknown error"}`;
                disconnectBtn.hidden = true;
            }
        } catch (error) {
            console.error("OAuth failed:", error);
            authStatus.innerText = `OAuth failed: ${error.message}`;
            disconnectBtn.hidden = true;
        } finally {
            authBtn.disabled = false;
            disconnectBtn.disabled = false;
            await renderAuthStatus();
        }
    });

    disconnectBtn.addEventListener("click", async () => {
        disconnectBtn.disabled = true;

        try {
            await chrome.runtime.sendMessage({ action: "disconnectGithub" });
            authStatus.innerText = "Disconnected";
            configStatus.innerText = "GitHub disconnected.";
            await renderAuthStatus();
        } catch (error) {
            console.error("Disconnect failed:", error);
            authStatus.innerText = `Disconnect failed: ${error.message}`;
        } finally {
            disconnectBtn.disabled = false;
        }
    });

    themeToggle.addEventListener("click", async () => {
        const currentMode =
            document.documentElement.getAttribute("data-theme") === "dark"
                ? "dark"
                : "light";
        const nextMode = currentMode === "light" ? "dark" : "light";
        applyTheme(nextMode);

        try {
            await chrome.storage.local.set({ themeMode: nextMode });
        } catch (error) {
            console.error("Failed to save theme:", error);
        }
    });
});

// Load activity log từ storage
async function loadActivityLog() {
    const activityLog = document.getElementById("activity-log");
    try {
        const result = await chrome.storage.local.get(["activityLog"]);
        const logs = result?.activityLog || [];

        activityLog.innerHTML = "";

        if (logs.length === 0) {
            activityLog.innerHTML =
                '<div class="log-entry">Waiting for submissions...</div>';
            return;
        }

        // Show last 10 events
        logs.slice(-10)
            .reverse()
            .forEach((log) => {
                const entry = document.createElement("div");
                entry.className = `log-entry ${log.type || ""}`;
                const timestamp = new Date(log.time).toLocaleTimeString();
                entry.textContent = `[${timestamp}] ${log.message}`;
                activityLog.appendChild(entry);
            });

        // Auto scroll to bottom
        activityLog.scrollTop = activityLog.scrollHeight;
    } catch (error) {
        console.error("Failed to load activity log:", error);
    }
}
