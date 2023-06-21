import tsc from 'typescript';
import type { Diagnostic as ResponseDiagnostic } from '../../types/monaco-internal';
import { CustomErrorCodes } from '../customCodes';
import { getDescendants, makeDiagnostic } from '../workerHelpers';

const DOY_REGEX = /^(\d{4})-(\d{3})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;
const HMS_REGEX = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;

/**
 * Generates sequencing diagnostics for a given file using the provided language service.
 * @param {string} fileName - The name of the file to generate diagnostics for.
 * @param {tsc.LanguageService} languageService - The language service to use for generating diagnostics.
 * @returns {ResponseDiagnostic[]} - An array of response diagnostics representing sequencing errors.
 */
export function generateTimeDiagnostics(fileName: string, languageService: tsc.LanguageService): ResponseDiagnostic[] {
  return [
    ...generateRelativeTimeStringDiagnostics(fileName, languageService),
    ...generateAbsoluteTimeStringDiagnostics(fileName, languageService),
  ];
}

/**
 * Generates sequencing diagnostics for relative time hh:mm:ss[.sss] in a given file.
 * @param {string} fileName - The name of the file to generate diagnostics for.
 * @param {tsc.LanguageService} languageService - The language service to use for generating diagnostics.
 * @returns {ResponseDiagnostic[]} - An array of response diagnostics representing sequencing errors related to relative time strings.
 */
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
          diagnostics.push(makeDiagnostic(CustomErrorCodes.InvalidRelativeTime(), sourceFile, relativeTimeNode));
        }
      }
    } else if (tsc.isCallExpression(relativeTimeNode)) {
      const firstArg = relativeTimeNode.arguments[0];
      if (tsc.isStringLiteral(firstArg) || tsc.isNoSubstitutionTemplateLiteral(firstArg)) {
        if (!HMS_REGEX.test(firstArg.text)) {
          diagnostics.push(makeDiagnostic(CustomErrorCodes.InvalidRelativeTime(), sourceFile, relativeTimeNode));
        }
      }
    }
  }

  return diagnostics;
}

/**
 * Generates sequencing diagnostics for absolute time YYYY-DOYThh:mm:ss[.sss] in a given file.
 * @param {string} fileName - The name of the file to generate diagnostics for.
 * @param {tsc.LanguageService} languageService - The language service to use for generating diagnostics.
 * @returns {ResponseDiagnostic[]} - An array of response diagnostics representing sequencing errors related to absolute time strings.
 */
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
          diagnostics.push(makeDiagnostic(CustomErrorCodes.InvalidAbsoluteTime(), sourceFile, absoluteTimeNode));
        }
      }
    } else if (tsc.isCallExpression(absoluteTimeNode)) {
      const firstArg = absoluteTimeNode.arguments[0];
      if (tsc.isStringLiteral(firstArg) || tsc.isNoSubstitutionTemplateLiteral(firstArg)) {
        if (!DOY_REGEX.test(firstArg.text)) {
          diagnostics.push(makeDiagnostic(CustomErrorCodes.InvalidAbsoluteTime(), sourceFile, absoluteTimeNode));
        }
      }
    }
  }

  return diagnostics;
}
