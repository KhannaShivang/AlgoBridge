/**
 * AlgoBridge - LeetCode GraphQL & Problem Data Parser
 * Retrieves problem metadata, difficulty, tags, and problem statement from LeetCode.
 */

class LeetCodeParser {
  /**
   * Extracts problem slug from a LeetCode problem URL
   * @param {string} url
   * @returns {string|null}
   */
  static extractSlug(url = window.location.href) {
    try {
      const parsedUrl = new URL(url);
      const match = parsedUrl.pathname.match(/\/problems\/([^/]+)/);
      return match ? match[1] : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Pads problem ID with leading zeros (e.g. "1" -> "0001", "42" -> "0042")
   * for consistent, neat alphanumeric sorting on GitHub.
   * @param {string|number} id
   * @returns {string}
   */
  static padId(id) {
    const num = parseInt(id, 10);
    if (!isNaN(num)) {
      return String(num).padStart(4, '0');
    }
    return String(id || '0000');
  }

  /**
   * Generates standard folder name for GitHub repo: e.g. "0001 Two Sum"
   * @param {string|number} frontendId
   * @param {string} title
   * @returns {string}
   */
  static getFolderName(frontendId, title) {
    const padded = LeetCodeParser.padId(frontendId);

    // Replace non-alphanumeric characters (except spaces) with nothing, then trim and replace multiple spaces with single space
    const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

    // Convert to Title Case
    const titleCase = cleanTitle.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');

    return `${padded} ${titleCase}`;
  }

  /**
   * Fetches problem metadata directly from LeetCode's public GraphQL API
   * @param {string} titleSlug
   * @returns {Promise<Object>}
   */
  static async fetchQuestionDetails(titleSlug) {
    const query = `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          questionFrontendId
          title
          titleSlug
          difficulty
          content
          topicTags {
            name
            slug
          }
        }
      }
    `;

    try {
      const response = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables: { titleSlug }
        })
      });

