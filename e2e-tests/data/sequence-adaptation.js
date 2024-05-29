(() => {
  globalThis.CONDITIONAL_KEYWORDS = {};
  globalThis.LOOP_KEYWORDS = {};
  globalThis.GLOBALS = [];
  globalThis.LINT = function commandDictionary(commandDictionary, view, node) {
    const diagnostics = [];

    console.log(commandDictionary, view, node);

    return diagnostics;
  };
})();
