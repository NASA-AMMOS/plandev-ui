import type {
  EnumMap,
  FswCommandArgument,
  FswCommandArgumentNumeric,
  FswCommandArgumentRepeat,
  NumericRange,
} from '@nasa-jpl/aerie-ampcs';
import tsc, { SyntaxKind } from 'typescript';
import type { Diagnostic as ResponseDiagnostic } from '../types/monaco-internal';
import type { ErrorCode } from './customCodes';
import { CustomErrorCodes } from './customCodes';

type ValidationReturn = ErrorCode | false;

/**
 * Retrieves the source file data for a given file name using the provided language service.
 *
 * @param {string} fileName - The name of the source file.
 * @param {tsc.LanguageService} languageService - The TypeScript language service.
 * @returns {[tsc.SourceFile, tsc.SourceFile] | undefined} The source file data as a tuple of two source files, or `undefined` if the data cannot be obtained.
 */
export function getSourceFileData(
  fileName: string,
  languageService: tsc.LanguageService,
): [tsc.SourceFile, tsc.SourceFile] | undefined {
  const program = languageService.getProgram();
  if (program === undefined) {
    return undefined;
  }
  const typechecker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fileName);
  if (sourceFile === undefined) {
    return undefined;
  }

  const sourceFileSymbol = typechecker.getSymbolAtLocation(sourceFile)?.getDeclarations()?.[0] as
    | tsc.SourceFile
    | undefined;

  if (sourceFileSymbol === undefined) {
    return undefined;
  }

  return [sourceFile, sourceFileSymbol];
}

/**
 * Creates a list of all descents of the given node matching the selector, recursively
 *
 * @param node The tsc Node we want to use as our root
 * @param selector A selector function run on every recursive child Node
 * @returns A list of nodes matching the selector
 */
export function getDescendants(node: tsc.Node, selector: (node: tsc.Node) => boolean): tsc.Node[] {
  const selectedNodes = [];
  if (selector(node)) {
    selectedNodes.push(node);
  }
  for (const child of node.getChildren()) {
    selectedNodes.push(...getDescendants(child, selector));
  }
  return selectedNodes;
}

/**
 * Find the first parent (closest up the tree) from our node that matches the selector
 *
 * @param node The node to use as the root
 * @param selector A selector function which runs on every parent node
 * @returns The closest parent matching the selector or undefined if no match found
 */
export function getFirstInParent(node: tsc.Node, selector: (node: tsc.Node) => boolean): tsc.Node | undefined {
  if (selector(node)) {
    return node;
  }

  if (node.parent === undefined) {
    return undefined;
  } else {
    return getFirstInParent(node.parent, selector);
  }
}

/**
 * Retrieves the model name from the given file name, which matches the syntax of `.getModel()`
 * @note Only returns a model name for 'inmemory' models.
 */
export function getModelName(fileName: string): string | null {
  const regex = /^inmemory:\/\/model\/(\d*)$/;
  const found = fileName.match(regex);

  if (found !== null && found.length === 2) {
    const [, modelId] = found;
    return `$model${modelId}`;
  }

  return null;
}

/**
 * A helpful debugging function to figure out the SyntaxKind of all child nodes of some given node.
 *
 * @param node A node to start on
 * @returns A tuple [SyntaxKind, node_text]
 */
export function parentNodeKinds(node: tsc.Node): [string, string][] {
  if (node.parent === undefined) {
    return [];
  }
  return [...parentNodeKinds(node.parent), [SyntaxKind[node.kind], node.getText()]];
}

/**
 * Retrieves the kinds and corresponding texts of the child nodes for the given node.
 *
 * @param {tsc.Node} node - The parent node.
 * @returns {[string, string][]} An array of tuples representing the kinds and texts of the child nodes.
 */
export function childNodeKinds(node: tsc.Node): [string, string][] {
  const children = node.getChildren();

  return [[SyntaxKind[node.kind], node.getText()], ...children.flatMap(child_node => childNodeKinds(child_node))];
}

