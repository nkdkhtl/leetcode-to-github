import utils from "./utils.js";

console.log("🔥 LTG Background: Service worker started!");

// Register your GitHub OAuth App client id here.
// GitHub OAuth app should allow Device Flow and request the `repo` scope.
const GITHUB_OAUTH_CLIENT_ID = "Ov23liQhkOFtlMba7oLO";
const GITHUB_OAUTH_CLIENT_ID_PLACEHOLDER =
    "REPLACE_WITH_GITHUB_OAUTH_APP_CLIENT_ID";

// Đảm bảo background script được wake up khi cần
chrome.runtime.onStartup.addListener(() => {
    console.log("🚀 LTG Background: Browser startup detected");
    setupKeepAlive();
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log(
        "📦 LTG Background: Extension installed/updated",
        details.reason,
    );
    setupKeepAlive();
});

// Keep-alive mechanism using chrome.alarms (works with MV3 service workers)
function setupKeepAlive() {
    // Create an alarm that fires every minute to keep background alive
    // Note: Chrome minimum is 1 minute, but in dev mode can be as low as 30 seconds
    chrome.alarms.create("keepAlive", {
        periodInMinutes: 1, // Fire every minute
    });
    console.log("💓 LTG Background: Keep-alive alarm created (every 1 min)");
}

// Listen to alarm to keep background active
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "keepAlive") {
        console.log("💓 LTG Background: Keep-alive ping");
    }
});

// Initialize on load
setupKeepAlive();

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
        const result = await chrome.storage.local.get([
            "githubToken",
            "repoPath",
        ]);

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
    if (request.action === "startGithubOAuth") {
        (async () => {
            try {
                const authResult = await startGitHubDeviceOAuth();
                sendResponse({
                    success: true,
                    username: authResult.username,
                });
            } catch (error) {
                console.error("❌ LTG OAuth error:", error);
                sendResponse({
                    success: false,
                    error: error.message,
                    code: error.code || null,
                });
            }
        })();

        return true;
    }

    if (request.action === "disconnectGithub") {
        (async () => {
            try {
                await chrome.storage.local.remove([
                    "githubToken",
                    "githubUsername",
                    "githubName",
                    "githubAvatarUrl",
                    "oauthDeviceUserCode",
                    "oauthDeviceVerifyUrl",
                ]);
                await logActivity("✓ GitHub disconnected", "info");
                sendResponse({ success: true });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();

        return true;
    }

    if (request.action === "getGithubRepos") {
        (async () => {
            try {
                const repos = await fetchGitHubRepositories();
                sendResponse({ success: true, repos });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();

        return true;
    }

    // Handle ping to keep background alive
    if (request.action === "ping") {
        sendResponse({ status: "alive" });
        return true;
    }

    if (request.action === "pushToGithub") {
        const { title, body, lang, time, memory } = request.payload;
        console.log("📨 LTG Background: Received push request for:", title);

        // Handle async properly - return true FIRST before async operations
        (async () => {
            try {
                // Check if extension is enabled
                const enabled = await isExtensionEnabled();
                console.log("🔍 LTG Background: Extension enabled?", enabled);
                if (!enabled) {
                    const msg = "Extension is disabled";
                    await logActivity(msg, "warning");
                    sendResponse({ success: false, error: msg });
                    return;
                }

                const { githubToken, repoPath } = await getConfig();
                console.log(
                    "🔐 LTG Background: Config loaded. Repo:",
                    repoPath,
                );

                await handleGithubUpload(
                    githubToken,
                    repoPath,
                    title,
                    body,
                    lang,
                    time,
                    memory,
                );
                console.log("✅ LTG Background: Upload completed successfully");
                sendResponse({ success: true });
            } catch (error) {
                console.error("❌ LTG Background: Error:", error);
                logActivity(`✗ Push failed: ${error.message}`, "error");
                sendResponse({ success: false, error: error.message });
            }
        })();

        // CRITICAL: Return true synchronously to keep message channel open
        return true;
    }

    // Return false for unknown actions (don't keep channel open)
    return false;
});

async function startGitHubDeviceOAuth() {
    if (
        !GITHUB_OAUTH_CLIENT_ID ||
        GITHUB_OAUTH_CLIENT_ID === GITHUB_OAUTH_CLIENT_ID_PLACEHOLDER
    ) {
        throw new Error("OAuth client id is not configured in background.js");
    }

    await logActivity("Starting GitHub OAuth device flow...", "info");

    const codeResponse = await fetch("https://github.com/login/device/code", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: GITHUB_OAUTH_CLIENT_ID,
            scope: "repo",
        }),
    });

    if (!codeResponse.ok) {
        const errorText = await codeResponse.text();
        let errorJson = null;
        try {
            errorJson = JSON.parse(errorText);
        } catch {
            // Keep original error format if body is not JSON.
        }

        if (errorJson?.error === "device_flow_disabled") {
            const deviceFlowError = new Error(
                "Device Flow is disabled for this OAuth app. Enable Device Flow in your GitHub OAuth App settings.",
            );
            deviceFlowError.code = "device_flow_disabled";
            throw deviceFlowError;
        }

        if (errorJson?.error_description) {
            throw new Error(errorJson.error_description);
        }

        throw new Error(
            `Failed to start OAuth (${codeResponse.status}): ${errorText || "no response body"}`,
        );
    }

    const codeData = await codeResponse.json();
    console.log("🔐 LTG OAuth device response:", codeData);
    if (!codeData?.device_code) {
        throw new Error(
            codeData?.error_description || "Invalid OAuth response",
        );
    }

    const verifyUrl =
        codeData.verification_uri_complete || codeData.verification_uri;

    if (!verifyUrl) {
        throw new Error("GitHub did not return a verification URL");
    }

    const shouldShowCodeInPopup = isSkipAccountPickerUrl(verifyUrl);
    if (shouldShowCodeInPopup) {
        await chrome.storage.local.set({
            oauthDeviceUserCode: codeData.user_code || "",
            oauthDeviceVerifyUrl: verifyUrl,
        });
    } else {
        await chrome.storage.local.remove([
            "oauthDeviceUserCode",
            "oauthDeviceVerifyUrl",
        ]);
    }

    await chrome.tabs.create({ url: verifyUrl, active: true });
    await logActivity(
        `OAuth opened. Enter code: ${codeData.user_code}`,
        "info",
    );

    try {
        const token = await pollForGitHubAccessToken(
            codeData.device_code,
            codeData.interval || 5,
            codeData.expires_in || 900,
        );

        const userRes = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
            },
        });

        if (!userRes.ok) {
            throw new Error(
                "OAuth succeeded but failed to load GitHub user profile",
            );
        }

        const user = await userRes.json();

        await chrome.storage.local.set({
            githubToken: token,
            githubUsername: user.login,
            githubName: user.name || "",
            githubAvatarUrl: user.avatar_url || "",
            githubAuthAt: new Date().toISOString(),
        });

        await chrome.storage.local.remove([
            "oauthDeviceUserCode",
            "oauthDeviceVerifyUrl",
        ]);

        await logActivity(
            `✓ GitHub OAuth connected as ${user.login}`,
            "success",
        );
        return { username: user.login };
    } catch (error) {
        await chrome.storage.local.remove([
            "oauthDeviceUserCode",
            "oauthDeviceVerifyUrl",
        ]);
        throw error;
    }
}

