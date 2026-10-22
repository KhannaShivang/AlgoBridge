/**
 * AlgoBridge - LeetCode Content Script
 * Injected into leetcode.com/problems/* to observe submissions and trigger GitHub sync.
 */

(() => {
  console.log('[AlgoBridge] Content script loaded on LeetCode');

  // Prevent multiple executions in same frame
  if (window.__algoBridgeInitialized) return;
  window.__algoBridgeInitialized = true;

  let isSubmitting = false;
  let lastSyncedKey = '';
  let toastTimeout = null;

  // ==========================================
  // UI: On-Screen Floating Toast Notification
  // ==========================================

  function getOrCreateToast() {
    let toast = document.getElementById('algobridge-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'algobridge-toast';
      toast.innerHTML = `
        <div class="ab-toast-content">
          <span class="ab-toast-icon">🌉</span>
          <span class="ab-toast-text">AlgoBridge Ready</span>
        </div>
      `;

      // Toast Styles
      const style = document.createElement('style');
      style.textContent = `
        #algobridge-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          border-radius: 8px;
          background: #1e1e24;
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          transform: translateY(0);
          opacity: 0.9;
          pointer-events: auto;
        }
        #algobridge-toast.ab-hidden {
          opacity: 0;
          transform: translateY(12px);
          pointer-events: none;
        }
        #algobridge-toast.ab-syncing {
          border-color: #388bfd;
          background: #161b22;
        }
        #algobridge-toast.ab-success {
          border-color: #238636;
          background: #0d1e13;
          color: #e6ffed;
        }
        #algobridge-toast.ab-error {
          border-color: #da3633;
          background: #251214;
          color: #ffeef0;
        }
        .ab-toast-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ab-toast-icon {
          font-size: 16px;
        }
        .ab-toast-link {
          color: #58a6ff;
          text-decoration: underline;
          margin-left: 4px;
          font-weight: 500;
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(toast);
    }
    return toast;
  }

  function showToast(message, type = 'info', linkUrl = null, autoDismiss = true) {
    const toast = getOrCreateToast();
    toast.className = `ab-${type}`;

    let icon = '🌉';
    if (type === 'syncing') icon = '⏳';
    else if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';

    let html = `
      <div class="ab-toast-content">
        <span class="ab-toast-icon">${icon}</span>
        <span class="ab-toast-text">${message}</span>
        ${linkUrl ? `<a class="ab-toast-link" href="${linkUrl}" target="_blank" rel="noopener">View on GitHub</a>` : ''}
      </div>
    `;

    toast.innerHTML = html;
    toast.classList.remove('ab-hidden');

    if (toastTimeout) clearTimeout(toastTimeout);

    if (autoDismiss) {
      toastTimeout = setTimeout(() => {
        toast.classList.add('ab-hidden');
      }, 6000);
    }
  }

  // ==========================================
  // Submission Result Parsing
  // ==========================================

  function parseSubmissionStats() {
    let runtime = 'N/A';
    let runtimePercentile = '';
    let memory = 'N/A';
    let memoryPercentile = '';

    // 1. Try finding elements by data attributes if they exist (most robust)
    const runtimeEl = document.querySelector('[data-e2e-locator="submission-runtime"]');
    const memoryEl = document.querySelector('[data-e2e-locator="submission-memory"]');

    if (runtimeEl) runtime = runtimeEl.textContent.trim();
    if (memoryEl) memory = memoryEl.textContent.trim();

    // 2. If not found, fall back to searching text content, but try to limit to the result area
    const submissionResultArea = document.querySelector('[class*="submission-result"]') || document.body;
    const textNodes = submissionResultArea.innerText;

    if (runtime === 'N/A') {
        const runtimeMatch = textNodes.match(/([0-9.]+\s*ms)/i);
        if (runtimeMatch) runtime = runtimeMatch[1];
    }

    const runtimeBeatsMatch = textNodes.match(/Beats\s*([0-9.]+%)\s*of\s*users/i);
    if (runtimeBeatsMatch) runtimePercentile = runtimeBeatsMatch[1];

    if (memory === 'N/A') {
        const memoryMatch = textNodes.match(/([0-9.]+\s*MB)/i);
        if (memoryMatch) memory = memoryMatch[1];
    }

    const memoryBeatsMatch = textNodes.match(/Memory[\s\S]*?Beats\s*([0-9.]+%)\s*of\s*users/i);
    if (memoryBeatsMatch) memoryPercentile = memoryBeatsMatch[1];

    return {
      runtime,
      runtimePercentile,
      memory,
      memoryPercentile
    };
  }

  // ==========================================
  // Core Sync Trigger
  // ==========================================

  async function isAutoSyncEnabled() {
    return new Promise(resolve => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.get({ autoSync: true }, res => {
            if (chrome.runtime.lastError) {
              resolve(true);
            } else {
              resolve(res.autoSync !== false);
            }
          });
        } else {
          resolve(true);
        }
      } catch (e) {
        resolve(true);
      }
    });
  }

  async function triggerSync() {
    const autoSyncEnabled = await isAutoSyncEnabled();
    if (!autoSyncEnabled) {
      console.log('[AlgoBridge] Auto-sync is paused in settings. Skipping GitHub sync.');
      showToast('AlgoBridge: Auto-sync is paused. Solution not pushed.', 'info');
      isSubmitting = false;
      return;
    }

    const titleSlug = LeetCodeParser.extractSlug();
    if (!titleSlug) {
      console.warn('[AlgoBridge] Could not determine problem slug from URL');
      isSubmitting = false;
      return;
    }

    showToast('AlgoBridge: Preparing to sync solution...', 'syncing', null, false);

    try {
      // 1. Fetch Question Metadata from LeetCode GraphQL
      let questionData = await LeetCodeParser.fetchQuestionDetails(titleSlug);
      if (!questionData) {
        questionData = LeetCodeParser.parseFromDom();
      }

      // 2. Extract Submitted Code
      const code = LeetCodeParser.extractEditorCode();
      if (!code || code.trim().length === 0) {
        showToast('AlgoBridge: Could not extract code from editor.', 'error');
        return;
      }

      // 3. Prevent duplicate sync of same code version within short interval
      const syncKey = `${titleSlug}-${code.length}-${code.slice(0, 30)}`;
      if (syncKey === lastSyncedKey) {
        console.log('[AlgoBridge] Solution already synced recently. Skipping duplicate.');
        return;
      }

      // 4. Extract Language & Stats
      const language = LeetCodeParser.detectLanguage();
      const stats = parseSubmissionStats();

      showToast('AlgoBridge: Syncing to GitHub repo...', 'syncing', null, false);

      // 5. Send to Background Worker
      chrome.runtime.sendMessage(
        {
          action: 'SYNC_SUBMISSION',
          payload: {
            questionId: questionData.questionFrontendId || questionData.questionId || '0',
            title: questionData.title || titleSlug,
            titleSlug: titleSlug,
            folderName: LeetCodeParser.getFolderName(questionData.questionFrontendId || questionData.questionId || '0', questionData.title || titleSlug),
            difficulty: questionData.difficulty || 'Medium',
            language: language,
            code: code,
            runtime: stats.runtime,
            runtimePercentile: stats.runtimePercentile,
            memory: stats.memory,
            memoryPercentile: stats.memoryPercentile,
            descriptionHtml: questionData.content || '',
            topicTags: questionData.topicTags || []
          }
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error('[AlgoBridge] Runtime error:', chrome.runtime.lastError.message);
            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
              showToast('AlgoBridge: Extension updated. Please refresh the page to sync.', 'error');
            } else {
              showToast(`AlgoBridge Error: ${chrome.runtime.lastError.message}`, 'error');
            }
            return;
          }

          if (response && response.success) {
            lastSyncedKey = syncKey;
            const folderUrl = response.data?.folderUrl;
            showToast('AlgoBridge: Synced to GitHub! 🎉', 'success', folderUrl);
          } else {
            const errorMsg = (response && response.error) ? response.error : 'Sync failed';
            console.error('[AlgoBridge] Sync response error:', errorMsg);
            if (errorMsg.includes('Extension context invalidated')) {
              showToast('AlgoBridge: Extension updated. Please refresh the page.', 'error');
            } else {
              showToast(`AlgoBridge Error: ${errorMsg}`, 'error');
            }
          }
        }
      );
    } catch (err) {
      console.error('[AlgoBridge] Sync error:', err);
      showToast(`AlgoBridge Error: ${err.message}`, 'error');
    } finally {
      isSubmitting = false;
    }
  }

  // ==========================================
  // Submission Event Listeners & Observers
  // ==========================================

  function checkForAcceptedStatus() {
    // Check elements for "Accepted" keyword
    const acceptedElements = document.querySelectorAll(
      '[data-e2e-locator="submission-result"], span[class*="text-green"], div[class*="text-green"]'
    );

    for (const el of acceptedElements) {
      if (el.textContent && el.textContent.trim().toLowerCase().includes('accepted')) {
        return true;
      }
    }

    return false;
  }

  // Watch for DOM mutations indicating submission result
  const observer = new MutationObserver(() => {
    if (!isSubmitting) return;

    if (checkForAcceptedStatus()) {
      isSubmitting = false;
      console.log('[AlgoBridge] Detected Accepted submission!');
      setTimeout(triggerSync, 3000); // Increased delay to 3s to allow DOM to stabilize
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Intercept clicks on the Submit button or Ctrl+Enter keypress
  document.addEventListener('click', event => {
    const target = event.target;
    if (!target) return;

    const button = target.closest('button');
    if (!button) return;

    const btnText = (button.textContent || '').trim().toLowerCase();
    const isSubmitBtn =
      btnText.includes('submit') || // Check for "Submit" or "Submit Solution"
      button.getAttribute('data-e2e-locator') === 'console-submit-button' ||
      (button.querySelector('span') && button.querySelector('span').textContent.toLowerCase().includes('submit')); // Check span text within button

    if (isSubmitBtn) {
      console.log('[AlgoBridge] Submit button clicked. Listening for result...');
      isSubmitting = true;

      // Timeout safety: reset isSubmitting if no result after 60 seconds
      setTimeout(() => {
        if (isSubmitting) {
          isSubmitting = false;
        }
      }, 60000);
    }
  }, true);

  document.addEventListener('keydown', event => {
    // Check for Ctrl+Enter (or Cmd+Enter on Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      // Check if the focus is within a code editor or a relevant submission area
      const activeElement = document.activeElement;
      // Common selectors for LeetCode code editor and submission button area
      const isEditorFocused = activeElement.closest('.monaco-editor') ||
                              activeElement.closest('[data-cy="question-content"]') ||
                              activeElement.closest('[data-e2e-locator="console-submit-button"]');

      if (isEditorFocused && !isSubmitting) {
        console.log('[AlgoBridge] Ctrl+Enter detected. Simulating submit click...');
        isSubmitting = true;
        // Trigger the sync workflow directly, as we can't reliably "click" the hidden submit button
        // and we already have the problem data from GraphQL/DOM
        setTimeout(triggerSync, 100); // Small delay to allow LeetCode's own submission logic to initiate
      }
    }
  }, true);

  // Initial toast notification (briefly flashes to show extension is active)
  setTimeout(async () => {
    const enabled = await isAutoSyncEnabled();
    if (!enabled) {
      showToast('AlgoBridge is active (Sync is Paused).', 'info', null, true);
    } else {
      showToast('AlgoBridge is active and watching for submissions.', 'info', null, true);
    }
  }, 1500);
})();
