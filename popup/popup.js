/**
 * AlgoBridge - Popup UI Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const ghTokenInput = document.getElementById('gh-token');
  const toggleVisibilityBtn = document.getElementById('toggle-token-visibility');
  const connectBtn = document.getElementById('connect-btn');
  const disconnectBtn = document.getElementById('disconnect-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const authCard = document.getElementById('auth-card');
  const loginForm = document.getElementById('login-form');
  const userInfo = document.getElementById('user-info');
  const userAvatar = document.getElementById('user-avatar');
  const userLogin = document.getElementById('user-login');
  const connectionStatus = document.getElementById('connection-status');
  const repoNameInput = document.getElementById('repo-name');
  const isPrivateCheckbox = document.getElementById('is-private');
  const historyList = document.getElementById('history-list');
  const viewRepoLink = document.getElementById('view-repo-link');
  const repoDot = document.getElementById('repo-dot');

  // Sync Control Elements
  const syncToggle = document.getElementById('sync-toggle');
  const syncStatusBadge = document.getElementById('sync-status-badge');
  const syncDescription = document.getElementById('sync-description');

  // Load Settings and History on init
  loadInitialData();

  // Toggle Token Visibility
  toggleVisibilityBtn.addEventListener('click', () => {
    const type = ghTokenInput.type === 'password' ? 'text' : 'password';
    ghTokenInput.type = type;
    toggleVisibilityBtn.textContent = type === 'password' ? '👁️' : '🙈';
  });

  // Sync Control Handlers
  function updateSyncUI(enabled) {
    if (syncToggle) syncToggle.checked = enabled;
    if (syncStatusBadge) {
      syncStatusBadge.textContent = enabled ? 'Active' : 'Paused';
      syncStatusBadge.className = `sync-badge ${enabled ? 'enabled' : 'paused'}`;
    }
    if (syncDescription) {
      syncDescription.textContent = enabled
        ? 'Solutions are automatically pushed to GitHub upon acceptance.'
        : 'Sync is paused. Accepted solutions will not be pushed to GitHub.';
    }
  }

  function setSyncEnabled(enabled) {
    chrome.storage.sync.set({ autoSync: enabled }, () => {
      updateSyncUI(enabled);
    });
  }

  if (syncToggle) {
    syncToggle.addEventListener('change', () => {
      setSyncEnabled(syncToggle.checked);
    });
  }

  // Connect Button
  connectBtn.addEventListener('click', async () => {
    const token = ghTokenInput.value.trim();
    if (!token) return alert('Please enter a GitHub Personal Access Token.');

    connectBtn.disabled = true;
    connectBtn.textContent = 'Verifying...';

    chrome.runtime.sendMessage({ action: 'VERIFY_TOKEN', payload: { token } }, response => {
      connectBtn.disabled = false;
      connectBtn.textContent = 'Connect Account';

      if (response && response.success) {
        // Save token and settings
        chrome.storage.sync.set({ githubToken: token }, () => {
          updateAuthUI(response.user);
          alert('Successfully connected!');
        });
      } else {
        alert('Authentication failed: ' + (response?.error || 'Unknown error'));
      }
    });
  });

  // Disconnect Button
  disconnectBtn.addEventListener('click', () => {
    chrome.storage.sync.remove(['githubToken'], () => {
      resetAuthUI();
    });
  });

  // Save Settings
  saveSettingsBtn.addEventListener('click', () => {
    const repoName = repoNameInput.value.trim();
    const isPrivate = isPrivateCheckbox.checked;

    if (!repoName) return alert('Repository name is required.');

    chrome.storage.sync.set({ repoName, isPrivate }, () => {
      alert('Settings saved!');
    });
  });

  // Load Data
  function loadInitialData() {
    // Immediate load of autoSync to prevent UI flicker
    chrome.storage.sync.get({ autoSync: true }, res => {
      updateSyncUI(res.autoSync !== false);
    });

    chrome.runtime.sendMessage({ action: 'GET_SETTINGS' }, response => {
      if (response && response.success) {
        const { settings } = response;
        repoNameInput.value = settings.repoName || 'dsa-solutions';
        isPrivateCheckbox.checked = Boolean(settings.isPrivate);
        updateSyncUI(settings.autoSync !== false);

        if (settings.githubToken) {
          // Verify token is still valid
          chrome.runtime.sendMessage({ action: 'VERIFY_TOKEN', payload: { token: settings.githubToken } }, verifyRes => {
            if (verifyRes && verifyRes.success) {
              ghTokenInput.value = settings.githubToken;
              updateAuthUI(verifyRes.user);
            } else {
              resetAuthUI();
            }
          });
        }
      }
    });

    chrome.storage.local.get(['syncHistory'], result => {
      renderHistory(result.syncHistory || []);
    });
  }

  function updateAuthUI(user) {
    loginForm.classList.add('hidden');
    userInfo.classList.remove('hidden');
    userAvatar.src = user.avatarUrl;
    userLogin.textContent = `@${user.login}`;
    connectionStatus.textContent = 'Connected';
    connectionStatus.className = 'status-badge connected';
    viewRepoLink.href = `${user.htmlUrl}/${repoNameInput.value}`;
    viewRepoLink.classList.remove('hidden');
    repoDot.classList.remove('hidden');
  }

  function resetAuthUI() {
    loginForm.classList.remove('hidden');
    userInfo.classList.add('hidden');
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.className = 'status-badge disconnected';
    viewRepoLink.classList.add('hidden');
    repoDot.classList.add('hidden');
    ghTokenInput.value = '';
  }

  function renderHistory(history) {
    if (history.length === 0) return;

    historyList.innerHTML = '';
    history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div class="history-info">
          <a href="${item.folderUrl}" target="_blank" class="history-title">${item.title}</a>
          <span class="history-meta">${new Date(item.timestamp).toLocaleDateString()} • ${item.difficulty}</span>
        </div>
        <div class="history-status">${item.success ? '✅' : '❌'}</div>
      `;
      historyList.appendChild(div);
    });
  }
});
