import type { SyntaxNode, Tree } from '@lezer/common';
import type { CommandDictionary, FswCommandArgument, FswCommandArgumentRepeat } from '@nasa-jpl/aerie-ampcs';
import type {
  Args,
  BooleanArgument,
  Command,
  HardwareCommand,
  HexArgument,
  ImmediateCommand,
  Metadata,
  Model,
  NumberArgument,
  RepeatArgument,
  SeqJson,
  StringArgument,
  SymbolArgument,
  Time,
  VariableDeclaration,
} from '@nasa-jpl/seq-json-schema/types';
import { TimeTypes } from '../../enums/time';
import { removeEscapedQuotes, unquoteUnescape } from '../codemirror/codemirror-utils';
import { getBalancedDuration, getDurationTimeComponents, parseDurationString, validateTime } from '../time';
import { logInfo } from './logger';
import { TOKEN_REPEAT_ARG } from './sequencer-grammar-constants';

/**
 * Returns a minimal valid Seq JSON object.
 * Use for getting a default Seq JSON throughout the application.
 */
function seqJsonDefault(): SeqJson {
  return { id: '', metadata: {} };
}

/**
 * Walks the sequence parse tree and converts it to a valid Seq JSON object.
 */
export async function sequenceToSeqJson(
  node: Tree,
  text: string,
  commandDictionary: CommandDictionary | null,
  sequenceName: string,
): Promise<string> {
  const baseNode = node.topNode;
  const seqJson: SeqJson = seqJsonDefault();
  const variableList: string[] = [];

  seqJson.id = parseId(baseNode, text, sequenceName);
  seqJson.metadata = { ...parseLGO(baseNode), ...parseMetadata(baseNode, text) };
  seqJson.locals = parseVariables(baseNode, text, 'LocalDeclaration') ?? undefined;
  if (seqJson.locals) {
    variableList.push(...seqJson.locals.map(value => value.name));
  }
  seqJson.parameters = parseVariables(baseNode, text, 'ParameterDeclaration') ?? undefined;
  if (seqJson.parameters) {
    variableList.push(...seqJson.parameters.map(value => value.name));
  }
  seqJson.steps =
    baseNode
      .getChild('Commands')
      ?.getChildren('Command')
      .map(command => parseCommand(command, text, commandDictionary)) ?? undefined;
  seqJson.immediate_commands =
    baseNode
      .getChild('ImmediateCommands')
      ?.getChildren('Command')
      .map(command => parseImmediateCommand(command, text, commandDictionary)) ?? undefined;
  seqJson.hardware_commands =
    baseNode
      .getChild('HardwareCommands')
      ?.getChildren('Command')
      .map(command => parseHardwareCommand(command, text)) ?? undefined;

  return JSON.stringify(seqJson, null, 2);
}

function parseLGO(node: SyntaxNode): Metadata | undefined {
  const lgoNode = node.getChild('Commands')?.getChild('LoadAndGoDirective');
  if (!lgoNode) {
    return undefined;
  }

  return {
    lgo: true,
  };
}

function parseArg(
  node: SyntaxNode,
  text: string,
  dictionaryArg: FswCommandArgument | null,
): BooleanArgument | HexArgument | NumberArgument | StringArgument | SymbolArgument | undefined {
  const nodeValue = text.slice(node.from, node.to);

  if (node.name === 'Boolean') {
    const value = nodeValue === 'TRUE' ? true : false;
    const booleanArg: BooleanArgument = { type: 'boolean', value };
    if (dictionaryArg) {
      booleanArg.name = dictionaryArg.name;
    }
    return booleanArg;
  } else if (node.name === 'Enum') {
    const value = nodeValue;
    const enumArg: SymbolArgument = { type: 'symbol', value };
    if (dictionaryArg) {
      enumArg.name = dictionaryArg.name;
    }
    return enumArg;
  } else if (node.name === 'Number') {
    if (nodeValue.slice(0, 2) === '0x') {
      const hexArg: HexArgument = { type: 'hex', value: nodeValue };
      if (dictionaryArg) {
        hexArg.name = dictionaryArg.name;
      }
      return hexArg;
    } else {
      const value = parseFloat(nodeValue);
      const numberArg: NumberArgument = { type: 'number', value };
      if (dictionaryArg) {
        numberArg.name = dictionaryArg.name;
      }
      return numberArg;
    }
  } else if (node.name === 'String') {
    const value = JSON.parse(nodeValue);
    const arg: StringArgument = { type: 'string', value };
    if (dictionaryArg) {
      arg.name = dictionaryArg.name;
    }
    return arg;
  }
}

