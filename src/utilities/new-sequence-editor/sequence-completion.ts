import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
import { fswCommandArgDefault } from './command-dictionary';
import { getCustomArgDef } from './extension-points';

type CursorInfo = {
  isAtLineComment: boolean;
  isAtSymbolBefore: boolean;
  isBeforeHDWCommands: boolean;
  isBeforeImmedOrHDWCommands: boolean;
  isTimeTagBefore: boolean;
  position: number;
};

/**
 * Completion function that returns a Code Mirror extension function.
 * Can be optionally called with a command dictionary so it's available for completion.
 */
export function sequenceCompletion(
  channelDictionary: ChannelDictionary | null = null,
  commandDictionary: CommandDictionary | null = null,
  parameterDictionaries: ParameterDictionary[],
) {
  return (context: CompletionContext): CompletionResult | null => {
    const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
    const nodeCurrent = syntaxTree(context.state).resolveInner(context.pos, 0);
    const baseNode = syntaxTree(context.state).topNode;

    if (nodeBefore?.parent?.name === 'Args') {
      // TODO: Handle argument completions.
      return null;
    }

    const word = context.matchBefore(/\w*/);

    if (word) {
      if (word.from === word.to && !context.explicit) {
        return null;
      }

      const timeTagCompletions: Completion[] = [];
      const enumerationCompletions: Completion[] = [];
      const fswCommandsCompletions: Completion[] = [];
      const hwCommandsCompletions: Completion[] = [];
      const directivesCompletions: Completion[] = [];

      const cursor: CursorInfo = {
        isAtLineComment: nodeCurrent.name === 'LineComment' || nodeBefore.name === 'LineComment',
        isAtSymbolBefore: isAtTyped(context.state.doc.toString(), word),
        isBeforeHDWCommands: context.pos < (baseNode.getChild('HardwareCommands')?.from ?? Infinity),
        isBeforeImmedOrHDWCommands:
          context.pos <
          (baseNode.getChild('ImmediateCommands')?.from ?? baseNode.getChild('HardwareCommands')?.from ?? Infinity),
        isTimeTagBefore: nodeBefore.parent?.getChild('TimeTag') ? true : false,
        position: context.pos,
      };

      if (cursor.isBeforeImmedOrHDWCommands) {
        directivesCompletions.push(
          {
            apply: `${cursor.isAtSymbolBefore ? '' : '@'}ID ""`,
            info: 'Sequence ID',
            label: '@ID',
            section: 'Directives',
            type: 'keyword',
          },
          {
            apply: `${cursor.isAtSymbolBefore ? '' : '@'}LOAD_AND_GO`,
            info: 'Set Sequence as a Load and Go Sequence',
            label: '@LOAD_AND_GO',
            section: 'Directives',
            type: 'keyword',
          },
          {
            apply: `${cursor.isAtSymbolBefore ? '' : '@'}INPUT_PARAMS VALUE`,
            info: 'List of Input Parameters',
            label: '@INPUT_PARAMS',
            section: 'Directives',
            type: 'keyword',
          },
          {
            apply: `${cursor.isAtSymbolBefore ? '' : '@'}LOCALS VALUE`,
            info: 'List of Local Variables',
            label: '@LOCALS',
            section: 'Directives',
            type: 'keyword',
          },
          {
            apply: `${cursor.isAtSymbolBefore ? '' : '@'}HARDWARE`,
            info: 'A HARDWARE Directive',
            label: '@HARDWARE',
            section: 'Directives',
            type: 'keyword',
          },
          {
            apply: `${cursor.isAtSymbolBefore ? '' : '@'}IMMEDIATE`,
            info: 'A IMMEDIATE Directive',
            label: '@IMMEDIATE',
            section: 'Directives',
            type: 'keyword',
          },
        );

        if (!cursor.isTimeTagBefore) {
          timeTagCompletions.push(
            {
              apply: 'A0000-000T00:00:00 ',
              info: 'Execute command at an absolute time',
              label: `A (absolute)`,
              section: 'Time Tags',
              type: 'keyword',
            },
            {
              apply: 'C ',
              info: 'Execute command after the previous command completes',
              label: 'C (command complete)',
              section: 'Time Tags',
              type: 'keyword',
            },
            {
              apply: 'E+00:00:00 ',
              info: 'Execute command at an offset from an epoch',
              label: 'E (epoch)',
              section: 'Time Tags',
              type: 'keyword',
            },
            {
              apply: 'R1 ',
              info: 'Execute command at an offset from the previous command',
              label: 'R (relative)',
              section: 'Time Tags',
              type: 'keyword',
            },
          );
        }
      }

      // Directives.
      directivesCompletions.push(
        {
          apply: `${isAtTyped(context.state.doc.toString(), word) ? '' : '@'}METADATA "Key" "Value"`,
          info: 'Any key-value pairs',
          label: `@METADATA`,
          section: 'Directives',
          type: 'keyword',
        },
        {
          apply: `${isAtTyped(context.state.doc.toString(), word) ? '' : '@'}MODEL "Variable" 0 "Offset"`,
          info: 'List of Local Variables',
          label: '@MODEL',
          section: 'Directives',
          type: 'keyword',
        },
      );

      // If TimeTag has not been entered by the user wait for 2 characters before showing the command completions list
      // If TimeTag has been entered show the completion list when 1 character has been entered
      if (word.text.length > (cursor.isTimeTagBefore || cursor.isBeforeImmedOrHDWCommands === false ? 0 : 1)) {
        fswCommandsCompletions.push(
          ...generateCommandCompletions(channelDictionary, commandDictionary, cursor, parameterDictionaries),
        );
      }

      // TODO: Move to a function like generateCommandCompletions
      hwCommandsCompletions.push(...generateHardwareCompletions(commandDictionary, cursor));

      //
      // Enumerations.
      // TODO: Make context aware.
      // for (const enumeration of commandDictionary.enums) {
      //   for (const enumValue of enumeration.values) {
      //     const { symbol } = enumValue;

      //     enumerationCompletions.push({
      //       label: symbol,
      //       section: 'Enumerations',
      //       type: 'labelName',
      //     });
      //   }
      // }

      const globals = globalThis.GLOBALS;
      const globalCompletions: Completion[] = [];

      if (globals) {
        for (const global of globals) {
          globalCompletions.push({
            apply: global.name,
            info: global.type,
            label: global.name,
            section: 'Globals',
            type: 'keyword',
          });
        }
      }

      return {
        from: word.from,
        options: [
          ...directivesCompletions,
          ...timeTagCompletions,
          ...enumerationCompletions,
          ...fswCommandsCompletions,
          ...hwCommandsCompletions,
          ...globalCompletions,
        ],
      };
    }

    return null;
  };
}

