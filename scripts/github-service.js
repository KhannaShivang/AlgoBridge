/**
 * AlgoBridge - GitHub REST API Service
 * Handles GitHub authentication, repository creation, folder management, and file commits.
 */

class GitHubService {
  constructor(token) {
    this.token = token ? token.trim() : '';
    this.baseUrl = 'https://api.github.com';
  }

  /**
   * Helper to perform authenticated GitHub API requests
   */
  async request(endpoint, options = {}) {
    if (!this.token) {
      throw new Error('GitHub Personal Access Token is missing. Please configure it in the AlgoBridge extension popup.');
    }

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    };

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return { status: 204, ok: true, data: null };
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      const errorMsg = (data && data.message) ? data.message : `HTTP ${response.status} ${response.statusText}`;
      const error = new Error(`GitHub API Error: ${errorMsg}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return { status: response.status, ok: true, data };
  }

  /**
   * Encodes a string into Base64 supporting full UTF-8 / Unicode characters
   */
  static encodeBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Verifies the personal access token and retrieves user info
   */
  async getAuthenticatedUser() {
    const res = await this.request('/user');
    return {
      login: res.data.login,
      name: res.data.name || res.data.login,
      avatarUrl: res.data.avatar_url,
      htmlUrl: res.data.html_url
    };
  }

  /**
   * Checks if a repository exists under the authenticated user's account
   * @param {string} owner
   * @param {string} repo
   */
  async repoExists(owner, repo) {
    try {
      const res = await this.request(`/repos/${owner}/${repo}`);
      return { exists: true, repo: res.data };
    } catch (err) {
      if (err.status === 404) {
        return { exists: false, repo: null };
      }
      throw err;
    }
  }

  /**
   * Creates a new repository for the user
   * @param {string} repoName
   * @param {boolean} isPrivate
   */
  async createRepo(repoName, isPrivate = false) {
    const payload = {
      name: repoName,
      description: 'DSA Solutions - Automatically synced from LeetCode by AlgoBridge',
      private: Boolean(isPrivate),
      auto_init: true // Creates initial commit so default branch exists
    };

    const res = await this.request('/user/repos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    // Wait 1.5 seconds for GitHub to finish initialization of the git tree
    await new Promise(resolve => setTimeout(resolve, 1500));
    return res.data;
  }

  /**
   * Ensures the repository exists: checks for it, and creates it if missing
   * @param {string} owner
   * @param {string} repoName
   * @param {boolean} isPrivate
   */
  async ensureRepo(owner, repoName, isPrivate = false) {
    const check = await this.repoExists(owner, repoName);
    if (check.exists) {
      return check.repo;
    }
    return await this.createRepo(repoName, isPrivate);
  }

  /**
   * Retrieves the current SHA of a file in the repository (if it exists)
   * @param {string} owner
   * @param {string} repo
   * @param {string} filePath
   */
  async getFileSha(owner, repo, filePath) {
    try {
      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
      const res = await this.request(`/repos/${owner}/${repo}/contents/${encodedPath}`);
      return res.data ? res.data.sha : null;
    } catch (err) {
      if (err.status === 404) {
        return null; // File does not exist yet
      }
      throw err;
    }
  }

  /**
   * Creates or updates a file in the repository
   * @param {Object} params
   * @param {string} params.owner
   * @param {string} params.repo
   * @param {string} params.path
   * @param {string} params.content Plain text content
   * @param {string} params.message Git commit message
   */
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
        else delete payload.sha;

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

  /**
   * High-level method: Commits both the solution code and README.md
   * into the repository at `leetcode/{folderName}/`
   *
   * @param {Object} options
   * @param {string} options.repoName
   * @param {boolean} options.isPrivate
   * @param {string} options.folderName e.g. "0001-two-sum"
   * @param {string} options.codeFileName e.g. "two-sum.py"
   * @param {string} options.codeContent Code including metadata comment header
   * @param {string} options.readmeContent Formatted problem statement Markdown
   * @param {string} options.commitMessage Git commit message
   */
  async syncSolution({
    repoName = 'dsa-solutions',
    isPrivate = false,
    folderName,
    codeFileName,
    codeContent,
    readmeContent,
    commitMessage
  }) {
    // 1. Get authenticated user
    const user = await this.getAuthenticatedUser();
    const owner = user.login;

    // 2. Ensure repository exists (create if not found)
    await this.ensureRepo(owner, repoName, isPrivate);

    // 3. Define folder paths
    // Git automatically creates intermediate directories: 'leetcode/{folderName}/'
    const codePath = `leetcode/${folderName}/${codeFileName}`;
    const readmePath = `leetcode/${folderName}/README.md`;

    // 4. Commit README.md
    const readmeResult = await this.createOrUpdateFile({
      owner,
      repo: repoName,
      path: readmePath,
      content: readmeContent,
      message: `${commitMessage} (README)`
    });

    // 5. Commit Solution Code File
    const codeResult = await this.createOrUpdateFile({
      owner,
      repo: repoName,
      path: codePath,
      content: codeContent,
      message: `${commitMessage} (Solution)`
    });

    const folderUrl = `https://github.com/${owner}/${repoName}/tree/main/leetcode/${folderName}`;

    return {
      owner,
      repo: repoName,
      folderName,
      folderUrl,
      readmeResult,
      codeResult
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitHubService;
}
