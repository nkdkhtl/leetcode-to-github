import utils from "./utils.js";

// Helper: Log activity to storage
async function logActivity(message, type = "info") {
  try {
    const result = await chrome.storage.local.get(["activityLog"]);
    const logs = result?.activityLog || [];

    // Keep only last 50 logs
    if (logs.length >= 50) {
      logs.shift();
    }

    logs.push({
      message,
      type,
      time: new Date().toISOString(),
    });

    await chrome.storage.local.set({ activityLog: logs });
  } catch (error) {
    console.error("LTG: Failed to log activity:", error);
  }
}

// Helper: Get config safely
async function getConfig() {
  try {
    const result = await chrome.storage.local.get(["githubToken", "repoPath"]);

    const { githubToken, repoPath } = result || {};

    if (!githubToken || !repoPath) {
      throw new Error("Missing GitHub config (token or repo path)");
    }

    return { githubToken, repoPath };
  } catch (error) {
    console.error("LTG Background: Config error:", error);
    throw error;
  }
}

// Helper: Check if extension is enabled
async function isExtensionEnabled() {
  try {
    const result = await chrome.storage.local.get(["extensionEnabled"]);
    // Default to true if not set
    return result?.extensionEnabled !== false;
  } catch (error) {
    console.error("LTG: Failed to check extension status:", error);
    return true;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "pushToGithub") {
    const { title, body, lang, time, memory } = request.payload;

    // Handle async properly
    (async () => {
      try {
        // Check if extension is enabled
        const enabled = await isExtensionEnabled();
        if (!enabled) {
          const msg = "Extension is disabled";
          await logActivity(msg, "warning");
          sendResponse({ success: false, error: msg });
          return;
        }

        const { githubToken, repoPath } = await getConfig();

        await handleGithubUpload(
          githubToken,
          repoPath,
          title,
          body,
          lang,
          time,
          memory,
        );
        sendResponse({ success: true });
      } catch (error) {
        console.error("LTG Background: Error:", error);
        logActivity(`✗ Push failed: ${error.message}`, "error");
        sendResponse({ success: false, error: error.message });
      }
    })();

    // Return true to indicate async response
    return true;
  }
});

async function handleGithubUpload(
  token,
  repoPath,
  title,
  body,
  lang,
  time = "",
  memory = "",
) {
  try {
    const fileName = utils.formatFileName(title);
    const extension = utils.getFileExtension(lang);
    const content = utils.encodeBase64(body);
    const path = `solution/${fileName}.${extension}`;

    // Build commit message with stats
    let message = `LTG: Added solution for ${title}`;
    if (time || memory) {
      message += ` | ${time}${memory ? " | " + memory : ""}`;
    }

    const url = `https://api.github.com/repos/${repoPath}/contents/${path}`;

    // Check if file exists
    const checkRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let sha = null;
    if (checkRes.status === 200) {
      const fileData = await checkRes.json();
      sha = fileData.sha;
    }

    // Upload file
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        content: content,
        sha: sha,
      }),
    });

    if (response.ok) {
      const successMsg = `✓ Pushed: ${title} [${lang}]`;
      await logActivity(successMsg, "success");

      // Show desktop notification
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon/icon-128.png",
        title: "✓ Push Successful",
        message: `${title} has been pushed to GitHub!`,
        priority: 2,
      });
    } else {
      const errData = await response.json();
      const errorMsg = `✗ Push failed: ${errData.message || "Unknown error"}`;
      console.error(
        "❌ LTG Background: Github API error (status",
        response.status + "):",
        errData.message,
      );
      await logActivity(errorMsg, "error");

      // Show error notification
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon/icon-128.png",
        title: "✗ Push Failed",
        message: `Failed to push ${title}: ${errData.message}`,
        priority: 2,
      });
    }
  } catch (err) {
    const errorMsg = `✗ Connection error: ${err.message}`;
    console.error(
      "❌ LTG Background: Connection/Network error:",
      err.message,
      err,
    );
    await logActivity(errorMsg, "error");

    // Show error notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon/icon-128.png",
      title: "✗ Network Error",
      message: `Connection failed: ${err.message}`,
      priority: 2,
    });
  }
}
