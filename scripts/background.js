/**
 * AlgoBridge - Combined Background Service Worker (Manifest V3)
 * Orchestrates GitHub API interactions, settings management, sync history, and notifications.
 */

// ==========================================
// 1. Utils/languages.js
// ==========================================
const LANGUAGE_MAP = {
  sql: { ext: 'sql', name: 'SQL', commentType: 'dash', prismLanguage: 'sql' },
  mysql: { ext: 'sql', name: 'MySQL', commentType: 'dash', prismLanguage: 'sql' },
  mssql: { ext: 'sql', name: 'MS SQL Server', commentType: 'dash', prismLanguage: 'sql' },
  oraclesql: { ext: 'sql', name: 'Oracle SQL', commentType: 'dash', prismLanguage: 'sql' },
  postgresql: { ext: 'sql', name: 'PostgreSQL', commentType: 'dash', prismLanguage: 'sql' },
  'c++': { ext: 'cpp', name: 'C++', commentType: 'slash', prismLanguage: 'cpp' },
  cpp: { ext: 'cpp', name: 'C++', commentType: 'slash', prismLanguage: 'cpp' },
  java: { ext: 'java', name: 'Java', commentType: 'slash', prismLanguage: 'java' },
  python: { ext: 'py', name: 'Python', commentType: 'hash', prismLanguage: 'python' },
  python3: { ext: 'py', name: 'Python 3', commentType: 'hash', prismLanguage: 'python' },
  c: { ext: 'c', name: 'C', commentType: 'slash', prismLanguage: 'c' },
  csharp: { ext: 'cs', name: 'C#', commentType: 'slash', prismLanguage: 'csharp' },
  javascript: { ext: 'js', name: 'JavaScript', commentType: 'slash', prismLanguage: 'javascript' },
  typescript: { ext: 'ts', name: 'TypeScript', commentType: 'slash', prismLanguage: 'typescript' },
  golang: { ext: 'go', name: 'Go', commentType: 'slash', prismLanguage: 'go' },
  go: { ext: 'go', name: 'Go', commentType: 'slash', prismLanguage: 'go' },
  ruby: { ext: 'rb', name: 'Ruby', commentType: 'hash', prismLanguage: 'ruby' },
  swift: { ext: 'swift', name: 'Swift', commentType: 'slash', prismLanguage: 'swift' },
  kotlin: { ext: 'kt', name: 'Kotlin', commentType: 'slash', prismLanguage: 'kotlin' },
  rust: { ext: 'rs', name: 'Rust', commentType: 'slash', prismLanguage: 'rust' },
  php: { ext: 'php', name: 'PHP', commentType: 'slash', prismLanguage: 'php' },
  scala: { ext: 'scala', name: 'Scala', commentType: 'slash', prismLanguage: 'scala' },
  dart: { ext: 'dart', name: 'Dart', commentType: 'slash', prismLanguage: 'dart' },
  racket: { ext: 'rkt', name: 'Racket', commentType: 'semicolon', prismLanguage: 'racket' },
  erlang: { ext: 'erl', name: 'Erlang', commentType: 'percent', prismLanguage: 'erlang' },
  elixir: { ext: 'ex', name: 'Elixir', commentType: 'hash', prismLanguage: 'elixir' },
  pandas: { ext: 'py', name: 'Python (Pandas)', commentType: 'hash', prismLanguage: 'python' }
};

function normalizeLanguage(lang) {
  if (!lang) return 'python3';
  return lang.toString().toLowerCase().trim().replace(/\s+/g, '');
}

function getLanguageInfo(lang) {
  const normalized = normalizeLanguage(lang);
  if (!lang || !LANGUAGE_MAP[normalized]) {
    return { ext: 'txt', name: 'Unknown', commentType: 'slash', prismLanguage: 'text', isUnknown: true };
  }
  return LANGUAGE_MAP[normalized];
}

