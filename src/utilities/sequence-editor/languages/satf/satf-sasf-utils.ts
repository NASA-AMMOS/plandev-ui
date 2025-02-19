import type { SyntaxNode } from '@lezer/common';
import { Tree } from '@lezer/common';
import type { CommandDictionary, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
import { TimeTypes } from '../../../../enums/time';
import { getBalancedDuration, getDurationTimeComponents, parseDurationString, validateTime } from '../../../time';
import { unquoteUnescape } from '../../sequence-utils';
import { SatfLanguage } from './satf';
import {
  ACTIVITY_TYPE_DEFINITIONS,
  ACTIVITY_TYPE_GROUP,
  ACTIVITY_TYPE_NAME,
  ARGS,
  ARITHMETICAL,
  ASSUMED_MODEL_VALUES,
  BODY,
  BOOLEAN,
  COMMAND,
  COMMANDS,
  COMMENT,
  ENGINE,
  ENTRY,
  ENUM,
  ENUM_NAME,
  EPOCH,
  GLOBAL,
  HEADER,
  HEADER_PAIR,
  HEADER_PAIRS,
  KEY,
  LINE_COMMENT,
  MODEL,
  NAME,
  NUMBER,
  ON_BOARD_FILENAME,
  ON_BOARD_PATH,
  PARAM_BINARY,
  PARAM_DURATION,
  PARAM_ENGINEERING,
  PARAM_HEXADECIMAL,
  PARAM_OCTAL,
  PARAM_QUOTED_STRING,
  PARAM_SIGNED_DECIMAL,
  PARAM_TIME,
  PARAM_UNSIGNED_DECIMAL,
  PARAMETERS,
  PROCESSOR,
  RANGE,
  REQUEST,
  REQUEST_NAME,
  REQUESTOR,
  REQUESTS,
  SASF,
  SATF,
  SCHEDULED_TIME,
  SEQGEN,
  SFDU_HEADER,
  STEM,
  STEPS,
  STRING,
  TIME,
  TIME_RELATION,
  TYPE,
  VALUE,
  VAR_ENUM,
  VAR_FLOAT,
  VAR_INT,
  VAR_STRING,
  VAR_UINT,
  VARIABLES,
  VIRTUAL_CHANNEL,
} from './satf-constants';

/**
 * Parses the metadata from seqN.
 * @param tree - The SeqN tree of the sequence.
 * @param sequence - The sequence string.
 * @returns An object with a single key, "metadata", which is an object of key-value pairs.
 * The keys are the names of the metadata entries, and the values are the corresponding values.
 */
export function parseMetadata(tree: Tree, sequence: string): { metadata: Record<string, string> } {
  const metadata: Record<string, string> = {};
  const metadataEntries = tree.topNode.getChild('Metadata')?.getChildren('MetaEntry') ?? [];

  for (const entry of metadataEntries) {
    const keyNode = entry.getChild('Key');
    const valueNode = entry.getChild('Value');

    if (keyNode === null || valueNode === null) {
      continue;
    }

    const key = unquoteUnescape(sequence.slice(keyNode.from, keyNode.to));
    const value = sequence.slice(valueNode.from, valueNode.to);

    metadata[key] = value;
  }

  let commentMetadata = tree.topNode.getChildren('LineComment');
  if (commentMetadata.length === 0) {
    commentMetadata = tree.topNode.getChild('Commands')?.getChildren('LineComment') ?? [];
  }

  for (const comment of commentMetadata) {
    const text = sequence.slice(comment.from, comment.to);
    const [key, value] = text.split('=').map(unquoteUnescape);

    if (key && value) {
      metadata[key] = value;
    }
  }

  return { metadata };
}

/**
 * Converts a SeqN tree into SATF/SASF Steps.
 *
 * @param tree - The SeqN syntax tree representing the parsed sequence.
 * @param sequence - The sequence string.
 * @param commandDictionary - An optional dictionary containing command definitions.
 * @returns A formatted SATF/SASF string of Steps or undefined if no commands are found.
 */
export function generateSatfSteps(
  tree: Tree,
  sequence: string,
  commandDictionary: CommandDictionary | null,
): string | undefined {
  let stepNode = tree.topNode.getChild(COMMANDS)?.firstChild;
  let steps = [];
  while (stepNode) {
    steps.push(stepNode);
    stepNode = stepNode.nextSibling;
  }

  steps = steps.filter((step: SyntaxNode) => step.name !== LINE_COMMENT);

  if (steps === null || steps.length === 0) {
    return undefined;
  }
  return `STEPS,\n${steps
    .map((step, index) => {
      return parseStep(step, sequence, commandDictionary, 1 + index++);
    })
    .filter((step: string | undefined) => step)
    .join('\n')}\nend`;
}

export function parseStep(
  child: SyntaxNode | null,
  text: string,
  commandDictionary: CommandDictionary | null,
  order: number,
): string | undefined {
  switch (child?.name) {
    case 'Command':
      return parseCommand(child, text, commandDictionary, order);
    case 'Activate':
      return parseActivate(child, text, order);
    case 'Load':
    case 'GroundBlock':
    case 'GroundEvent':
    default:
      return undefined;
  }
}

function parseCommand(
  commandNode: SyntaxNode,
  sequence: string,
  commandDictionary: CommandDictionary | null,
  order: number,
): string {
  const time = parseTime(commandNode, sequence);

  const stemNode = commandNode.getChild('Stem');
  const stem = stemNode ? sequence.slice(stemNode.from, stemNode.to) : 'UNKNOWN';

  const argsNode = commandNode.getChild('Args');
  const args = argsNode ? parseArgs(argsNode, sequence, commandDictionary, stem) : [];

  return `${'\t'}command(${order},
  ${'\t'.repeat(2)}SCHEDULED_TIME,\\${time.tag}\\,${time.type},
  ${'\t'.repeat(2)}${stem}(${serializeArgs(args)})
  ${'\t'}),`;
}

function parseActivate(stepNode: SyntaxNode, sequence: string, order: number): string {
  const nameNode = stepNode.getChild('SequenceName');
  const sequenceName = nameNode ? unquoteUnescape(sequence.slice(nameNode.from, nameNode.to)) : 'UNKNOWN';
  const time = parseTime(stepNode, sequence);

  const argsNode = stepNode.getChild('Args');
  const args = argsNode ? parseArgs(argsNode, sequence, null, sequenceName) : [];

  const engine = parseEngine(stepNode, sequence);
  const epoch = parseEpoch(stepNode, sequence);

  return `${'\t'}SPAWN(${order},
  ${'\t'.repeat(2)}SCHEDULED_TIME,\\${time.tag}\\,${time.type},${
    engine !== undefined
      ? `
  ${'\t'.repeat(2)}RETURN_ENGINE_ID_TO,\\${engine}\\,`
      : ''
  }${
    epoch !== undefined
      ? `
  ${'\t'.repeat(2)}EPOCH,${epoch},`
      : ''
  }
  ${'\t'.repeat(2)}RT_on_board_block(${sequenceName},${serializeArgs(args)})
  ${'\t'}),`;
}

function parseEngine(stepNode: SyntaxNode, text: string): number | undefined {
  const engineNode = stepNode.getChild(ENGINE)?.getChild(NUMBER);
  return engineNode ? parseInt(text.slice(engineNode.from, engineNode.to), 10) : undefined;
}

function parseEpoch(stepNode: SyntaxNode, text: string): string | undefined {
  const epochNode = stepNode.getChild(EPOCH)?.getChild(STRING);
  return epochNode ? unquoteUnescape(text.slice(epochNode.from, epochNode.to)) : undefined;
}

function parseTime(
  commandNode: SyntaxNode,
  sequence: string,
): {
  tag: string;
  type: 'UNKNOWN' | 'ABSOLUTE' | 'WAIT_PREVIOUS_END' | 'EPOCH' | 'FROM_PREVIOUS_START' | 'GROUND_EPOCH';
} {
  const tag = '00:00:01';
  const timeTagNode = commandNode.getChild('TimeTag');
  if (timeTagNode === null) {
    return { tag: '00:00:00', type: 'UNKNOWN' };
  }

  const time = timeTagNode.firstChild;
  if (time === null) {
    return { tag, type: 'UNKNOWN' };
  }

  const timeValue = sequence.slice(time.from + 1, time.to).trim();

  if (time.name === 'TimeComplete') {
    return { tag, type: 'WAIT_PREVIOUS_END' };
  } else if (time.name === 'TimeGroundEpoch') {
    const parentNode = time.parent;

    if (parentNode) {
      // ex: G+3:00 "GroundEpochName"
      const parentNodeText = sequence.slice(parentNode.from, parentNode.to);
      const splitParentNodeText = parentNodeText.slice(1, parentNodeText.length).split(' ');

      if (splitParentNodeText.length > 0) {
        const epochTag = splitParentNodeText[0];
        const epochName = unquoteUnescape(splitParentNodeText[1]);

        return { tag: `${epochName}${epochTag}`, type: 'GROUND_EPOCH' };
      }
    }
  } else {
    if (validateTime(timeValue, TimeTypes.ABSOLUTE)) {
      return { tag: timeValue, type: 'ABSOLUTE' };
    } else if (validateTime(timeValue, TimeTypes.EPOCH)) {
      const { isNegative, days, hours, minutes, seconds, milliseconds } = getDurationTimeComponents(
        parseDurationString(timeValue, 'seconds'),
      );
      return { tag: `${isNegative}${days}${hours}:${minutes}:${seconds}${milliseconds}`, type: 'EPOCH' };
    } else if (validateTime(timeValue, TimeTypes.EPOCH_SIMPLE)) {
      let balancedTime = getBalancedDuration(timeValue);
      if (parseDurationString(balancedTime, 'seconds').milliseconds === 0) {
        balancedTime = balancedTime.slice(0, -4);
      }
      return { tag: balancedTime, type: 'EPOCH' };
    } else if (validateTime(timeValue, TimeTypes.RELATIVE)) {
      const { isNegative, days, hours, minutes, seconds, milliseconds } = getDurationTimeComponents(
        parseDurationString(timeValue, 'seconds'),
      );
      return { tag: `${isNegative}${days}${hours}:${minutes}:${seconds}${milliseconds}`, type: 'FROM_PREVIOUS_START' };
    } else if (validateTime(timeValue, TimeTypes.RELATIVE_SIMPLE)) {
      let balancedTime = getBalancedDuration(timeValue);
      if (parseDurationString(balancedTime).milliseconds === 0) {
        balancedTime = balancedTime.slice(0, -4);
      }
      return { tag: balancedTime, type: 'FROM_PREVIOUS_START' };
    }
  }
  return { tag, type: 'UNKNOWN' };
}

function parseArgs(
  argsNode: SyntaxNode,
  sequence: string,
  commandDictionary: CommandDictionary | null,
  stem: string,
): { name?: string; type: 'boolean' | 'enum' | 'number' | 'string'; value: boolean | string }[] {
  const args = [];
  let argNode = argsNode.firstChild;
  const dictArguments = commandDictionary?.fswCommandMap[stem]?.arguments ?? [];
  let i = 0;

  while (argNode) {
    const dictionaryArg = dictArguments[i] ?? null;
    const arg = parseArg(argNode, sequence, dictionaryArg);

    if (arg !== undefined) {
      args.push(arg);
    }

    argNode = argNode?.nextSibling;
    i++;
  }

  return args;
}

function parseArg(
  argNode: SyntaxNode,
  sequence: string,
  dictionaryArg: FswCommandArgument | null,
): { name?: string | undefined; type: 'boolean' | 'enum' | 'number' | 'string'; value: boolean | string } | undefined {
  const nodeValue = sequence.slice(argNode.from, argNode.to);

  switch (argNode.name) {
    case 'Boolean': {
      return {
        name: dictionaryArg ? dictionaryArg.name : undefined,
        type: 'boolean' as const,
        value: nodeValue === 'TRUE' ? true : false,
      };
    }
    case 'Enum': {
      return { name: dictionaryArg ? dictionaryArg.name : undefined, type: 'enum' as const, value: nodeValue };
    }
    case 'Number': {
      const decimalCount = nodeValue.slice(nodeValue.indexOf('.') + 1).length;
      return {
        name: dictionaryArg ? dictionaryArg.name : undefined,
        type: 'number',
        value: parseFloat(nodeValue).toFixed(decimalCount),
      };
    }
    case 'String': {
      return { name: dictionaryArg ? dictionaryArg.name : undefined, type: 'string', value: nodeValue };
    }
    default: {
      break;
    }
  }
}

function serializeArgs(args: any[]): string {
  return args
    .map(arg => {
      return `${arg.value}`;
    })
    .join(', ');
}

/**
 * Converts a seqN tree into SATF/SASF variables.
 *
 * @param {Tree} tree - The SeqN tree of the sequence
 * @param {string} text - The original text of the sequence
 * @param {string} type - The SATF/SASF variable type, either 'Parameters'
 *                        or 'Variables'
 * @returns {string | undefined} - The generated string or undefined if there
 *                                  are no variables
 */
export function generateSatfVariables(
  tree: Tree,
  text: string,
  type: 'Parameters' | 'Variables' = 'Parameters',
): string | undefined {
  let nType = 'ParameterDeclaration';
  if (type === 'Variables') {
    nType = 'LocalDeclaration';
  }

  const variableContainer = tree.topNode.getChild(nType);
  if (!variableContainer) {
    return undefined;
  }

  const variables = variableContainer.getChildren('Variable');
  if (!variables || variables.length === 0) {
    return undefined;
  }

  const serializedVariables = variables
    .map((variableNode: SyntaxNode) => {
      const nameNode = variableNode.getChild('Enum');
      const typeNode = variableNode.getChild('Type');
      const enumNode = variableNode.getChild('EnumName');
      const rangeNode = variableNode.getChild('Range');
      const allowableValuesNode = variableNode.getChild('Values');
      const objects = variableNode.getChildren('Object');

      const variableText = nameNode ? text.slice(nameNode.from, nameNode.to) : 'UNKNOWN';
      const variable: {
        allowable_ranges?: any[];
        allowable_values?: any[];
        enum_name?: string;
        name: string;
        sc_name?: string;
        type: 'FLOAT' | 'INT' | 'STRING' | 'UINT' | 'ENUM';
      } = { name: variableText, type: 'INT' };

      if (typeNode) {
        variable.type = text.slice(typeNode.from, typeNode.to) as 'FLOAT' | 'INT' | 'STRING' | 'UINT' | 'ENUM';
        if (enumNode) {
          variable.enum_name = text.slice(enumNode.from, enumNode.to);
        }
        if (rangeNode) {
          const allowableRanges = parseAllowableRanges(text, rangeNode);
          if (allowableRanges && allowableRanges.length > 0) {
            variable.allowable_ranges = allowableRanges;
          }
        }
        if (allowableValuesNode) {
          const allowableValues = parseAllowableValues(text, allowableValuesNode);
          if (allowableValues && allowableValues.length > 0) {
            variable.allowable_values = allowableValues;
          }
        }
      } else {
        for (const object of objects) {
          const properties = object.getChildren('Property');

          properties.forEach(property => {
            const propertyName = property.getChild('PropertyName');
            const propertyValue = propertyName?.nextSibling;
            if (!propertyName || !propertyValue) {
              return;
            }
            const propertyNameString = text.slice(propertyName?.from, propertyName?.to).replaceAll('"', '');
            const propertyValueString = text.slice(propertyValue?.from, propertyValue?.to).replaceAll('"', '');

            switch (propertyNameString.toLowerCase()) {
              case 'allowable_ranges': {
                if (!propertyValue) {
                  break;
                }
                const allowableRanges = parseAllowableRanges(text, propertyValue);
                if (allowableRanges && allowableRanges.length > 0) {
                  variable.allowable_ranges = allowableRanges;
                }
                break;
              }
              case 'allowable_values':
                {
                  if (!propertyValue) {
                    break;
                  }
                  const allowableValues = parseAllowableValues(text, propertyValue);
                  if (allowableValues && allowableValues.length > 0) {
                    variable.allowable_values = allowableValues;
                  }
                }
                break;
              case 'enum_name':
                variable.enum_name = propertyValueString;
                break;
              case 'sc_name':
                variable.sc_name = propertyValueString;
                break;
              case 'type':
                variable.type = propertyValueString as 'FLOAT' | 'INT' | 'STRING' | 'UINT' | 'ENUM';
                break;
            }
          });
        }
      }

      return (
        `\t${variable.name}` +
        `(\n\t\tTYPE,${variable.type}${variable.enum_name ? `\n\tENUM,${variable.enum_name}` : ''}` +
        `${
          variable.allowable_ranges
            ? variable.allowable_ranges
                .map(range => {
                  return `\n\t\tRANGES,\\${range.min}...${range.max}\\`;
                })
                .join(',')
            : ''
        }` +
        `${variable.allowable_values ? `\n\t\tVALUES,${variable.allowable_values}` : ''}` +
        `${variable.sc_name ? `\n\t\tSC_NAME,${variable.sc_name}` : ''}\n\t)`
      );
    })
    .join(',\n\t');

  return `${type},\n' + ${serializedVariables},\nend,\n`;
}

function parseAllowableRanges(text: string, rangeNode: any): { max: number; min: number }[] {
  return text
    .slice(rangeNode.from, rangeNode.to)
    .split(',')
    .map(range => {
      const rangeMatch = /^([-+]?\d+)?(\.\.\.)([-+]?\d+)?$/.exec(range.replaceAll('"', '').trim());
      if (rangeMatch) {
        const [, min, , max] = rangeMatch;
        const maxNum = !isNaN(Number(max)) ? Number(max) : Infinity;
        const minNum = !isNaN(Number(min)) ? Number(min) : -Infinity;

        return { max: maxNum, min: minNum };
      }
      return undefined;
    })
    .filter(range => range !== undefined) as { max: number; min: number }[];
}

function parseAllowableValues(text: string, allowableValuesNode: any): string[] | undefined {
  const allowableValues = text
    .slice(allowableValuesNode.from + 1, allowableValuesNode.to - 1)
    .split(',')
    .map(value => value.trim());

  return allowableValues.length > 0 ? allowableValues : undefined;
}

/**
 * Converts a seqN tree into a string of SASF requests.
 * @param tree The seqN tree for the sequence.
 * @param sequence The text of the sequence.
 * @param commandDictionary The command dictionary for the sequence.
 * @returns A string of SASF requests, or undefined if the sequence contains no requests.
 */
export async function generateRequests(
  tree: Tree,
  sequence: string,
  commandDictionary: CommandDictionary | null,
): Promise<string | undefined> {
  const requests = tree.topNode.getChild('Commands')?.getChildren('Request');
  if (requests == null || requests.length === 0) {
    return undefined;
  }
  return requests
    .map((requestNode: SyntaxNode) => {
      const nameNode = requestNode.getChild('RequestName');
      const name = nameNode ? unquoteUnescape(sequence.slice(nameNode.from, nameNode.to)) : 'UNKNOWN';
      const parsedTime = parseTime(requestNode, sequence);
      const request = `request(${name},
\tSTART_TIME, ${parsedTime.tag},
\tREQUESTOR, "systems",
\tPROCESSOR, "VC2AB",
\tKEY, "NO_KEY")\n\n`;
      let order = 1;
      let child = requestNode?.getChild('Steps')?.firstChild;
      const steps = [];

      while (child) {
        steps.push(`${parseStep(child, sequence, commandDictionary, order++)}`);
        child = child?.nextSibling;
      }

      return `${request}${steps.join('\n')}\nend;\n`;
    })
    .join(',\n');
}

/**
 * Takes a SATF/SASF string and parses it into SeqN sequence strings.
 * @param satf The SATF/SASF string to parse.
 * @returns top level metadata and list of sequences .
 */
export async function satfToSequence(satfOrSasf: string): Promise<{
  header: string;
  sequences: {
    name: string;
    sequence: string;
  }[];
}> {
  const base = SatfLanguage.parser.parse(satfOrSasf).topNode;

  const satfOrSasfNode = base.getChild(SATF) || base.getChild(SASF);

  if (satfOrSasfNode) {
    const header = parseHeader(satfOrSasfNode.getChild(HEADER), satfOrSasf);
    const sequences = parseBody(satfOrSasfNode.getChild(BODY), satfOrSasf);
    return { header, sequences };
  }

  return { header: '', sequences: [] };
}

function parseHeader(headerNode: SyntaxNode | null, text: string): string {
  const header = '';
  if (!headerNode) {
    return header;
  }

  const sfduHeader = headerNode.getChild(SFDU_HEADER)?.getChild(HEADER_PAIRS)?.getChildren(HEADER_PAIR) ?? [];

  return sfduHeader
    .map((pairNode: SyntaxNode) => {
      const keyNode = pairNode.getChild(KEY);
      const valueNode = pairNode.getChild(VALUE);
      if (!keyNode || !valueNode) {
        console.error(`Error processing header entry: ${text.slice(pairNode.from, pairNode.to)}`);
        return '';
      }
      const key = text.slice(keyNode.from, keyNode.to).trim();
      const value = text.slice(valueNode.from, valueNode.to).trim();

      if (key.length === 0 || value.length === 0) {
        return '';
      }
      return `@METADATA "${key}"  "${value}"`;
    })
    .join('\n');
}

function parseBody(bodyNode: SyntaxNode | null, text: string): { name: string; sequence: string }[] {
  if (!bodyNode) {
    return [];
  }

  //satf
  if (bodyNode.getChild(ACTIVITY_TYPE_DEFINITIONS)) {
    const activityTypeNodes = bodyNode.getChild(ACTIVITY_TYPE_DEFINITIONS)?.getChildren(ACTIVITY_TYPE_GROUP) ?? [];

    return activityTypeNodes.map((group, i) => {
      let sequence = '';
      let sequenceName = 'sequence-' + i;
      const sequenceNameNode = group.getChild(ACTIVITY_TYPE_NAME);
      const seqGenNode = group.getChild(SEQGEN);
      const vcNode = group.getChild(VIRTUAL_CHANNEL);
      const onBoardFilenameNode = group.getChild(ON_BOARD_FILENAME);
      const onBoardFilePathNode = group.getChild(ON_BOARD_PATH);

      if (sequenceNameNode) {
        const name = text.slice(sequenceNameNode.from, sequenceNameNode.to);
        sequence += `## ${name}\n`;
        sequenceName = name.split('/').pop() || 'sequence-' + i;
      }

      sequence += parseParameters(group.getChild(PARAMETERS), 'INPUT_PARAMS', text);
      sequence += parseParameters(group.getChild(VARIABLES), 'LOCALS', text);

      if (vcNode) {
        sequence += `@METADATA "VIRTUAL_CHANNEL" "${text.slice(vcNode.from, vcNode.to)}" \n`;
      }
      if (onBoardFilenameNode) {
        sequence += `@METADATA "ON_BOARD_FILENAME" "${text.slice(onBoardFilenameNode.from, onBoardFilenameNode.to)}" \n`;
      }

      if (onBoardFilePathNode) {
        sequence += `@METADATA "ON_BOARD_PATH" "${text.slice(onBoardFilePathNode.from, onBoardFilePathNode.to)}" \n`;
      }
      if (seqGenNode) {
        sequence += `@METADATA "SEQGEN" "${text.slice(seqGenNode.from, seqGenNode.to)}" \n`;
      }

      sequence += parseSteps(group.getChild(STEPS), text);

      return { name: sequenceName, sequence };
    });
  }

  if (bodyNode.getChild(REQUESTS)) {
    const requestNodes = bodyNode.getChild(REQUESTS)?.getChildren(REQUEST) ?? [];

    return requestNodes.map((group, i) => {
      let sequence = '';

      const requestNameNode = group.getChild(REQUEST_NAME);
      const timeNode = group.getChild(TIME);
      const requestorNode = group.getChild(REQUESTOR);
      const processorNode = group.getChild(PROCESSOR);
      const keyNode = group.getChild(KEY);
      const sequenceName = requestNameNode ? text.slice(requestNameNode.from, requestNameNode.to) : 'sequence-' + i;
      sequence += `${timeNode ? `R${text.slice(timeNode.from, timeNode.to)} ` : 'C '}`;
      sequence += `@REQUEST_BEGIN("${sequenceName}")\n`;
      sequence += parseSteps(group.getChild(STEPS), text)
        .split('\n')
        .map(line => ' '.repeat(2) + line)
        .join('\n');
      sequence += `\n@REQUEST_END\n`;
      if (requestorNode) {
        sequence += `@METADATA("REQUESTOR":${text.slice(requestorNode.from, requestorNode.to)})\n`;
      }
      if (processorNode) {
        sequence += `@METADATA("PROCESSOR":${text.slice(processorNode.from, processorNode.to)})\n`;
      }
      if (keyNode) {
        sequence += `@METADATA("KEY":${text.slice(keyNode.from, keyNode.to)})\n`;
      }

      return { name: sequenceName, sequence };
    });
  }

  return [];
}

function parseParameters(
  parameterNode: SyntaxNode | null,
  variableType: 'INPUT_PARAMS' | 'LOCALS',
  text: string,
): string {
  if (!parameterNode) {
    return '';
  }
  const entries = parameterNode.getChildren(ENTRY);
  if (entries && entries.length > 0) {
    let parameter = `@${variableType}_BEGIN\n`;
    parameter += entries
      .map(param => {
        const nameNode = param.getChild(NAME);
        const typeNode = param.getChild(TYPE);
        const rangesNode = param.getChildren(RANGE);
        const enumNameNode = param.getChild(ENUM_NAME);

        const name = nameNode ? `${text.slice(nameNode.from, nameNode.to)}` : '';
        const enumName = enumNameNode ? ` ${text.slice(enumNameNode.from, enumNameNode.to)}` : '';
        let type = typeNode ? text.slice(typeNode.from, typeNode.to).trim() : '';
        switch (type) {
          case PARAM_UNSIGNED_DECIMAL:
            type = VAR_UINT;
            break;
          case PARAM_SIGNED_DECIMAL:
            type = VAR_INT;
            break;
          case PARAM_HEXADECIMAL:
          case PARAM_OCTAL:
          case PARAM_BINARY:
          case PARAM_TIME:
          case PARAM_DURATION:
          case PARAM_QUOTED_STRING:
            type = VAR_STRING;
            break;
          case PARAM_ENGINEERING:
            type = VAR_FLOAT;
            break;
          case VAR_STRING:
            {
              if (enumNameNode) {
                type = VAR_ENUM;
              } else {
                type = VAR_STRING;
              }
            }
            break;
          default:
            console.log(`type: ${type} is not supported`);
        }

        const allowableValues: string[] = [];
        const allowableRanges: string[] = [];
        rangesNode.forEach((range: any) => {
          text
            .slice(range.from, range.to)
            .split(',')
            .forEach(r => {
              r = r.replaceAll('"', '').trim();
              if (r.includes('...')) {
                allowableRanges.push(r);
              } else {
                allowableValues.push(r);
              }
            });
        });

        return `${name} ${type}${enumName}${allowableRanges.length === 0 ? (allowableValues.length === 0 ? '' : ' ""') : ` "${allowableRanges.join(', ')}"`}${allowableValues.length === 0 ? '' : ` "${allowableValues.join(', ')}"`}`;
      })
      .join('\n');
    parameter += `\n@${variableType}_END\n\n`;

    return parameter;
  }
  return '';
}

function parseSteps(stepNode: SyntaxNode | null, text: string): string {
  const step = '';
  if (!stepNode) {
    return step;
  }

  const commandNodes = stepNode.getChildren(COMMAND);

  return commandNodes
    .map(command => {
      const time = parseTimeNode(command.getChild(SCHEDULED_TIME), text);
      const stem = parseStem(command.getChild(STEM), text);
      const comment = parseComment(command.getChild(COMMENT), text);
      const args = parseArgsNode(command.getChild(ARGS), text);
      const models = parseModel(command.getChild(ASSUMED_MODEL_VALUES), text);
      return `${time} ${stem}${args.length > 0 ? ` ${args}` : ''}${comment.length > 0 ? ` ${comment}` : ''}${models.length > 0 ? `\n${models}` : ''}`;
    })
    .join('\n');
}

function parseTimeNode(timeNode: SyntaxNode | null, text: string): string {
  if (!timeNode) {
    return '';
  }

  const timeValueNode = timeNode.getChild(TIME);
  const timeTagNode = timeNode.getChild(TIME_RELATION);

  if (!timeTagNode || !timeValueNode) {
    return '';
  }

  const time = text.slice(timeValueNode.from, timeValueNode.to);
  const timeTag = text.slice(timeTagNode.from, timeTagNode.to);
  switch (timeTag.trim()) {
    case 'ABSOLUTE':
      return `A${time} `;
    case 'EPOCH':
      return `E${time} `;
    case 'FROM_PREVIOUS_START':
      return `R${time} `;
    case 'FROM_REQUEST_START':
    case 'FROM_ACTIVITY_START':
      return `B${time} `;
    case 'WAIT_PREVIOUS_END':
      return `C `;
    default:
      return 'error';
  }
}

function parseComment(commentNode: SyntaxNode | null, text: string): string {
  return commentNode
    ? `# ${text
        .slice(commentNode.from, commentNode.to)
        .split('\n')
        .map(line => line.trim())}` // flatten comment to one line SeqN doesn't support multi-line comments on a command
    : '';
}

function parseStem(stemNode: SyntaxNode | null, text: string): string {
  return stemNode ? text.slice(stemNode.from, stemNode.to) : '';
}

function parseArgsNode(argsNode: SyntaxNode | null, text: string): string {
  if (!argsNode) {
    return '';
  }
  let argNode = argsNode.firstChild;
  const args = [];
  while (argNode) {
    args.push(`${parseArgNode(argNode, text)}`);
    argNode = argNode?.nextSibling;
  }
  return args.join(' ');
}

function parseArgNode(argNode: SyntaxNode, text: string): string {
  if (!argNode) {
    return '';
  }
  const argValue = text.slice(argNode.from, argNode.to);

  switch (argNode.name) {
    case STRING:
      return `${argValue}`;
    case NUMBER:
      return `${argValue}`;
    case BOOLEAN:
      return `${argValue}`;
    case ENUM:
      return `${argValue}`;
    case GLOBAL:
      return `${argValue}`;
    case ARITHMETICAL:
      return `(${argValue})`;
    default: {
      console.log(`${argNode.name}: ${argValue} is not supported`);
      return 'Error';
    }
  }
}

function parseModel(modelNode: SyntaxNode | null, text: string): string {
  if (!modelNode) {
    return '';
  }
  const modelsNode = modelNode.getChildren(MODEL);
  return modelsNode
    .map(model => {
      const keyNode = model.getChild(KEY);
      const valueNode = model.getChild(VALUE);
      if (!keyNode || !valueNode) {
        return null;
      }
      return `@MODEL "${text.slice(keyNode.from, keyNode.to)}" ${text.slice(valueNode.from, valueNode.to)} "00:00:00"`;
    })
    .filter(model => model !== null)
    .join('\n');
}
