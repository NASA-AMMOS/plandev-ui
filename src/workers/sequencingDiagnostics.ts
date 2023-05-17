import tsc from 'typescript';
import type { Diagnostic as ResponseDiagnostic } from '../types/monaco-internal';

enum CustomCodes {
  InvalidAbsoluteTimeString = -1,
  InvalidRelativeTimeString = -2,
}

export function generateDiagnostics(fileName: string, languageService: tsc.LanguageService): ResponseDiagnostic[] {
  return [
    ...generateRelativeTimeStringDiagnostics(fileName, languageService),
    ...generateAbsoluteTimeStringDiagnostics(fileName, languageService),
  ];
}

/**
 * Creates a list of all descents of the given node matching the selector, recursively
 * @param node The tsc Node we want to use as our root
 * @param selector A selector function run on every recursive child Node
 * @returns A list of nodes matching the selector
 */
function getDescendants(node: tsc.Node, selector: (node: tsc.Node) => boolean): tsc.Node[] {
  const selectedNodes = [];
  if (selector(node)) {
    selectedNodes.push(node);
  }
  for (const child of node.getChildren()) {
    selectedNodes.push(...getDescendants(child, selector));
  }
  return selectedNodes;
}

const DOY_REGEX = /^(\d{4})-(\d{3})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;
const HMS_REGEX = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;

function generateRelativeTimeStringDiagnostics(
  fileName: string,
  languageService: tsc.LanguageService,
): ResponseDiagnostic[] {
  const diagnostics: ResponseDiagnostic[] = [];

  const program = languageService.getProgram();
  if (program === undefined) {
    return [];
  }
  const typechecker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fileName);
  if (sourceFile === undefined) {
    return [];
  }
  const sourceFileSymbol = typechecker.getSymbolAtLocation(sourceFile)?.getDeclarations()?.[0] as
    | tsc.SourceFile
    | undefined;

  if (sourceFileSymbol === undefined) {
    return [];
  }

  const relativeTimeNodes = getDescendants(
    sourceFileSymbol,
    node =>
      tsc.isIdentifier(node) &&
      (node.escapedText === 'E' || node.escapedText === 'R') &&
      (tsc.isTaggedTemplateExpression(node.parent) || tsc.isCallExpression(node.parent)),
  ).map(node => node.parent);

  for (const relativeTimeNode of relativeTimeNodes) {
    if (tsc.isTaggedTemplateExpression(relativeTimeNode)) {
      if (tsc.isNoSubstitutionTemplateLiteral(relativeTimeNode.template)) {
        if (!HMS_REGEX.test(relativeTimeNode.template.text)) {
          diagnostics.push({
            category: tsc.DiagnosticCategory.Error,
            code: CustomCodes.InvalidRelativeTimeString,
            file: { fileName: sourceFile.fileName },
            length: relativeTimeNode.template.getEnd() - relativeTimeNode.template.getStart(sourceFile),
            messageText: `Incorrectly formatted relative time string. Expected format: hh:mm:ss[.sss]`,
            start: relativeTimeNode.template.getStart(sourceFile),
          });
        }
      }
    } else if (tsc.isCallExpression(relativeTimeNode)) {
      const firstArg = relativeTimeNode.arguments[0];
      if (tsc.isStringLiteral(firstArg) || tsc.isNoSubstitutionTemplateLiteral(firstArg)) {
        if (!HMS_REGEX.test(firstArg.text)) {
          diagnostics.push({
            category: tsc.DiagnosticCategory.Error,
            code: CustomCodes.InvalidRelativeTimeString,
            file: { fileName: sourceFile.fileName },
            length: firstArg.getEnd() - firstArg.getStart(sourceFile),
            messageText: `Incorrectly formatted relative time string. Expected format: hh:mm:ss[.sss]`,
            start: firstArg.getStart(sourceFile),
          });
        }
      }
    }
  }

  return diagnostics;
}

function generateAbsoluteTimeStringDiagnostics(
  fileName: string,
  languageService: tsc.LanguageService,
): ResponseDiagnostic[] {
  const diagnostics: ResponseDiagnostic[] = [];

  const program = languageService.getProgram();
  if (program === undefined) {
    return [];
  }
  const typechecker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fileName);
  if (sourceFile === undefined) {
    return [];
  }
  const sourceFileSymbol = typechecker.getSymbolAtLocation(sourceFile)?.getDeclarations()?.[0] as
    | tsc.SourceFile
    | undefined;

  if (sourceFileSymbol === undefined) {
    return [];
  }

  const absoluteTimeNodes = getDescendants(
    sourceFileSymbol,
    node =>
      tsc.isIdentifier(node) &&
      node.escapedText === 'A' &&
      (tsc.isTaggedTemplateExpression(node.parent) || tsc.isCallExpression(node.parent)),
  ).map(node => node.parent);

  for (const absoluteTimeNode of absoluteTimeNodes) {
    if (tsc.isTaggedTemplateExpression(absoluteTimeNode)) {
      if (tsc.isNoSubstitutionTemplateLiteral(absoluteTimeNode.template)) {
        if (!DOY_REGEX.test(absoluteTimeNode.template.text)) {
          diagnostics.push({
            category: tsc.DiagnosticCategory.Error,
            code: CustomCodes.InvalidAbsoluteTimeString,
            file: { fileName: sourceFile.fileName },
            length: absoluteTimeNode.template.getEnd() - absoluteTimeNode.template.getStart(sourceFile),
            messageText: `Incorrectly formatted absolute time string. Expected format: YYYY-DOYThh:mm:ss[.sss]`,
            start: absoluteTimeNode.template.getStart(sourceFile),
          });
        }
      }
    } else if (tsc.isCallExpression(absoluteTimeNode)) {
      const firstArg = absoluteTimeNode.arguments[0];
      if (tsc.isStringLiteral(firstArg) || tsc.isNoSubstitutionTemplateLiteral(firstArg)) {
        if (!DOY_REGEX.test(firstArg.text)) {
          diagnostics.push({
            category: tsc.DiagnosticCategory.Error,
            code: CustomCodes.InvalidAbsoluteTimeString,
            file: { fileName: sourceFile.fileName },
            length: firstArg.getEnd() - firstArg.getStart(sourceFile),
            messageText: `Incorrectly formatted absolute time string. Expected format: YYYY-DOYThh:mm:ss[.sss]`,
            start: firstArg.getStart(sourceFile),
          });
        }
      }
    }
  }

  return diagnostics;
}