function formatSolutionHeader(metadata) {
  const { title = '', questionId = '', difficulty = '', language = '', runtime = 'N/A', runtimePercentile = '', memory = 'N/A', memoryPercentile = '', url = '' } = metadata;
  const info = getLanguageInfo(language);
  const runtimeStr = runtimePercentile ? `${runtime} (Beats ${runtimePercentile})` : runtime;
  const memoryStr = memoryPercentile ? `${memory} (Beats ${memoryPercentile})` : memory;
  const problemTitle = questionId ? `${questionId}. ${title}` : title;

  const lines = [`Problem: ${problemTitle}`, `Difficulty: ${difficulty}`];
  if (!info.isUnknown) {
    lines.push(`Language: ${info.name}`);
  }
  lines.push(`Runtime: ${runtimeStr}`, `Memory: ${memoryStr}`, `LeetCode: ${url}`);

  switch (info.commentType) {
    case 'hash': return lines.map(line => `# ${line}`).join('\n') + '\n\n';
    case 'semicolon': return lines.map(line => `;; ${line}`).join('\n') + '\n\n';
    case 'percent': return lines.map(line => `%% ${line}`).join('\n') + '\n\n';
    case 'dash': return lines.map(line => `-- ${line}`).join('\n') + '\n\n';
    case 'slash': default: return '/**\n' + lines.map(line => ` * ${line}`).join('\n') + '\n */\n\n';
  }
}

// ==========================================
// 2. Utils/html-to-markdown.js
// ==========================================
function decodeHtmlEntities(text) {
  if (!text) return '';
  const entities = { '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&#x27;': "'", '&#x2F;': '/', '&#32;': ' ', '&le;': '≤', '&ge;': '≥', '&ne;': '≠', '&times;': '×', '&plusmn;': '±', '&infin;': '∞' };
  return text.replace(/&[a-zA-Z0-9#x]+;/g, match => entities[match] || match);
}

function htmlToMarkdown(html) {
  if (!html) return '';
  let md = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  md = md.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (m, c) => `\n\n\`\`\`\n${decodeHtmlEntities(c).trim()}\n\`\`\`\n\n`);
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (m, c) => `\n\n\`\`\`\n${decodeHtmlEntities(c.replace(/<[^>]+>/g, '')).trim()}\n\`\`\`\n\n`);
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (m, c) => `\`${decodeHtmlEntities(c).trim()}\``);
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n').replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n').replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n').replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n').replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n\n##### $1\n\n').replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n\n###### $1\n\n');
  md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**').replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*').replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, '^$1').replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, '_$1');
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (m, c) => c.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, i) => `\n- ${i.trim().replace(/\n+/g, ' ')}`)).replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (m, c) => { let idx=1; return c.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, i) => `\n${idx++}. ${i.trim().replace(/\n+/g, ' ')}`); });
  md = md.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)').replace(/<img\s+[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)').replace(/<img\s+[^>]*src=["']([^"']*)["'][^>]*>/gi, '![]($1)');
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<hr\s*\/?>/gi, '\n\n---\n\n').replace(/<[^>]+>/g, '');
  return decodeHtmlEntities(md).replace(/\n{3,}/g, '\n\n').trim();
}

function buildProblemReadme(problem) {
  const { questionId = '', title = '', titleSlug = '', difficulty = 'Medium', descriptionMarkdown = '', topicTags = [], url = `https://leetcode.com/problems/${titleSlug}/`, runtime = '', runtimePercentile = '', memory = '', memoryPercentile = '', language = '' } = problem;
  const badgeColor = difficulty.toLowerCase() === 'easy' ? 'brightgreen' : (difficulty.toLowerCase() === 'medium' ? 'orange' : 'red');
  const difficultyBadge = `![Difficulty: ${difficulty}](https://img.shields.io/badge/Difficulty-${difficulty}-${badgeColor})`;
  const problemTitle = questionId ? `${questionId}. ${title}` : title;
  const tagsMarkdown = (topicTags && topicTags.length > 0) ? topicTags.map(tag => `\`${tag.name || tag}\``).join(' ') : '';
  const statsSection = (runtime || memory) ? `\n### Submission Stats\n\n| Metric | Result | Percentile |\n| :--- | :--- | :--- |\n| **Language** | \`${language || 'N/A'}\` | - |\n| **Runtime** | \`${runtime || 'N/A'}\` | ${runtimePercentile ? `Beats **${runtimePercentile}**` : '-'} |\n| **Memory** | \`${memory || 'N/A'}\` | ${memoryPercentile ? `Beats **${memoryPercentile}**` : '-'} |` : '';
  return `# [${problemTitle}](${url})\n\n${difficultyBadge}\n\n${tagsMarkdown ? `**Topics:** ${tagsMarkdown}\n` : ''}\n---\n\n## Problem Statement\n\n${descriptionMarkdown}\n${statsSection}\n\n---\n\n### Solution Explanation\n\n<!-- LLM_EXPLANATION_START -->\n> *Automated AI explanation will be generated here in future updates.*\n<!-- LLM_EXPLANATION_END -->\n`;
}