function parseRepeatArgs(
  repeatArgsNode: SyntaxNode,
  text: string,
  dictRepeatArgument: FswCommandArgumentRepeat | null,
) {
  const repeatArg: RepeatArgument = { name: dictRepeatArgument?.name, type: 'repeat', value: [] };
  const repeatArgs = dictRepeatArgument?.repeat?.arguments;
  const repeatArgsLength = repeatArgs?.length ?? Infinity;
  let repeatArgNode: SyntaxNode | null = repeatArgsNode;

  if (repeatArgNode) {
    let args: RepeatArgument['value'][0] = [];
    let argNode = repeatArgNode.firstChild;

    let i = 0;
    while (argNode) {
      if (i % repeatArgsLength === 0) {
        // [[1 2] [3 4]] in seq.json is flattened in seqN [1 2 3 4]
        // dictionary definition is required to disambiguate
        args = [];
        repeatArg.value.push(args);
      }
      const arg = parseArg(argNode, text, repeatArgs?.[i % repeatArgsLength] ?? null);
      if (arg) {
        args.push(arg);
      } else {
        logInfo(`Could not parse arg for node with name ${argNode.name}`);
      }

      argNode = argNode.nextSibling;
      i++;
    }

    repeatArgNode = repeatArgNode.nextSibling;
  }

  return repeatArg;
}

function parseArgs(
  argsNode: SyntaxNode,
  text: string,
  commandDictionary: CommandDictionary | null,
  stem: string,
): Args {
  const args: Args = [];
  let argNode = argsNode.firstChild;
  const dictArguments = commandDictionary?.fswCommandMap[stem]?.arguments ?? [];
  let i = 0;

  while (argNode) {
    const dictArg = dictArguments[i] ?? null;
    if (argNode.name === TOKEN_REPEAT_ARG) {
      const arg = parseRepeatArgs(argNode, text, (dictArg as FswCommandArgumentRepeat) ?? null);
      if (arg) {
        args.push(arg);
      } else {
        logInfo(`Could not parse repeat arg for node with name ${argNode.name}`);
      }
    } else {
      const arg = parseArg(argNode, text, dictArg);
      if (arg) {
        args.push(arg);
      } else {
        logInfo(`Could not parse arg for node with name ${argNode.name}`);
      }
    }
    argNode = argNode?.nextSibling;
    ++i;
  }

  return args;
}

/**
 *
 * @param commandNode
 * @param text
 * @returns
 */

/**
 * Parses a time tag node and returns a Seq JSON time.
 * Defaults to an unknown absolute time if a command does not have a valid time tag.
 */
