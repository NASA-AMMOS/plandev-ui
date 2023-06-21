/**
 * Specify overridden types for certain modules.
 *
 * Used to give correct type completions for the main-thread typescript worker interface.
 *
 * In this case, we need to add our typescript worker method additions to the `monaco-editor` internal
 * worker type. The following has the effect of applying such a patch, utilizing declaration merging
 * to add our overrides to the type `monaco-editor/languages/typescript/TypeScriptWorker` at all uses.
 */

import type { WorkerOverrideProps } from './workers/customTS.worker';

declare module 'monaco-editor' {
  namespace languages.typescript {
    // The transformation from interface extension to type declaration that eslint wants to make
    // breaks the [declaration merge](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
    // that's happening here.
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface TypeScriptWorker extends WorkerOverrideProps {}
  }
}