// ==========================================
// 3. Utils/llm-placeholder.js
// ==========================================
async function isLlmEnabled() {
  return new Promise(resolve => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['llmEnabled', 'llmApiKey'], result => { resolve(Boolean(result.llmEnabled && result.llmApiKey)); });
    } else { resolve(false); }
  });
}
function getDefaultExplanationTemplate(metadata = {}) {
  const { runtime = '', memory = '' } = metadata;
  return `\n### Approach & Intuition\n*(Intuition notes can be written here)*\n\n### Complexity Analysis\n- **Time Complexity:** Derived from algorithm logic and constraints. ${runtime ? `(Runtime: ${runtime})` : ''}\n- **Space Complexity:** Auxiliary memory utilized by the solution. ${memory ? `(Memory: ${memory})` : ''}\n`;
}
async function generateExplanation(params) {
  const enabled = await isLlmEnabled();
  return enabled ? getDefaultExplanationTemplate(params.stats) : getDefaultExplanationTemplate(params.stats);
}

// ==========================================
// 4. Scripts/github-service.js
// ==========================================
class GitHubService {
  constructor(token) { this.token = token ? token.trim() : ''; this.baseUrl = 'https://api.github.com'; }
  async request(endpoint, options = {}) {
    if (!this.token) throw new Error('GitHub Personal Access Token is missing.');
    const headers = { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28', ...(options.headers || {}) };
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, { ...options, headers });
    if (response.status === 204) return { status: 204, ok: true, data: null };
    let data; try { data = await response.json(); } catch (e) { data = null; }
    if (!response.ok) {
      const errorMsg = (data && data.message) ? data.message : `HTTP ${response.status} ${response.statusText}`;
      const error = new Error(`GitHub API Error: ${errorMsg}`); error.status = response.status; error.data = data; throw error;
    }
    return { status: response.status, ok: true, data };
  }
  static encodeBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  async getAuthenticatedUser() {
    const res = await this.request('/user');
    return { login: res.data.login, name: res.data.name || res.data.login, avatarUrl: res.data.avatar_url, htmlUrl: res.data.html_url };
  }
  async repoExists(owner, repo) {
    try { const res = await this.request(`/repos/${owner}/${repo}`); return { exists: true, repo: res.data }; }
    catch (err) { if (err.status === 404) return { exists: false, repo: null }; throw err; }
  }
  async createRepo(repoName, isPrivate = false) {
    const payload = { name: repoName, description: 'DSA Solutions - Automatically synced from LeetCode by AlgoBridge', private: Boolean(isPrivate), auto_init: true };
    const res = await this.request('/user/repos', { method: 'POST', body: JSON.stringify(payload) });
    await new Promise(resolve => setTimeout(resolve, 1500));
    return res.data;
  }
  async ensureRepo(owner, repoName, isPrivate = false) {
    const check = await this.repoExists(owner, repoName);
    if (check.exists) return check.repo;
    return await this.createRepo(repoName, isPrivate);
  }
  async getFileSha(owner, repo, filePath) {
    try {
      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
      const res = await this.request(`/repos/${owner}/${repo}/contents/${encodedPath}`);

      // If the response is a file (not an array), return its sha.
      if (res.data && !Array.isArray(res.data) && res.data.sha) {
        return res.data.sha;
      }
      return null;
    }
    catch (err) {
      if (err.status === 404) return null;
      console.error(`[AlgoBridge] Error getting file SHA for ${filePath}:`, err);
      throw err;
    }
  }
  async createOrUpdateFile({ owner, repo, path, content, message }) {
    let sha = await this.getFileSha(owner, repo, path);
    const base64Content = GitHubService.encodeBase64(content);

    const payload = {
      message,
      content: base64Content
    };

    if (sha) {
      payload.sha = sha; // Required by GitHub API when updating an existing file
    }

    const encodedPath = path.split('/').map(encodeURIComponent).join('/');

    try {
      const res = await this.request(`/repos/${owner}/${repo}/contents/${encodedPath}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      return {
        path,
        sha: res.data.content ? res.data.content.sha : null,
        commitSha: res.data.commit ? res.data.commit.sha : null,
        htmlUrl: res.data.content ? res.data.content.html_url : null,
        updated: Boolean(sha)
      };
    } catch (err) {
      // If a conflict (409) occurs, re-fetch SHA and retry once
      if (err.status === 409) {
        sha = await this.getFileSha(owner, repo, path);
        if (sha) payload.sha = sha;
        else delete payload.sha; // If file was deleted concurrently, create it anew

        const res = await this.request(`/repos/${owner}/${repo}/contents/${encodedPath}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        return {
          path,
          sha: res.data.content ? res.data.content.sha : null,
          commitSha: res.data.commit ? res.data.commit.sha : null,
          htmlUrl: res.data.content ? res.data.content.html_url : null,
          updated: Boolean(sha)
        };
      }
      throw err; // Re-throw if not a 409 or if the retry also fails
    }
  }
  async syncSolution({ repoName = 'dsa-solutions', isPrivate = false, folderName, codeFileName, codeContent, readmeContent, commitMessage }) {
    const user = await this.getAuthenticatedUser(); const owner = user.login;
    await this.ensureRepo(owner, repoName, isPrivate);
    const codePath = `leetcode/${folderName}/${codeFileName}`;
    const readmePath = `leetcode/${folderName}/README.md`;
    const readmeResult = await this.createOrUpdateFile({ owner, repo: repoName, path: readmePath, content: readmeContent, message: `${commitMessage} (README)` });
    const codeResult = await this.createOrUpdateFile({ owner, repo: repoName, path: codePath, content: codeContent, message: `${commitMessage} (Solution)` });
    return { owner, repo: repoName, folderName, folderUrl: `https://github.com/${owner}/${repoName}/tree/main/leetcode/${folderName}`, readmeResult, codeResult };
  }
}