function parseTime(commandNode: SyntaxNode, text: string): Time {
  const timeTagNode = commandNode.getChild('TimeTag');
  let tag = 'UNKNOWN';

  if (timeTagNode == null) {
    return { tag, type: 'ABSOLUTE' };
  }

  const timeTagAbsoluteNode = timeTagNode.getChild('TimeAbsolute');
  const timeTagCompleteNode = timeTagNode.getChild('TimeComplete');
  const timeTagEpochNode = timeTagNode.getChild('TimeEpoch');
  const timeTagRelativeNode = timeTagNode.getChild('TimeRelative');

  if (timeTagCompleteNode) {
    return { type: 'COMMAND_COMPLETE' };
  }

  if (!timeTagAbsoluteNode && !timeTagEpochNode && !timeTagRelativeNode) {
    return { tag, type: 'ABSOLUTE' };
  }

  if (timeTagAbsoluteNode) {
    const tag = text.slice(timeTagAbsoluteNode.from + 1, timeTagAbsoluteNode.to).trim();
    return { tag, type: 'ABSOLUTE' };
  } else if (timeTagEpochNode) {
    const timeTagEpochText = text.slice(timeTagEpochNode.from + 1, timeTagEpochNode.to).trim();

    // a regex to determine if this string [+/-]####T##:##:##.###
    if (validateTime(timeTagEpochText, TimeTypes.EPOCH)) {
      const { isNegative, days, hours, minutes, seconds, milliseconds } = getDurationTimeComponents(
        parseDurationString(timeTagEpochText, 'seconds'),
      );
      tag = `${isNegative}${days}${hours}:${minutes}:${seconds}${milliseconds}`;
      return { tag, type: 'EPOCH_RELATIVE' };
    }

    // a regex to determine if this string [+/-]###.###
    if (validateTime(timeTagEpochText, TimeTypes.EPOCH_SIMPLE)) {
      tag = getBalancedDuration(timeTagEpochText);
      if (parseDurationString(tag, 'seconds').milliseconds === 0) {
        tag = tag.slice(0, -4);
      }
      return { tag, type: 'EPOCH_RELATIVE' };
    }
  } else if (timeTagRelativeNode) {
    const timeTagRelativeText = text.slice(timeTagRelativeNode.from + 1, timeTagRelativeNode.to).trim();

    // a regex to determine if this string ####T##:##:##.###
    if (validateTime(timeTagRelativeText, TimeTypes.RELATIVE)) {
      const { isNegative, days, hours, minutes, seconds, milliseconds } = getDurationTimeComponents(
        parseDurationString(timeTagRelativeText, 'seconds'),
      );
      tag = `${isNegative}${days}${hours}:${minutes}:${seconds}${milliseconds}`;
      return { tag, type: 'COMMAND_RELATIVE' };
    }

    if (validateTime(timeTagRelativeText, TimeTypes.RELATIVE_SIMPLE)) {
      tag = getBalancedDuration(timeTagRelativeText);
      if (parseDurationString(tag).milliseconds === 0) {
        tag = tag.slice(0, -4);
      }
      return { tag, type: 'COMMAND_RELATIVE' };
    }
  }
  return { tag, type: 'ABSOLUTE' };
}

// min length of one
type VariableDeclarationArray = [VariableDeclaration, ...VariableDeclaration[]];

function parseVariables(
  node: SyntaxNode,
  text: string,
  type: 'LocalDeclaration' | 'ParameterDeclaration' = 'LocalDeclaration',
): VariableDeclarationArray | undefined {
  const variableContainer = node.getChild(type);
  if (!variableContainer) {
    return undefined;
  }
  const variables = variableContainer.getChildren('Enum');
  if (!variables || variables.length === 0) {
    return undefined;
  }

  return variables.map((variable: SyntaxNode) => {
    const variableText = text.slice(variable.from, variable.to);

    //parse the text [a-z]D*("UINT"|"INT"|"FLOAT"|"ENUM"|"STR")L07
    const match = /(?:[a-zA-Z]*)(?:[0-9]{2})(INT|UINT|FLT|ENUM|STR)/g.exec(variableText);
    if (match) {
      const kind = match[1];

      let type = 'UNKNOWN';
      switch (kind) {
        case 'STR':
          type = 'STRING';
          break;
        case 'FLT':
          type = 'FLOAT';
          break;
        default:
          type = kind;
          break;
      }

      return {
        name: variableText,
        type: type as VariableDeclaration['type'],
      };
    } else {
      return {
        name: variableText,
        type: 'UNKNOWN' as VariableDeclaration['type'],
      };
    }
  }) as VariableDeclarationArray;
}

function parseModel(node: SyntaxNode, text: string): Model[] | undefined {
  const modelContainer = node.getChild('Models');
  if (!modelContainer) {
    return undefined;
  }

  const modelNodes = modelContainer.getChildren('Model');
  if (!modelNodes || modelNodes.length === 0) {
    return undefined;
  }

  const models: Model[] = [];
  for (const modelNode of modelNodes) {
    const variableNode = modelNode.getChild('Variable');
    const valueNode = modelNode.getChild('Value');
    const offsetNode = modelNode.getChild('Offset');

    const variable = variableNode
      ? (unquoteUnescape(text.slice(variableNode.from, variableNode.to)) as string)
      : 'UNKNOWN';

    // Value can be string, number or boolean
    let value: Model['value'] = 0;
    if (valueNode) {
      const valueChild = valueNode.firstChild;
      if (valueChild) {
        const valueText = text.slice(valueChild.from, valueChild.to);
        if (valueChild.name === 'String') {
          value = unquoteUnescape(valueText);
        } else if (valueChild.name === 'Boolean') {
          value = !/^FALSE$/i.test(valueText);
        } else if (valueChild.name === 'Number') {
          value = Number(valueText);
        }
      }
    }
    const offset = offsetNode ? (unquoteUnescape(text.slice(offsetNode.from, offsetNode.to)) as string) : 'UNKNOWN';

    models.push({ offset, value, variable });
  }

  return models;
}

