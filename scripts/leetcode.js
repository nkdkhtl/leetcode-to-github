console.log("🚀 LTG: Extension loaded on LeetCode page");

// Keep background service worker alive by pinging every 25 seconds
// This ensures background is ready to receive messages when user submits
let backgroundPingInterval = null;

function startBackgroundPing() {
  // Clear existing interval if any
  if (backgroundPingInterval) {
    clearInterval(backgroundPingInterval);
  }
  
  // Ping background every 25 seconds to keep it alive
  backgroundPingInterval = setInterval(() => {
    try {
      chrome.runtime.sendMessage(
        { action: "ping" },
        (response) => {
          // Silent ping, only log errors
          if (chrome.runtime.lastError) {
            console.warn("⚠️ LTG: Background ping failed:", chrome.runtime.lastError.message);
          }
        }
      );
    } catch (e) {
      console.warn("⚠️ LTG: Failed to ping background:", e);
    }
  }, 25000); // Every 25 seconds
  
  console.log("💓 LTG: Started background ping (every 25s)");
}

// Start pinging immediately
startBackgroundPing();

// Hàm inject script vào page context để truy cập window.monaco
function getMonacoData() {
  return new Promise((resolve) => {
    // Inject script vào page context
    const script = document.createElement("script");
    script.textContent = `
      (function() {
        try {
          if (window.monaco && window.monaco.editor) {
            const models = window.monaco.editor.getModels();
            if (models && models.length > 0) {
              const data = {
                code: models[0].getValue(),
                language: models[0].getLanguageId()
              };
              document.dispatchEvent(new CustomEvent('LTG_MONACO_DATA', { detail: data }));
            } else {
              document.dispatchEvent(new CustomEvent('LTG_MONACO_DATA', { detail: null }));
            }
          } else {
            document.dispatchEvent(new CustomEvent('LTG_MONACO_DATA', { detail: null }));
          }
        } catch (e) {
          document.dispatchEvent(new CustomEvent('LTG_MONACO_DATA', { detail: null }));
        }
      })();
    `;

    // Listen cho event từ page
    const listener = (e) => {
      document.removeEventListener("LTG_MONACO_DATA", listener);
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(e.detail);
    };

    document.addEventListener("LTG_MONACO_DATA", listener);
    (document.head || document.documentElement).appendChild(script);

    // Timeout fallback
    setTimeout(() => {
      document.removeEventListener("LTG_MONACO_DATA", listener);
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(null);
    }, 1000);
  });
}

// Hàm lấy Time và Memory stats
function getSubmissionStats() {
  return new Promise((resolve) => {
    try {
      // Method 1: Sử dụng selector tìm container chứa cả time và memory
      const statsContainer = document.querySelector(
        ".flex.w-full.flex-wrap.gap-3",
      );

      if (statsContainer) {
        const text = statsContainer.innerText;

        // Parse time (format: "Runtime\n48\nms")
        const timeMatch = text.match(
          /Runtime\s*\n?\s*(\d+(?:\.\d+)?)\s*\n?\s*ms/i,
        );
        const time = timeMatch ? timeMatch[1] + " ms" : null;

        // Parse memory (format: "Memory\n90.90\nMB")
        const memMatch = text.match(
          /Memory\s*\n?\s*(\d+(?:\.\d+)?)\s*\n?\s*MB/i,
        );
        const memory = memMatch ? memMatch[1] + " MB" : null;

        if (time && memory) {
          resolve({ time, memory });
          return;
        }
      }

      // Method 2: Fallback - tìm individual elements
      const timeElement =
        document.querySelector('[data-e2e-locator="submission-time"]') ||
        document.querySelector('span[title*="ms"]');

      const memoryElement =
        document.querySelector('[data-e2e-locator="submission-memory"]') ||
        document.querySelector('span[title*="MB"]');

      if (timeElement && memoryElement) {
        resolve({
          time: timeElement.innerText,
          memory: memoryElement.innerText,
        });
        return;
      }

      // Method 3: Tìm span chứa số và ms/MB
      const allSpans = Array.from(document.querySelectorAll("span"));
      let foundTime = null;
      let foundMemory = null;

      for (let span of allSpans) {
        const text = span.innerText?.trim() || "";
        if (text.match(/^\d+$/) || text.match(/^\d+\.\d+$/)) {
          // Check next sibling hoặc parent text
          const nextText = (
            span.nextElementSibling?.innerText ||
            span.parentElement?.innerText ||
            ""
          ).toLowerCase();
          if (nextText.includes("ms") && !foundTime) {
            foundTime = text + " ms";
          }
          if (nextText.includes("mb") && !foundMemory) {
            foundMemory = text + " MB";
          }
        }
      }

      if (foundTime && foundMemory) {
        resolve({ time: foundTime, memory: foundMemory });
        return;
      }

      // Method 4: Fallback - return null
      resolve(null);
    } catch (e) {
      console.error("LTG: Error getting stats:", e);
      resolve(null);
    }
  });
}

