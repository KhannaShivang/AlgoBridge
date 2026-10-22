/**
 * AlgoBridge - HTML to Markdown Converter
 * Converts LeetCode problem descriptions into clean GitHub-flavored Markdown.
 */

function decodeHtmlEntities(text) {
  if (!text) return '';
  const entities = {
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#32;': ' ',
    '&le;': '≤',
    '&ge;': '≥',
    '&ne;': '≠',
    '&times;': '×',
    '&plusmn;': '±',
    '&infin;': '∞'
  };

  return text.replace(/&[a-zA-Z0-9#x]+;/g, match => entities[match] || match);
}

/**
 * Converts LeetCode HTML description string into formatted Markdown
 * @param {string} html Raw HTML from LeetCode GraphQL / DOM
 * @returns {string} Clean Markdown
 */
function htmlToMarkdown(html) {
  if (!html) return '';

  let md = html;

  // 1. Remove comments and scripts
  md = md.replace(/<!--[\s\S]*?-->/g, '');
  md = md.replace(/<script[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[\s\S]*?<\/style>/gi, '');

  // 2. Normalize line breaks and tabs inside code
  md = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Handle <pre><code> code blocks
  md = md.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (match, code) => {
    const cleanCode = decodeHtmlEntities(code).trim();
    return `\n\n\`\`\`\n${cleanCode}\n\`\`\`\n\n`;
  });

  // Handle standalone <pre> blocks (often used for Examples in LeetCode)
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match, code) => {
    // Strip inner HTML tags inside pre if any (e.g. <strong>Input:</strong>)
    let clean = code.replace(/<[^>]+>/g, '');
    clean = decodeHtmlEntities(clean).trim();
    return `\n\n\`\`\`\n${clean}\n\`\`\`\n\n`;
  });

  // 4. Handle inline <code> tags
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (match, code) => {
    const clean = decodeHtmlEntities(code).trim();
    return `\`${clean}\``;
  });

  // 5. Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n\n##### $1\n\n');
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n\n###### $1\n\n');

  // 6. Emphasis and Bold
  md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');

  // 7. Math / Superscripts / Subscripts (common in constraints: e.g. 10<sup>5</sup>)
  md = md.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, '^$1');
  md = md.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, '_$1');

  // 8. Unordered Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, item) => {
      const cleanItem = item.trim().replace(/\n+/g, ' ');
      return `\n- ${cleanItem}`;
    });
    return `\n${items}\n`;
  });

  // 9. Ordered Lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    let index = 1;
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, item) => {
      const cleanItem = item.trim().replace(/\n+/g, ' ');
      return `\n${index++}. ${cleanItem}`;
    });
    return `\n${items}\n`;
  });

  // 10. Links and Images
  md = md.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<img\s+[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)');
  md = md.replace(/<img\s+[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*>/gi, '![$1]($2)');
  md = md.replace(/<img\s+[^>]*src=["']([^"']*)["'][^>]*>/gi, '![]($1)');

  // 11. Paragraphs, breaks, dividers
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  // 12. Strip any remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // 13. Decode all remaining HTML entities
  md = decodeHtmlEntities(md);

  // 14. Clean up multiple blank lines
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

/**
 * Builds the complete README.md content for a problem
 * @param {Object} problem
 * @returns {string} Markdown document
 */
function buildProblemReadme(problem) {
  const {
    questionId = '',
    title = '',
    titleSlug = '',
    difficulty = 'Medium',
    descriptionMarkdown = '',
    topicTags = [],
    url = `https://leetcode.com/problems/${titleSlug}/`,
    runtime = '',
    runtimePercentile = '',
    memory = '',
    memoryPercentile = '',
    language = ''
  } = problem;

  // Difficulty badge color
  let badgeColor = 'yellow';
  const diffUpper = (difficulty || '').toLowerCase();
  if (diffUpper === 'easy') badgeColor = 'brightgreen';
  else if (diffUpper === 'medium') badgeColor = 'orange';
  else if (diffUpper === 'hard') badgeColor = 'red';

  const difficultyBadge = `![Difficulty: ${difficulty}](https://img.shields.io/badge/Difficulty-${difficulty}-${badgeColor})`;
  const problemTitle = questionId ? `${questionId}. ${title}` : title;

  // Format topic tags as badges or list
  const tagsMarkdown = (topicTags && topicTags.length > 0)
    ? topicTags.map(tag => `\`${tag.name || tag}\``).join(' ')
    : '';

  // Stats table
  let statsSection = '';
  if (runtime || memory) {
    statsSection = `
### Submission Stats

| Metric | Result | Percentile |
| :--- | :--- | :--- |
| **Language** | \`${language || 'N/A'}\` | - |
| **Runtime** | \`${runtime || 'N/A'}\` | ${runtimePercentile ? `Beats **${runtimePercentile}**` : '-'} |
| **Memory** | \`${memory || 'N/A'}\` | ${memoryPercentile ? `Beats **${memoryPercentile}**` : '-'} |
`;
  }

  // LLM Explanation placeholder block (ready for future extension)
  const explanationSection = `
---

### Solution Explanation

<!-- LLM_EXPLANATION_START -->
> *Automated AI explanation will be generated here in future updates.*
<!-- LLM_EXPLANATION_END -->
`;

  return `# [${problemTitle}](${url})

${difficultyBadge}

${tagsMarkdown ? `**Topics:** ${tagsMarkdown}\n` : ''}
---

## Problem Statement

${descriptionMarkdown}
${statsSection}
${explanationSection}
`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    decodeHtmlEntities,
    htmlToMarkdown,
    buildProblemReadme
  };
}
