/**
 * AlgoBridge - Language Mappings and Comment Formatters
 * Maps LeetCode language identifiers to file extensions, display names, and comment styles.
 */

/**
 * AlgoBridge - Language Mappings and Comment Formatters
 * Maps LeetCode language identifiers to file extensions, display names, and comment styles.
 */

const LANGUAGE_MAP = {
  sql: {
    ext: 'sql',
    name: 'SQL',
    commentType: 'dash',
    prismLanguage: 'sql'
  },
  mysql: {
    ext: 'sql',
    name: 'MySQL',
    commentType: 'dash',
    prismLanguage: 'sql'
  },
  mssql: {
    ext: 'sql',
    name: 'MS SQL Server',
    commentType: 'dash',
    prismLanguage: 'sql'
  },
  oraclesql: {
    ext: 'sql',
    name: 'Oracle SQL',
    commentType: 'dash',
    prismLanguage: 'sql'
  },
  postgresql: {
    ext: 'sql',
    name: 'PostgreSQL',
    commentType: 'dash',
    prismLanguage: 'sql'
  },
  'c++': {
    ext: 'cpp',
    name: 'C++',
    commentType: 'slash',
    prismLanguage: 'cpp'
  },
  cpp: {
    ext: 'cpp',
    name: 'C++',
    commentType: 'slash',
    prismLanguage: 'cpp'
  },
  java: {
    ext: 'java',
    name: 'Java',
    commentType: 'slash',
    prismLanguage: 'java'
  },
  python: {
    ext: 'py',
    name: 'Python',
    commentType: 'hash',
    prismLanguage: 'python'
  },
  python3: {
    ext: 'py',
    name: 'Python 3',
    commentType: 'hash',
    prismLanguage: 'python'
  },
  c: {
    ext: 'c',
    name: 'C',
    commentType: 'slash',
    prismLanguage: 'c'
  },
  csharp: {
    ext: 'cs',
    name: 'C#',
    commentType: 'slash',
    prismLanguage: 'csharp'
  },
  javascript: {
    ext: 'js',
    name: 'JavaScript',
    commentType: 'slash',
    prismLanguage: 'javascript'
  },
  typescript: {
    ext: 'ts',
    name: 'TypeScript',
    commentType: 'slash',
    prismLanguage: 'typescript'
  },
  golang: {
    ext: 'go',
    name: 'Go',
    commentType: 'slash',
    prismLanguage: 'go'
  },
  go: {
    ext: 'go',
    name: 'Go',
    commentType: 'slash',
    prismLanguage: 'go'
  },
  ruby: {
    ext: 'rb',
    name: 'Ruby',
    commentType: 'hash',
    prismLanguage: 'ruby'
  },
  swift: {
    ext: 'swift',
    name: 'Swift',
    commentType: 'slash',
    prismLanguage: 'swift'
  },
  kotlin: {
    ext: 'kt',
    name: 'Kotlin',
    commentType: 'slash',
    prismLanguage: 'kotlin'
  },
  rust: {
    ext: 'rs',
    name: 'Rust',
    commentType: 'slash',
    prismLanguage: 'rust'
  },
  php: {
    ext: 'php',
    name: 'PHP',
    commentType: 'slash',
    prismLanguage: 'php'
  },
  scala: {
    ext: 'scala',
    name: 'Scala',
    commentType: 'slash',
    prismLanguage: 'scala'
  },
  dart: {
    ext: 'dart',
    name: 'Dart',
    commentType: 'slash',
    prismLanguage: 'dart'
  },
  racket: {
    ext: 'rkt',
    name: 'Racket',
    commentType: 'semicolon',
    prismLanguage: 'racket'
  },
  erlang: {
    ext: 'erl',
    name: 'Erlang',
    commentType: 'percent',
    prismLanguage: 'erlang'
  },
  elixir: {
    ext: 'ex',
    name: 'Elixir',
    commentType: 'hash',
    prismLanguage: 'elixir'
  },
  pandas: {
    ext: 'py',
    name: 'Python (Pandas)',
    commentType: 'hash',
    prismLanguage: 'python'
  }
};

/**
 * Normalizes a language key to lowercase without whitespace
 */
function normalizeLanguage(lang) {
  if (!lang) return 'python3';
  return lang.toString().toLowerCase().trim().replace(/\s+/g, '');
}

/**
 * Returns extension and metadata for a given LeetCode language
 */
function getLanguageInfo(lang) {
  const normalized = normalizeLanguage(lang);
  return LANGUAGE_MAP[normalized] || {
    ext: 'txt',
    name: lang || 'Unknown',
    commentType: 'slash',
    prismLanguage: 'text'
  };
}

/**
 * Formats a comment block at the top of the solution file
 * @param {Object} metadata
 * @param {string} metadata.title
 * @param {string|number} metadata.questionId
 * @param {string} metadata.difficulty
 * @param {string} metadata.language
 * @param {string} metadata.runtime
 * @param {string} metadata.runtimePercentile
 * @param {string} metadata.memory
 * @param {string} metadata.memoryPercentile
 * @param {string} metadata.url
 * @returns {string} Formatted comment block
 */
function formatSolutionHeader(metadata) {
  const {
    title = '',
    questionId = '',
    difficulty = '',
    language = '',
    runtime = 'N/A',
    runtimePercentile = '',
    memory = 'N/A',
    memoryPercentile = '',
    url = ''
  } = metadata;

  const info = getLanguageInfo(language);
  const runtimeStr = runtimePercentile ? `${runtime} (Beats ${runtimePercentile})` : runtime;
  const memoryStr = memoryPercentile ? `${memory} (Beats ${memoryPercentile})` : memory;
  const problemTitle = questionId ? `${questionId}. ${title}` : title;

  const lines = [
    `Problem: ${problemTitle}`,
    `Difficulty: ${difficulty}`,
    `Language: ${info.name}`,
    `Runtime: ${runtimeStr}`,
    `Memory: ${memoryStr}`,
    `LeetCode: ${url}`
  ];

  switch (info.commentType) {
    case 'hash':
      return lines.map(line => `# ${line}`).join('\n') + '\n\n';

    case 'semicolon':
      return lines.map(line => `;; ${line}`).join('\n') + '\n\n';

    case 'percent':
      return lines.map(line => `%% ${line}`).join('\n') + '\n\n';

    case 'dash':
      return lines.map(line => `-- ${line}`).join('\n') + '\n\n';

    case 'slash':
    default:
      return (
        '/**\n' +
        lines.map(line => ` * ${line}`).join('\n') +
        '\n */\n\n'
      );
  }
}

// Export for ES modules and standard browser script contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LANGUAGE_MAP,
    normalizeLanguage,
    getLanguageInfo,
    formatSolutionHeader
  };
}
