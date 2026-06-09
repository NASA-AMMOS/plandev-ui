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
  fileExtension: '.seqN.txt',
  name: 'Minimal Test Input Language',
  getEditorExtension: (_context, resources) => [
    resources.linter(() => {
      // Pass the syntax node as undefined as it's optional in the implementation
      return [];
    }),
  ],
};

// Minimal output language 1
const minimalOutputLanguage1 = {
  fileExtension: '.rml',
  name: 'Language 1 Output',
  getEditorExtension: (_context, resources) => {
    return [
      resources.linter(() => {
        // Pass the syntax node as undefined as it's optional in the implementation
        return [{
          from: 0,
          to: 10,
          severity: "warning",
          message: "This is a warning lint for output language 1"
        }];
      }),
    ];
  },
  // Convert output back to input format
  toInputFormat: function () {
    return 'This is the converted input for language 1'
  },

  // Convert input to output format
  toOutputFormat: function () {
    return 'This is the output for language 1'
  },
};

// Minimal output language 2
const minimalOutputLanguage2 = {
  fileExtension: '.vml',
  name: 'Language 2 Output',
  getEditorExtension: (_context, resources) => {
    return [
      resources.linter(() => {
        // Pass the syntax node as undefined as it's optional in the implementation
          return [{
            from: 0,
            to: 10,
            severity: "warning",
            message: "This is a warning lint for output language 2"
          }];
      }),
    ];
  },

  // Convert output back to input format
  toInputFormat: function () {
    return 'This is the converted input for language 2';
  },

  // Convert input to output format
  toOutputFormat: function () {
    return 'This is the output for language 2'
  },
};

// The main adaptation export
const adaptation = {
  input: minimalInputLanguage,
  outputs: [minimalOutputLanguage1, minimalOutputLanguage2],
};

// Export the adaptation (required)
exports.adaptation = adaptation;