export function findNodeByValue(node: tsc.Node, arg_val: any): tsc.Node | undefined {
  let foundNode: tsc.Node | undefined;

  function traverseNode(childNode: tsc.Node) {
    if (childNode.getText() === arg_val) {
      foundNode = childNode;
      return;
    }

    tsc.forEachChild(childNode, traverseNode);
  }

  traverseNode(node);
  return foundNode;
}

/**
 * Finds the closest ancestor node of a specific kind for the given node.
 *
 * @param {tsc.Node} node - The starting node.
 * @param {SyntaxKind} kind - The desired kind of the ancestor node.
 * @returns {tsc.Node | undefined} The closest ancestor node of the specified kind, or `undefined` if not found.
 */
export function findNodeWithParentOfKind(node: tsc.Node, kind: SyntaxKind): tsc.Node | undefined {
  if (node.parent === undefined) {
    return undefined;
  }

  if (node.parent.kind === kind) {
    return node;
  }

  return findNodeWithParentOfKind(node.parent, kind);
}

/**
 * Finds the next child node of a specific kind that satisfies the provided filter function.
 *
 * @param {tsc.Node} node - The parent node.
 * @param {SyntaxKind} kind - The desired kind of the child node.
 * @param {(this_node: tsc.Node) => boolean} filter - The filter function to determine if a child node should be considered.
 * @returns {tsc.Node | undefined} The next child node of the specified kind that satisfies the filter function, or `undefined` if not found.
 */
export function findNextChildOfKind(
  node: tsc.Node,
  kind: SyntaxKind,
  filter: (this_node: tsc.Node) => boolean,
): tsc.Node | undefined {
  const children = node.getChildren();

  if (node.kind === kind) {
    return node;
  }

  if (children.length === 0) {
    return undefined;
  }

  return children
    .filter(child => filter(child))
    .map(child => findNextChildOfKind(child, kind, filter))
    .reverse()
    .find(child => child !== undefined);
}

/**
 * Removes quotation marks from the input string.
 *
 * @param {string} input - The string from which to remove quotation marks.
 * @returns {string} The input string without quotation marks.
 */