// ==========================================
// 5. Scripts/background.js Logic
// ==========================================
const DEFAULT_SETTINGS = { githubToken: '', repoName: 'dsa-solutions', isPrivate: false, autoSync: true, enableNotifications: true };
async function getSettings() { return new Promise(resolve => { chrome.storage.sync.get(DEFAULT_SETTINGS, items => { resolve(items || DEFAULT_SETTINGS); }); }); }
async function recordSyncHistory(entry) {
  return new Promise(resolve => {
    chrome.storage.local.get({ syncHistory: [] }, result => {
      const history = result.syncHistory || [];
      history.unshift({ ...entry, timestamp: new Date().toISOString() });
      if (history.length > 30) history.length = 30;
      chrome.storage.local.set({ syncHistory: history }, resolve);
    });
  });
}
function showNotification(title, message, iconUrl = '../icons/icon48.png') { if (chrome.notifications) chrome.notifications.create({ type: 'basic', iconUrl, title: `AlgoBridge: ${title}`, message: message, priority: 2 }); }
function updateSyncBadge(isEnabled) {
  if (chrome.action) {
    if (!isEnabled) {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#6e7681' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
}

function updateBadge(text, color = '#238636') {
  if (chrome.action) {
    chrome.action.setBadgeText({ text }); chrome.action.setBadgeBackgroundColor({ color });
    setTimeout(() => {
      getSettings().then(settings => {
        updateSyncBadge(settings.autoSync !== false);
      });
    }, 5000);
  }
}

// Global variable to store intercepted code keyed by titleSlug
const interceptedCodeMap = new Map();

// Listen for submission requests to capture typed_code
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.method === "POST" && details.requestBody && details.requestBody.raw) {
      try {
        const decoder = new TextDecoder("utf-8");
        const requestBody = JSON.parse(decoder.decode(details.requestBody.raw[0].bytes));

        if (requestBody.typed_code && requestBody.question_id) {
          // Extract titleSlug from the URL
          const url = new URL(details.url);
          const match = url.pathname.match(/\/problems\/([^/]+)\/submit\//);
          if (match && match[1]) {
            const titleSlug = match[1];
            interceptedCodeMap.set(titleSlug, requestBody.typed_code);
            console.log(`[AlgoBridge Background] Intercepted code for ${titleSlug}`);
          }
        }
      } catch (e) {
        console.error("[AlgoBridge Background] Error parsing submission request body:", e);
      }
    }
  },
  {
    urls: ["https://leetcode.com/problems/*/submit/"],
    types: ["xmlhttprequest"] // submissions are usually XHR
  },
  ["requestBody"] // needed to access requestBody
);
async function handleSubmissionSync(payload) {
  const settings = await getSettings();

  if (settings.autoSync === false) {
    console.log('[AlgoBridge] Auto-sync is disabled. Skipping GitHub sync.');
    if (settings.enableNotifications) {
      showNotification('Sync Paused', `Auto-sync is currently paused. Solution for "${payload.title}" was not pushed.`);
    }
    return { skipped: true, message: 'Auto-sync is disabled.' };
  }

  if (!settings.githubToken) throw new Error('GitHub token not found.');
  const langInfo = getLanguageInfo(payload.language);
  const codeFileName = `${payload.titleSlug}.${langInfo.ext}`;
  const capturedCode = interceptedCodeMap.get(payload.titleSlug);
  if (capturedCode) {
    console.log(`[AlgoBridge Background] Using intercepted code for ${payload.titleSlug}`);
    interceptedCodeMap.delete(payload.titleSlug); // Clear after use
  }
  const finalCodeContent = `${formatSolutionHeader({ title: payload.title, questionId: payload.questionId, difficulty: payload.difficulty, language: langInfo.name, runtime: payload.runtime, runtimePercentile: payload.runtimePercentile, memory: payload.memory, memoryPercentile: payload.memoryPercentile, url: `https://leetcode.com/problems/${payload.titleSlug}/` })}${((capturedCode || payload.code) || '').trim()}\n`;
  const readmeContent = buildProblemReadme({ questionId: payload.questionId, title: payload.title, titleSlug: payload.titleSlug, difficulty: payload.difficulty, descriptionMarkdown: htmlToMarkdown(payload.descriptionHtml), topicTags: payload.topicTags, runtime: payload.runtime, runtimePercentile: payload.runtimePercentile, memory: payload.memory, memoryPercentile: payload.memoryPercentile, language: langInfo.name });
  const ghService = new GitHubService(settings.githubToken);
  const syncResult = await ghService.syncSolution({ repoName: settings.repoName, isPrivate: Boolean(settings.isPrivate), folderName: payload.folderName, codeFileName, codeContent: finalCodeContent, readmeContent, commitMessage: `feat(leetcode): solve ${payload.questionId}. ${payload.title} [${payload.difficulty}]` });
  await recordSyncHistory({ questionId: payload.questionId, title: payload.title, difficulty: payload.difficulty, folderName: payload.folderName, folderUrl: syncResult.folderUrl, success: true });
  updateBadge('✓', '#238636');
  if (settings.enableNotifications) showNotification('Solution Synced! 🎉', `Successfully synced "${payload.title}" to GitHub`);
  return syncResult;
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action, payload } = request;
  if (action === 'SYNC_SUBMISSION') {
    handleSubmissionSync(payload).then(result => sendResponse({ success: true, data: result })).catch(err => { console.error('[AlgoBridge] Sync error:', err); updateBadge('ERR', '#cf222e'); sendResponse({ success: false, error: err.message }); });
    return true;
  }
  if (action === 'VERIFY_TOKEN') { const service = new GitHubService(request.payload.token); service.getAuthenticatedUser().then(user => sendResponse({ success: true, user })).catch(err => sendResponse({ success: false, error: err.message })); return true; }
  if (action === 'GET_SETTINGS') { getSettings().then(settings => sendResponse({ success: true, settings })); return true; }
  return true;
});

// Update badge when autoSync setting changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.autoSync !== undefined) {
    updateSyncBadge(changes.autoSync.newValue !== false);
  }
});

// Initialize badge state on extension worker start
getSettings().then(settings => {
  updateSyncBadge(settings.autoSync !== false);
}).catch(() => {});
