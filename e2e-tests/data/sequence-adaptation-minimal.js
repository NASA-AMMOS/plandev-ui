'use strict';

/**
 * Minimal Sequence Adaptation for Testing
 *
 * This is a bare-bones adaptation useful for testing adaptation loading,
 * error handling, and the workspace console.
 *
 * To test different error scenarios, you can:
 * 1. Remove `exports.adaptation` - tests "No adaptation export found" error
 * 2. Set `exports.adaptation = null` - tests null adaptation error
 * 3. Remove `input` property - tests invalid adaptation structure
 * 4. Throw an error in toOutputFormat - tests runtime errors
 */

// Minimal input language - no grammar, just basic structure
const minimalInputLanguage = {
  fileExtension: '.txt',
  name: 'Minimal Test Language',
  getEditorExtension: () => {},
};

// Minimal output language
const minimalOutputLanguage = {
  fileExtension: '.json',
  name: 'JSON Output',
  getEditorExtension: () => {},

  // Convert output back to input format
  toInputFormat: function (output) {
    try {
      const parsed = JSON.parse(output);
      return parsed.content || '';
    } catch (e) {
      return output;
    }
  },

  // Convert input to output format
  toOutputFormat: function (input, _context, name) {
    // Uncomment the line below to test runtime errors:
    // throw new Error('Intentional adaptation error for testing');

    return JSON.stringify({
      name: name,
      content: input,
      timestamp: new Date().toISOString(),
    }, null, 2);
  },
};

// The main adaptation export
const adaptation = {
  input: minimalInputLanguage,
  outputs: [minimalOutputLanguage],
};

// Export the adaptation (required)
exports.adaptation = adaptation;

// ============================================================
// ERROR TESTING VARIANTS
// ============================================================
// Uncomment ONE of these blocks to test different error scenarios:

// --- Test: null adaptation ---
// exports.adaptation = null;

// --- Test: undefined adaptation ---
// exports.adaptation = undefined;

// --- Test: invalid type ---
// exports.adaptation = "not an object";

// --- Test: missing export (delete) ---
// delete exports.adaptation;

// --- Test: missing input property ---
// exports.adaptation = { outputs: [minimalOutputLanguage] };

// --- Test: runtime error in toOutputFormat ---
// minimalOutputLanguage.toOutputFormat = function () {
//   throw new Error('Intentional toOutputFormat error for testing');
// };
// exports.adaptation = { input: minimalInputLanguage, outputs: [minimalOutputLanguage] };