export function stripQuotes(input: string): string {
  return input.replaceAll(/["']/g, '');
}

/**
 * Zips two arrays into an array of tuples, pairing corresponding elements.
 *
 * @param {Array<A>} arr1 - The first array.
 * @param {B[]} arr2 - The second array.
 * @returns {[A, B][]} An array of tuples, pairing corresponding elements from the two input arrays.
 */
export function zip<A, B>(arr1: Array<A>, arr2: B[]): [A, B][] {
  return arr1.map((k, i) => [k, arr2[i]]);
}

/**
 * Creates a diagnostic object for a given error code, source file, and node.
 *
 * @param {ErrorCode} errorCode - The error code for the diagnostic.
 * @param {tsc.SourceFile} sourceFile - The source file where the error occurred.
 * @param {tsc.Node} arg - The node associated with the error.
 * @param {tsc.DiagnosticCategory} errorCategory - The DiagnosticCategory that should be used
 * @returns {ResponseDiagnostic} A diagnostic object representing the error.
 */
export function makeDiagnostic(
  errorCode: ErrorCode,
  sourceFile: tsc.SourceFile,
  arg: tsc.Node,
  errorCategory: tsc.DiagnosticCategory = tsc.DiagnosticCategory.Error,
): ResponseDiagnostic {
  return {
    category: errorCategory,
    code: errorCode.id,
    file: { fileName: sourceFile.fileName },
    length: arg.getEnd() - arg.getStart(sourceFile),
    messageText: errorCode.message,
    start: arg.getStart(sourceFile),
  };
}

/**
 * Checks if a string represents a valid numeric value (not NAN or anything weird)
 *
 * @param {string} str - The string to validate.
 * @param {string} name - Command arg name
 * @returns {ValidationReturn} Either a custom error code or `false` indicating a valid numeric value.
 */
function isNumeric(name: string, str: string): ValidationReturn {
  // Both are needed: https://stackoverflow.com/a/175787
  return isNaN(Number(str)) || isNaN(parseFloat(str)) ? CustomErrorCodes.InvalidNumber(name, str) : false;
}

/**
 * Performs range validation on a numeric value.
 * @param {string} name - Command arg name
 * @param {number} value - The value to validate.
 * @param {NumericRange | null} range - The range to validate against. If null, the validation is ignored.
 * @returns {ValidationReturn} Either a custom error code or `false` indicating a valid value within the range.
 */
function rangeValidation(name: string, value: number, range: NumericRange | null): ValidationReturn {
  // If range is null, ignore
  return range !== null && (value > range.max || value < range.min)
    ? CustomErrorCodes.InvalidRange(name, value, range.min, range.max)
    : false;
}

/**
 * Validates a float value against a numeric range.
 *
 * @param {string} value - The float value to validate.
 * @param {string} name - Command arg name
 * @param {NumericRange | null} range - The range to validate against. If null, the range validation is ignored.
 * @returns {ValidationReturn} Either a custom error code or `false` indicating a valid float value within the range.
 */
function validateFloat(value: string, name: string, range: NumericRange | null): ValidationReturn {
  let error_string: ValidationReturn;

  if ((error_string = isNumeric(name, value)) !== false) {
    return error_string;
  }
  if ((error_string = rangeValidation(name, Number(value), range)) !== false) {
    return error_string;
  }

  return false;
}

/**
 * Validates an integer value against a numeric range.
 *
 * @param {string} value - The integer value to validate.
 * @param {string} name - Command arg name
 * @param {NumericRange | null} range - The range to validate against. If null, the range validation is ignored.
 * @returns {ValidationReturn} Either a custom error code or `false` indicating a valid integer value within the range.
 */
function validateInteger(value: string, name: string, range: NumericRange | null): ValidationReturn {
  // The mod 1 thing asserts an integer
  let error_string: ValidationReturn;

  if ((error_string = validateFloat(value, name, range)) !== false) {
    return error_string;
  }
  if (Number(value) % 1 !== 0) {
    return CustomErrorCodes.InvalidInteger(name, value);
  }

  return false;
}

/**
 * Validates an unsigned integer value against a numeric range.
 *
 * @param {string} value - The unsigned integer value to validate.
 * @param {string} name - command arg name
 * @param {NumericRange | null} range - The range to validate against. If null, the range validation is ignored.
 * @returns {ValidationReturn} Either a custom error code or `false` indicating a valid unsigned integer value within the range.
 */
function validateUnsigned(value: string, name: string, range: NumericRange | null): ValidationReturn {
  // The mod 1 thing asserts an integer
  let error_string: ValidationReturn;

  if ((error_string = validateInteger(value, name, range)) !== false) {
    return error_string;
  }
  if (Number(value) < 0) {
    return CustomErrorCodes.InvalidUnsignedInteger(name, value);
  }
  return false;
}

/**
 * Validates a numeric value based on the expectation type.
 *
 * @param {string} value - The numeric value to validate.
 * @param {string} name - command arg name
 * @param {FswCommandArgumentNumeric} expectation - The expectation object defining the type and range.
 * @returns {ValidationReturn} Either a custom error code or `false` indicating a valid numeric value based on the expectation type.
 */
function validateNumeric(value: string, name: string, expectation: FswCommandArgumentNumeric): ValidationReturn {
  switch (expectation.type) {
    case 'float':
      return validateFloat(value, name, expectation.range);
    case 'integer':
      return validateInteger(value, name, expectation.range);
    case 'unsigned':
      return validateUnsigned(value, name, expectation.range);
  }
}

/**
 * Validates a value against an enumeration of options.
 *
 * @param {string} value - The value to validate.
 * @param {string} name - command arg name
 * @param {string[] | null} options - The array of options to validate against. If null, the validation is ignored.
 * @returns {ValidationReturn} Either a custom error code or `false` indicating a valid value within the enumeration.
 */
function validateEnum(value: string, name: string, options: string[] | null): ValidationReturn {
  return options !== null && !options.includes(value)
    ? CustomErrorCodes.InvalidEnum(name, value, JSON.stringify(options))
    : false;
}

/**
 * Validates the repeat count of a value based on the expected argument configuration.
 *
 * @param {string} value - The value to validate.
 * @param {FswCommandArgumentRepeat} expected_argument - The expected argument configuration defining the repeat count constraints.
 * @returns {ValidationReturn} Either a custom error code or `false` indicating a valid repeat count.
 */
function validateRepeat(value: string, expected_argument: FswCommandArgumentRepeat): ValidationReturn {
  // no range info, ignore check
  if (expected_argument?.repeat?.min === undefined && expected_argument?.repeat?.max === undefined) {
    return false;
  }

  const numberOfRepeats = (JSON.parse(value) as any[]).length;
  const min = expected_argument.repeat.min ? expected_argument.repeat.min : 0;
  const max = expected_argument.repeat.max ? expected_argument.repeat.max : Infinity;

  return numberOfRepeats < min || numberOfRepeats > max
    ? CustomErrorCodes.InvalidArgumentCount(expected_argument.name, numberOfRepeats, min, max)
    : false;
}

/**
 * Validates discovered arguments against the expected argument map and enum map.
 *
 * @param {tsc.Node} argumentNode - The TS arguments node.
 * @param {string} arg_val - The argument value contained n the TS Node.
 * @param {FswCommandArgument} expected_argument - The FSW Command to check against.
 * @param {EnumMap} enumMap - The map of enums.
 * @param {tsc.SourceFile} sourceFile - The source file where the arguments are discovered.
 * @returns {ResponseDiagnostic | false} A response diagnostics representing any validation errors or false if no errors are found.
 */
// NOTE: Does not check bit length, only range right now!
export function validateArguments(
  argumentNode: tsc.Node,
  arg_val: string,
  expected_argument: FswCommandArgument,
  enumMap: EnumMap,
  sourceFile: tsc.SourceFile,
): ResponseDiagnostic | false {
  // ignore specific eDSL local and parameter values
  if (arg_val.startsWith('locals.') || arg_val.startsWith('parameters.')) {
    return false;
  }

  let validation_resp: ValidationReturn;

  switch (expected_argument.arg_type) {
    case 'integer':
      if ((validation_resp = validateInteger(arg_val, expected_argument.name, expected_argument.range)) !== false) {
        return makeDiagnostic(validation_resp, sourceFile, argumentNode);
      }
      break;
    case 'unsigned':
      if ((validation_resp = validateUnsigned(arg_val, expected_argument.name, expected_argument.range)) !== false) {
        return makeDiagnostic(validation_resp, sourceFile, argumentNode);
      }
      break;
    case 'float':
      if ((validation_resp = validateFloat(arg_val, expected_argument.name, expected_argument.range)) !== false) {
        return makeDiagnostic(validation_resp, sourceFile, argumentNode);
      }
      break;
    case 'numeric':
      if ((validation_resp = validateNumeric(arg_val, expected_argument.name, expected_argument)) !== false) {
        return makeDiagnostic(validation_resp, sourceFile, argumentNode);
      }
      break;
    case 'boolean':
      // No check required, the type system will assert this for us
      break;
    case 'enum': {
      // Defined flexibly because some things need to pull from the top level of the command dict
      const enum_options =
        expected_argument.range ?? enumMap[expected_argument.enum_name].values.map(value => value.symbol);
      if ((validation_resp = validateEnum(arg_val, expected_argument.name, enum_options)) !== false) {
        return makeDiagnostic(validation_resp, sourceFile, argumentNode);
      }
      break;
    }
    case 'repeat':
      if ((validation_resp = validateRepeat(arg_val, expected_argument)) !== false) {
        return makeDiagnostic(validation_resp, sourceFile, argumentNode);
      }
      break;
    case 'time':
      expected_argument.units;
      break;
    case 'var_string':
      expected_argument.valid_regex;
      break;
    case 'fill':
      expected_argument.arg_type;
      break;
    case 'fixed_string':
      expected_argument.arg_type;
  }

  return false;
}