// Hàm lấy thông tin bài toán từ URL
function getProblemTitle() {
  const urlMatch =
    window.location.pathname.match(/\/problems\/([^\/]+)/)[0] + "/";
  const title = document.querySelector(`a[href='${urlMatch}']`).innerText;
  if (title) {
    return title;
  }
  console.warn("LTG: Cannot extract problem title from URL");
  return "unknown-problem";
}

// Hàm lấy code đã submit
async function getSubmittedCode() {
  // Method 1: Monaco API via injected script
  const monacoData = await getMonacoData();
  if (monacoData && monacoData.code) {
    return { code: monacoData.code, language: monacoData.language };
  }

  // Method 2: DOM .view-lines
  const codeElement = document.querySelector(".view-lines");
  if (codeElement && codeElement.innerText) {
    console.log("📝 LTG: Code extracted from .view-lines");
    return { code: codeElement.innerText, language: null };
  }

  console.error("LTG: ✗ Cannot extract code!");
  return null;
}

// Hàm lấy ngôn ngữ lập trình (fallback)
function getLanguageFallback() {
  // Method 1: localStorage
  try {
    const savedLang = localStorage.getItem("global_lang");
    if (savedLang) {
      return savedLang;
    }
  } catch (e) {
    // Cannot access localStorage
  }

  // Method 2: Button selector
  const langButton = document.querySelector(
    'button[id*="headlessui-listbox-button"]',
  );
  if (langButton && langButton.innerText) {
    const langText = langButton.innerText.toLowerCase();

    if (langText.includes("python")) return "python3";
    if (langText.includes("java")) return "java";
    if (langText.includes("javascript")) return "javascript";
    if (langText.includes("c++")) return "cpp";
    if (langText.includes("typescript")) return "typescript";
    if (langText.includes("c#")) return "csharp";
    if (langText.includes("go")) return "golang";
    if (langText.includes("rust")) return "rust";
  }

  return "python3";
}

// Map Monaco language IDs
function mapLanguage(lang) {
  const monacoLangMap = {
    python: "python3",
    java: "java",
    javascript: "javascript",
    typescript: "typescript",
    cpp: "cpp",
    csharp: "csharp",
    go: "golang",
    rust: "rust",
    c: "c",
  };
  return monacoLangMap[lang] || lang;
}

