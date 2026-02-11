// codemirror dependencies to be injected into the adaptation
import * as cmCommands from '@codemirror/commands';
import * as cmLanguage from '@codemirror/language';
import * as cmView from '@codemirror/view';

import type { PhoenixAdaptation } from '@nasa-jpl/aerie-sequence-languages';
import type { User } from '../../types/app';
import type { SequenceAdaptationMetadata } from '../../types/sequencing';
import effects from '../effects';

export type AdaptationLogEntry = { args: any[]; level: string };
export type AdaptationLogEntryHandler = (log: AdaptationLogEntry) => void;

export async function loadSequenceAdaptation(
  id: number,
  user: User | null,
  onLog?: AdaptationLogEntryHandler,
): Promise<{ adaptation: PhoenixAdaptation; metadata: SequenceAdaptationMetadata }> {
  const adaptationRow = await effects.getSequenceAdaptation(id, user);
  if (!adaptationRow) {
    throw new Error(`Got empty adaptation row from DB for adaptation id ${id}`);
  }

  if (!user) {
    throw new Error('No active user logged in.');
  }

  const adaptationCode: string = adaptationRow.adaptation;
  // create a function wrapping the adaptation which takes `require`, `exports`, and `console` args
  // passing `console` allows us to capture logs from the adaptation code
  const runAdaptation = new Function('require', 'exports', 'console', adaptationCode);

  // Create a custom console that extends the original but also forwards logs to the onLog callback
  const customConsole = {
    ...console,
    debug: (...args: any[]) => {
      console.debug(...args);
      onLog?.({ args, level: 'info' });
    },
    error: (...args: any[]) => {
      console.error(...args);
      onLog?.({ args, level: 'error' });
    },
    info: (...args: any[]) => {
      console.info(...args);
      onLog?.({ args, level: 'info' });
    },
    log: (...args: any[]) => {
      console.log(...args);
      onLog?.({ args, level: 'info' });
    },
    trace: (...args: any[]) => {
      console.error(...args);
      onLog?.({ args, level: 'error' });
    },
    warn: (...args: any[]) => {
      console.warn(...args);
      onLog?.({ args, level: 'warn' });
    },
  };
  // the adaptation code is expected to be a commonjs module which calls `require(...)`
  // to load its Codemirror dependencies. It *must* use the same Codemirror instance/globals as the
  // outer page context, rather than bundling its own, due to the way CM uses shared internal state fields.
  // To ensure this, pass a custom `require` function to the module which injects the page's CM dependencies.
  // (any other dependencies are expected to be bundled into the adaptation code)
  const moduleRequire = (id: string) => {
    return {
      '@codemirror/commands': cmCommands,
      '@codemirror/language': cmLanguage,
      '@codemirror/view': cmView,
    }[id];
  };
  // adaptation code will set `exports.adaptation = adaptation;`
  const moduleExports = {} as any; // todo better typing
  // run the adaptation code & get the exported result - moduleExports gets mutated by the function
  runAdaptation(moduleRequire, moduleExports, customConsole);
  const adaptation: PhoenixAdaptation | null | undefined = moduleExports.adaptation;

  if (!adaptation || typeof adaptation !== 'object') {
    console.error('Missing adaptation', adaptation);
    throw new Error(
      `No adaptation export found for "${adaptationRow.name}" - ensure that your adaptation sets \`exports.adaptation\``,
    );
  }

  // Validate required properties
  if (!adaptation.input || typeof adaptation.input !== 'object') {
    console.error('Invalid adaptation - missing input', adaptation);
    throw new Error(`Invalid adaptation "${adaptationRow.name}": missing required \`input\` property`);
  }

  if (!Array.isArray(adaptation.outputs) || adaptation.outputs.length === 0) {
    console.error('Invalid adaptation - missing outputs', adaptation);
    throw new Error(
      `Invalid adaptation "${adaptationRow.name}": missing required \`outputs\` array (must have at least one output format)`,
    );
  }

  return { adaptation, metadata: adaptationRow };
}