      if (!response.ok) {
        throw new Error(`LeetCode GraphQL error: HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.data && json.data.question) {
        return json.data.question;
      }
      throw new Error('Problem data not found in LeetCode response');
    } catch (err) {
      console.warn('[AlgoBridge] GraphQL fetch failed, falling back to DOM parsing:', err);
      return null;
    }
  }

  /**
   * Fallback: Scrapes problem title and difficulty from the active DOM
   */
  static parseFromDom() {
    const titleEl = document.querySelector('div[class*="text-title-large"], div[data-cy="question-title"], a[href^="/problems/"]');
    const difficultyEl = document.querySelector('div[class*="text-difficulty-"], div[class*="text-olive"], div[class*="text-yellow"], div[class*="text-pink"]');

    let title = titleEl ? titleEl.textContent.trim() : '';
    let questionId = '';
    const match = title.match(/^(\d+)\.\s*(.*)$/);
    if (match) {
      questionId = match[1];
      title = match[2];
    }

    const difficulty = difficultyEl ? difficultyEl.textContent.trim() : 'Medium';
    const slug = LeetCodeParser.extractSlug();

    return {
      questionFrontendId: questionId,
      title: title || slug,
      titleSlug: slug,
      difficulty,
      content: ''
    };
  }

  /**
   * Extracts the code from the Monaco editor or submission details on the LeetCode page.
   * Improved to handle virtualization, jumbled lines, and large code blocks.
   */
  static extractEditorCode() {
    console.log('[AlgoBridge] Attempting to extract code...');

    // 1. Try to find the code in a single 'pre' or 'code' block (Submission Detail page)
    // We look for common classes used by LeetCode for the final code display.
    const selectors = [
      'pre code',
      'code[class*="language-"]',
      '.submission-result-pre',
      'div.container__297p pre',
      'div.CodeMirror-code', // More direct for CodeMirror display
      'div[data-e2e-locator="submission-code"] pre', // Specific for submission code
      '#submission-app div.solution-editor code' // Another common pattern
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const code = el.textContent;
        // Heuristic: valid code should be somewhat long and not just whitespace
        if (code && code.trim().length > 50) {
          console.log(`[AlgoBridge] Extracted code from selector: ${selector}, length: ${code.length}`);
          return code;
        }
      }
    }

    // 2. Try the Monaco Editor's textarea (Editor page)
    // There might be multiple Monaco editors; we want the one that is likely the main code editor.
    const monacoTextareas = document.querySelectorAll('.monaco-editor textarea');
    for (const textarea of monacoTextareas) {
      if (textarea.value && textarea.value.trim().length > 0) {
        const val = textarea.value;
        // Check if it looks like code (contains common keywords or structure)
        if (val.includes('class') || val.includes('def ') || val.includes('function') || val.includes('#include')) {
          console.log(`[AlgoBridge] Extracted code from Monaco textarea, length: ${val.length}`);
          return val;
        }
      }
    }

    // 3. Robust Fallback: If code is split into lines (Monaco virtualization issue)
    // We look for 'view-line' elements and sort them by their CSS 'top' position.
    const lines = document.querySelectorAll('.view-line');
    if (lines.length > 0) {
      console.log(`[AlgoBridge] Detected ${lines.length} individual view-lines. Attempting to reconstruct...`);
      const sortedLines = Array.from(lines)
        .sort((a, b) => {
          const topA = parseInt(a.style.top || 0, 10);
          const topB = parseInt(b.style.top || 0, 10);
          return topA - topB;
        })
        .map(line => line.textContent);

      const reconstructedCode = sortedLines.join('\n');
      if (reconstructedCode.trim().length > 0) {
        console.log(`[AlgoBridge] Reconstructed code from ${lines.length} lines, length: ${reconstructedCode.length}`);
        return reconstructedCode;
      }
    }

    // 4. Final attempt: Just get anything from a code-looking element if previous specific attempts failed
    const codeEl = document.querySelector('.CodeMirror-code') || document.querySelector('.cm-content');
    if (codeEl && codeEl.textContent && codeEl.textContent.trim().length > 0) {
      console.log(`[AlgoBridge] Extracted code from final fallback selector (length: ${codeEl.textContent.length})`);
      return codeEl.textContent;
    }

    console.warn('[AlgoBridge] Failed to extract code using all methods.');
    return '';
  }

  /**
   * Detects the currently selected programming language on LeetCode
   */
  static detectLanguage() {
    // 1. Try to find the language from the editor's language selector button (most reliable)
    const editorLangBtn = document.querySelector('#editor button[aria-haspopup="dialog"], #editor button[id*="headlessui-listbox-button"]');
    if (editorLangBtn) {
      // The button text often contains the language name directly
      const text = editorLangBtn.textContent.trim();
      if (text && !text.toLowerCase().includes('auto')) {
        return text.toLowerCase();
      }
    }

    // 2. Try specific language selection data attributes
    const langElements = document.querySelectorAll('[data-cy="lang-select"], div[class*="language-select"], button[id*="headlessui-listbox-button"]');
    for (const el of langElements) {
      const text = el.textContent.trim();
      if (text && text.length > 0 && !text.toLowerCase().includes('auto')) {
        return text.toLowerCase();
      }
    }

    // 3. Try to find from submission result/history if available
    const langBadge = document.querySelector('[data-e2e-locator="submission-lang"], .bg-fill-primary, .text-label-2');
    if (langBadge && langBadge.textContent) {
      const text = langBadge.textContent.trim();
      // Heuristic: check if it matches a known language name
      const knownLangs = ['cpp', 'java', 'python', 'python3', 'javascript', 'typescript', 'c', 'csharp', 'golang', 'rust', 'ruby', 'swift', 'kotlin', 'php', 'scala', 'dart'];
      if (knownLangs.includes(text.toLowerCase())) {
        return text.toLowerCase();
      }
    }

    return null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LeetCodeParser;
}
