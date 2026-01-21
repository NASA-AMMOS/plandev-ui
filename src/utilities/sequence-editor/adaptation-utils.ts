// codemirror dependencies to be injected into the adaptation
import * as cmCommands from '@codemirror/commands';
import * as cmLanguage from '@codemirror/language';
import * as cmView from '@codemirror/view';

import type { PhoenixAdaptation } from '@nasa-jpl/aerie-sequence-languages';
import type { User } from '../../types/app';
import effects from '../effects';

export async function loadSequenceAdaptation(id: number, user: User | null): Promise<PhoenixAdaptation> {
  const adaptationRow = await effects.getSequenceAdaptation(id, user);
  if (!adaptationRow) {
    throw new Error(`Got empty adaptation row from DB for adaptation id ${id}`);
  }

  if (!user) {
    throw new Error('No active user logged in.');
  }

  const adaptationCode: string = adaptationRow.adaptation;
  // create a function wrapping the adaptation which takes `require` and `exports` args
  const runAdaptation = new Function('require', 'exports', adaptationCode);
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
  runAdaptation(moduleRequire, moduleExports);
  const adaptation: PhoenixAdaptation | null | undefined = moduleExports.adaptation;

  if (!adaptation || typeof adaptation !== 'object') {
    console.error('Missing adaptation', adaptation);
    throw new Error('No adaptation export found - ensure that your adaptation sets `exports.adaptation`');
  }

  return adaptation;
}
