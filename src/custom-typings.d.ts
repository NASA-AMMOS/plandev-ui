/**
 * Specify overriden types for certain modules.
 *
 * In this case, we need to add our typescript worker method additions to the `monaco-editor` internal
 * worker type. The following has the effect of applying such a patch, utalizing decleration merging
 * to add our prop overrides to the type `monaco-editor/languages/typescript/TypeScriptWorker` at all uses.
 */

import type { WorkerOverrideProps } from './workers/customTS.worker';
declare module 'monaco-editor' {
  namespace languages.typescript {
    // The transformation from interface extension to type decleration that eslint wants to make
    //  breaks the [decleration merge](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
    //  that's happening here.
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface TypeScriptWorker extends WorkerOverrideProps {}
  }
}