function isSkipAccountPickerUrl(url) {
    try {
        const parsed = new URL(url);
        return (
            parsed.origin === "https://github.com" &&
            parsed.pathname === "/login/device" &&
            parsed.searchParams.get("skip_account_picker") === "true"
        );
    } catch {
        return false;
    }
}

async function fetchGitHubRepositories() {
    const result = await chrome.storage.local.get(["githubToken"]);
    const token = result?.githubToken;

    if (!token) {
        throw new Error("GitHub is not connected");
    }

    const repoRes = await fetch(
        "https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc",
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
            },
        },
    );

    if (!repoRes.ok) {
        throw new Error(`Failed to load repositories (${repoRes.status})`);
    }

    const repos = await repoRes.json();
    return (Array.isArray(repos) ? repos : []).map((repo) => ({
        id: repo.id,
        fullName: repo.full_name,
        private: Boolean(repo.private),
    }));
}

async function pollForGitHubAccessToken(
    deviceCode,
    baseIntervalSeconds,
    expiresInSeconds,
) {
    const startedAt = Date.now();
    const timeoutAt = startedAt + expiresInSeconds * 1000;
    let intervalSeconds = Math.max(1, baseIntervalSeconds);

    while (Date.now() < timeoutAt) {
        const tokenRes = await fetch(
            "https://github.com/login/oauth/access_token",
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    client_id: GITHUB_OAUTH_CLIENT_ID,
                    device_code: deviceCode,
                    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                }),
            },
        );

        if (!tokenRes.ok) {
            throw new Error(`OAuth token request failed (${tokenRes.status})`);
        }

        const tokenData = await tokenRes.json();
        if (tokenData?.access_token) {
            return tokenData.access_token;
        }

        if (tokenData?.error === "authorization_pending") {
            await delay(intervalSeconds * 1000);
            continue;
        }

        if (tokenData?.error === "slow_down") {
            intervalSeconds += 5;
            await delay(intervalSeconds * 1000);
            continue;
        }

        if (tokenData?.error === "access_denied") {
            throw new Error("GitHub authorization denied");
        }

        if (tokenData?.error === "expired_token") {
            throw new Error("OAuth device code expired. Please try again");
        }

        throw new Error(tokenData?.error_description || "OAuth failed");
    }

    throw new Error("OAuth timed out. Please try again");
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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
        console.log("📁 LTG: Target path:", path);

        // Build commit message with stats
        let message = `LTG: Added solution for ${title}`;
        if (time || memory) {
            message += ` | ${time}${memory ? " | " + memory : ""}`;
        }

        const url = `https://api.github.com/repos/${repoPath}/contents/${path}`;

        // Check if file exists
        console.log("🔍 LTG: Checking if file exists...");
        const checkRes = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        let sha = null;
        if (checkRes.status === 200) {
            const fileData = await checkRes.json();
            sha = fileData.sha;
            console.log("📝 LTG: File exists, will update (SHA found)");
        } else {
            console.log("✨ LTG: New file, will create");
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
            console.log("🎉 LTG: GitHub API success!");
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
