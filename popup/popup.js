document.addEventListener("DOMContentLoaded", async () => {
  const tokenInput = document.getElementById("token");
  const repoInput = document.getElementById("repo");
  const saveBtn = document.getElementById("save-btn");
  const configStatus = document.getElementById("config-status");
  const toggleSwitch = document.getElementById("toggle-switch");
  const activityLog = document.getElementById("activity-log");

  // Load config từ storage
  try {
    const result = await chrome.storage.local.get([
      "githubToken",
      "repoPath",
      "extensionEnabled",
    ]);
    if (result?.githubToken) {
      tokenInput.value = result.githubToken;
    }
    if (result?.repoPath) {
      repoInput.value = result.repoPath;
    }
    if (result?.extensionEnabled !== undefined) {
      toggleSwitch.checked = result.extensionEnabled;
    }
  } catch (error) {
    console.error("Failed to load config:", error);
    configStatus.innerText = "> Error: Failed to load config";
  }

  // Load activity log
  loadActivityLog();

  // Listen cho storage changes (real-time update)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.activityLog) {
      loadActivityLog();
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
    const token = tokenInput.value.trim();
    const repo = repoInput.value.trim();

    // Validate
    if (!token) {
      configStatus.innerText = "> Error: GitHub token required!";
      tokenInput.focus();
      return;
    }

    if (!repo) {
      configStatus.innerText =
        "> Error: Repo path required! (format: user/repo)";
      repoInput.focus();
      return;
    }

    // Validate repo format
    if (!repo.includes("/")) {
      configStatus.innerText =
        "> Error: Invalid format! Use: username/repository";
      return;
    }

    try {
      // Save to storage
      await chrome.storage.local.set({
        githubToken: token,
        repoPath: repo,
        saved_at: new Date().toISOString(),
      });

      configStatus.innerText = "> ✓ Config saved successfully!";

      // Reset message after 3 seconds
      setTimeout(() => {
        configStatus.innerText = "> System ready...";
      }, 3000);
    } catch (error) {
      console.error("Failed to save config:", error);
      configStatus.innerText = "> ✗ Error: Failed to save config";
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
        '<div class="log-entry">> Waiting for submissions...</div>';
      return;
    }

    // Show last 10 events
    logs
      .slice(-10)
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