// Hàm xử lý khi submit thành công
async function handleSuccess() {
  // Chờ một chút để DOM update
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    // Check if extension is enabled
    const result = await chrome.storage.local.get(["extensionEnabled"]);
    const isEnabled = result?.extensionEnabled !== false;

    if (!isEnabled) {
      console.log("⏸️ LTG: Extension is OFF - skipping");
      return;
    }

    console.log("✅ LTG: Accepted detected! Processing...");
    const title = getProblemTitle();
    console.log("📄 LTG: Problem title:", title);

    const codeResult = await getSubmittedCode();
    const stats = await getSubmissionStats();
    console.log("📊 LTG: Stats -", stats);

    if (!codeResult || !codeResult.code) {
      console.error("LTG: Cannot extract code from page");
      return;
    }

    // Lấy language từ Monaco hoặc fallback
    let language = codeResult.language
      ? mapLanguage(codeResult.language)
      : getLanguageFallback();
    console.log("🔤 LTG: Language detected:", language);

    // Gửi message đến background script
    console.log("📤 LTG: Sending to background...");
    
    // Check if runtime is available before sending
    if (!chrome.runtime?.id) {
      console.error("❌ LTG: Extension context invalidated (may need reload)");
      return;
    }
    
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          {
            action: "pushToGithub",
            payload: {
              title: title,
              body: codeResult.code,
              lang: language,
              time: stats?.time || "",
              memory: stats?.memory || "",
            },
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("❌ LTG: Message error:", chrome.runtime.lastError);
              console.error("💡 LTG: Hint - Background may be sleeping. Try reloading extension.");
            } else if (response && response.error) {
              console.error("❌ LTG: Upload failed:", response.error);
            } else if (response && response.success) {
              console.log("✅ LTG: Successfully pushed to GitHub!");
            } else {
              console.warn("⚠️ LTG: No response from background (may be terminated)");
            }
            resolve(response);
          },
        );
      } catch (error) {
        console.error("❌ LTG: Failed to send message:", error);
        resolve(null);
      }
    });
  } catch (err) {
    console.error("LTG: ERROR in handleSuccess:", err);
  }
}

// Track submission đã được xử lý để tránh duplicate push
let handledSubmissionId = null;

// Hàm lấy submission ID từ URL
function getSubmissionIdFromUrl() {
  const match = window.location.pathname.match(/\/submissions\/(\d+)/);
  return match ? match[1] : null;
}

// Hàm kiểm tra accepted result
function checkAcceptedResult() {
  const resElm =
    document.querySelector('[data-e2e-locator="submission-result"]') ||
    document.querySelector('[class*="submission-result"]');

  if (resElm && resElm.innerText) {
    const resultText = resElm.innerText;

    if (resultText.includes("Accepted")) {
      const currentSubmissionId = getSubmissionIdFromUrl();

      // Chỉ trigger khi submission này chưa được xử lý
      if (currentSubmissionId && currentSubmissionId !== handledSubmissionId) {
        console.log("🎯 LTG: New accepted submission:", currentSubmissionId);
        handledSubmissionId = currentSubmissionId;
        handleSuccess();
      }
    }
  }
}

// Observer để phát hiện kết quả "Accepted"
// Throttle observer để tránh trigger liên tục
let observerTimeout = null;
const observer = new MutationObserver((mutations) => {
  try {
    // Throttle: chỉ check một lần mỗi 500ms
    if (observerTimeout) clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
      checkAcceptedResult();
    }, 500);
  } catch (err) {
    console.error("LTG: Error in observer:", err);
  }
});

// Bắt đầu observer - wait for body to be ready
function startObserver() {
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    console.log("👀 LTG: MutationObserver started");
  } else {
    // Fallback: wait for DOMContentLoaded
    console.warn("⚠️ LTG: document.body not ready, waiting...");
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
        console.log("👀 LTG: MutationObserver started (after DOMContentLoaded)");
      });
    } else {
      // Already loaded, retry
      setTimeout(() => {
        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
          console.log("👀 LTG: MutationObserver started (delayed)");
        }
      }, 100);
    }
  }
}

startObserver();

// Kiểm tra xem có result element nào đó sẵn có không (trường hợp script load muộn)
checkAcceptedResult();

// Reset handler khi URL thay đổi (tức là submit code mới)
const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;

window.history.pushState = function (...args) {
  handledSubmissionId = null; // Reset khi navigate
  return originalPushState.apply(window.history, args);
};

window.history.replaceState = function (...args) {
  handledSubmissionId = null; // Reset khi navigate
  return originalReplaceState.apply(window.history, args);
};

// Handle popstate event (back/forward button)
window.addEventListener('popstate', () => {
  handledSubmissionId = null;
  console.log("🔄 LTG: Navigation detected, reset submission tracking");
});
