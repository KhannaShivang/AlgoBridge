/**
 * AlgoBridge - LLM Solution Explanation Module (Architecture & Future Hook)
 *
 * Provides an extensible interface for generating automated explanations,
 * intuition, and time/space complexity analysis using an LLM.
 */

const LLM_PROVIDERS = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
  GEMINI: 'gemini'
};

/**
 * Checks if LLM explanation is enabled in settings
 */
async function isLlmEnabled() {
  return new Promise(resolve => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['llmEnabled', 'llmApiKey'], result => {
        resolve(Boolean(result.llmEnabled && result.llmApiKey));
      });
    } else {
      resolve(false);
    }
  });
}

/**
 * Placeholder generator when LLM is not yet configured.
 * Produces clean markdown template structure for future LLM or manual notes.
 */
function getDefaultExplanationTemplate(metadata = {}) {
  const { runtime = '', memory = '' } = metadata;

  return `
### Approach & Intuition
*(Intuition notes can be written here)*

### Complexity Analysis
- **Time Complexity:** Derived from algorithm logic and constraints. ${runtime ? `(Runtime: ${runtime})` : ''}
- **Space Complexity:** Auxiliary memory utilized by the solution. ${memory ? `(Memory: ${memory})` : ''}
`;
}

/**
 * Hook to generate an AI explanation.
 * When LLM support is configured by the user, this function sends the prompt
 * to the specified provider and returns markdown.
 *
 * @param {Object} params
 * @param {string} params.problemTitle
 * @param {string} params.problemDescription
 * @param {string} params.code
 * @param {string} params.language
 * @param {Object} params.stats
 * @returns {Promise<string>} Formatted markdown explanation
 */
async function generateExplanation(params) {
  const enabled = await isLlmEnabled();

  if (!enabled) {
    // Return standard template placeholder
    return getDefaultExplanationTemplate(params.stats);
  }

  // Future implementation: Make API call to Anthropic / OpenAI / Gemini
  // Example prompt structure:
  // "Explain the following solution for LeetCode problem {title}.
  // Include: 1. Approach summary, 2. Step-by-step intuition, 3. Detailed Time & Space Complexity."
  return getDefaultExplanationTemplate(params.stats);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LLM_PROVIDERS,
    isLlmEnabled,
    getDefaultExplanationTemplate,
    generateExplanation
  };
}