function generateCommandCompletions(
  channelDictionary: ChannelDictionary | null,
  commandDictionary: CommandDictionary | null,
  cursor: CursorInfo,
  parameterDictionaries: ParameterDictionary[],
): Completion[] {
  if (commandDictionary === null) {
    return [];
  }

  // if cursor is at the LineComment/Description don't show the command completions list
  if (cursor.isAtLineComment || !cursor.isBeforeHDWCommands) {
    return [];
  }

  const fswCommandsCompletions: Completion[] = [];
  for (const fswCommand of commandDictionary.fswCommands) {
    const { description, stem, arguments: args } = fswCommand;
    let apply = stem;

    if (args.length) {
      const argDefaults: string[] = [];
      args.forEach(arg => {
        argDefaults.push(
          fswCommandArgDefault(
            getCustomArgDef(stem, arg, argDefaults.slice(), parameterDictionaries, channelDictionary),
            commandDictionary.enumMap,
          ),
        );
      });
      const argsStr = argDefaults.join(' ');
      apply = `${stem} ${argsStr} `;
    }

    if (!cursor.isTimeTagBefore && cursor.isBeforeImmedOrHDWCommands) {
      apply = 'C ' + apply;
    }

    fswCommandsCompletions.push({
      apply,
      info: description,
      label: stem,
      section: 'Flight Software Commands',
      type: 'function',
    });
  }
  return fswCommandsCompletions;
}

function generateHardwareCompletions(commandDictionary: CommandDictionary | null, cursor: CursorInfo): Completion[] {
  if (commandDictionary === null) {
    return [];
  }

  // if cursor is at the LineComment/Description or before HDWCommands don't show the completions list
  if (cursor.isAtLineComment || cursor.isBeforeHDWCommands) {
    return [];
  }

  const hwCommandsCompletions: Completion[] = [];
  for (const hwCommand of commandDictionary.hwCommands) {
    const { description, stem } = hwCommand;

    hwCommandsCompletions.push({
      apply: stem,
      info: description,
      label: stem,
      section: 'Hardware Commands',
      type: 'function',
    });
  }
  return hwCommandsCompletions;
}

function isAtTyped(docString: string, word: { from: number; text: string; to: number }): boolean {
  if (!word || word.from === undefined || word.text === undefined) {
    return false;
  }
  const from = word.from - 1;
  const docStringSlice = docString.slice(from, from + 1);
  if (docStringSlice === undefined) {
    return false;
  }
  return docStringSlice === '@';
}