function parseDescription(node: SyntaxNode, text: string): string | undefined {
  const descriptionNode = node.getChild('LineComment');
  if (!descriptionNode) {
    return undefined;
  }
  const description = text.slice(descriptionNode.from + 1, descriptionNode.to).trim();
  return removeEscapedQuotes(description) as string;
}

function parseCommand(commandNode: SyntaxNode, text: string, commandDictionary: CommandDictionary | null): Command {
  const time = parseTime(commandNode, text);

  const stemNode = commandNode.getChild('Stem');
  const stem = stemNode ? text.slice(stemNode.from, stemNode.to) : 'UNKNOWN';

  const argsNode = commandNode.getChild('Args');
  const args = argsNode ? parseArgs(argsNode, text, commandDictionary, stem) : [];

  const description = parseDescription(commandNode, text);
  const metadata: Metadata | undefined = parseMetadata(commandNode, text);
  const models: Model[] | undefined = parseModel(commandNode, text);

  return {
    args,
    stem,
    time,
    type: 'command',
    ...(description ? { description } : {}),
    ...(models ? { models } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function parseImmediateCommand(
  commandNode: SyntaxNode,
  text: string,
  commandDictionary: CommandDictionary | null,
): ImmediateCommand {
  const stemNode = commandNode.getChild('Stem');
  const stem = stemNode ? text.slice(stemNode.from, stemNode.to) : 'UNKNOWN';

  const argsNode = commandNode.getChild('Args');
  const args = argsNode ? parseArgs(argsNode, text, commandDictionary, stem) : [];

  const description = parseDescription(commandNode, text);
  const metadata: Metadata | undefined = parseMetadata(commandNode, text);

  return {
    args,
    stem,
    ...(description ? { description } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function parseHardwareCommand(commandNode: SyntaxNode, text: string): HardwareCommand {
  const stemNode = commandNode.getChild('Stem');
  const stem = stemNode ? text.slice(stemNode.from, stemNode.to) : 'UNKNOWN';
  const description = parseDescription(commandNode, text);
  const metadata: Metadata | undefined = parseMetadata(commandNode, text);

  return {
    stem,
    ...(description ? { description } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

/**
 *  This looks for a @ID directive to specify sequence id, if not present use ground name without extensions
 *
 * @param node - top node of parsed tree
 * @param text - text of sequence
 * @param sequenceName - ground name of sequence
 * @returns
 */
function parseId(node: SyntaxNode, text: string, sequenceName: string): string {
  const stringNode = node.getChild('IdDeclaration')?.getChild('String');
  if (!stringNode) {
    return sequenceName.split('.')[0];
  }

  const id = JSON.parse(text.slice(stringNode.from, stringNode.to));
  return id;
}

function parseMetadata(node: SyntaxNode, text: string): Metadata | undefined {
  const metadataNode = node.getChild('Metadata');
  if (!metadataNode) {
    return undefined;
  }

  const metadataEntry = metadataNode.getChildren('MetaEntry');
  if (!metadataEntry || metadataEntry.length === 0) {
    return undefined;
  }

  const obj: Metadata = {};
  metadataEntry.forEach(entry => {
    const keyNode = entry.getChild('Key');
    const valueNode = entry.getChild('Value');

    if (!keyNode || !valueNode) {
      return; // Skip this entry if either the key or value is missing
    }

    const keyText = unquoteUnescape(text.slice(keyNode.from, keyNode.to)) as string;

    let value = text.slice(valueNode.from, valueNode.to);
    try {
      value = JSON.parse(value);
    } catch (e) {
      logInfo(`Malformed metadata ${value}`);
    }

    obj[keyText] = value;
  });

  return obj;
}
