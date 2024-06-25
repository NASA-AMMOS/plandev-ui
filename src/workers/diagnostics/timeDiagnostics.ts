import tsc from 'typescript';
import { TimeTypes } from '../../enums/time';
import type { Diagnostic as ResponseDiagnostic } from '../../types/monaco-internal';
import {
  getBalancedDuration,
  getDoyTime,
  getUnixEpochTime,
  isTimeBalanced,
  isTimeMax,
  parseDurationString,
  validateTime,
} from '../../utilities/time';
import { CustomErrorCodes } from '../customCodes';
import { getDescendants, makeDiagnostic } from '../workerHelpers';
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

  const processTimeNodes = (timeNodes: tsc.Node[], type: TimeTypes) => {
    for (const timeNode of timeNodes) {
      if (tsc.isTaggedTemplateExpression(timeNode)) {
        if (tsc.isNoSubstitutionTemplateLiteral(timeNode.template)) {
          if (!validateTime(timeNode.template.text, type)) {
            diagnostics.push(
              makeDiagnostic(
                type === TimeTypes.EPOCH ? CustomErrorCodes.InvalidEpochTime() : CustomErrorCodes.InvalidRelativeTime(),
                sourceFile,
                timeNode,
              ),
            );
          } else {
            if (isTimeMax(timeNode.template.text, type)) {
              diagnostics.push(
                makeDiagnostic(
                  type === TimeTypes.EPOCH
                    ? CustomErrorCodes.MaxEpochTime(parseDurationString(timeNode.template.text, 'seconds').isNegative)
                    : CustomErrorCodes.MaxRelativeTime(),
                  sourceFile,
                  timeNode,
                ),
              );
            } else if (!isTimeBalanced(timeNode.template.text, type)) {
              diagnostics.push(
                makeDiagnostic(
                  CustomErrorCodes.UnbalancedTime(getBalancedDuration(timeNode.template.text)),
                  sourceFile,
                  timeNode,
                  tsc.DiagnosticCategory.Warning,
                ),
              );
            }
          }
        }
      } else if (tsc.isCallExpression(timeNode)) {
        const firstArg = timeNode.arguments[0];
        if (tsc.isStringLiteral(firstArg) || tsc.isNoSubstitutionTemplateLiteral(firstArg)) {
          if (!validateTime(firstArg.text, type)) {
            diagnostics.push(
              makeDiagnostic(
                type === TimeTypes.EPOCH ? CustomErrorCodes.InvalidEpochTime() : CustomErrorCodes.InvalidRelativeTime(),
                sourceFile,
                timeNode,
              ),
            );
          } else {
            if (isTimeMax(firstArg.text, type)) {
              diagnostics.push(
                makeDiagnostic(
                  type === TimeTypes.EPOCH
                    ? CustomErrorCodes.MaxEpochTime(parseDurationString(firstArg.text, 'seconds').isNegative)
                    : CustomErrorCodes.MaxRelativeTime(),
                  sourceFile,
                  timeNode,
                ),
              );
            } else if (!isTimeBalanced(firstArg.text, type)) {
              diagnostics.push(
                makeDiagnostic(
                  CustomErrorCodes.UnbalancedTime(getBalancedDuration(firstArg.text)),
                  sourceFile,
                  timeNode,
                  tsc.DiagnosticCategory.Warning,
                ),
              );
            }
          }
        }
      }
    }
  };

  processTimeNodes(
    getDescendants(
      sourceFileSymbol,
      node =>
        tsc.isIdentifier(node) &&
        node.escapedText === 'R' &&
        (tsc.isTaggedTemplateExpression(node.parent) || tsc.isCallExpression(node.parent)),
    ).map(node => node.parent),
    TimeTypes.RELATIVE,
  );

  processTimeNodes(
    getDescendants(
      sourceFileSymbol,
      node =>
        tsc.isIdentifier(node) &&
        node.escapedText === 'E' &&
        (tsc.isTaggedTemplateExpression(node.parent) || tsc.isCallExpression(node.parent)),
    ).map(node => node.parent),
    TimeTypes.EPOCH,
  );

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
        if (!validateTime(absoluteTimeNode.template.text, TimeTypes.ABSOLUTE)) {
          diagnostics.push(makeDiagnostic(CustomErrorCodes.InvalidAbsoluteTime(), sourceFile, absoluteTimeNode));
        } else {
          if (isTimeMax(absoluteTimeNode.template.text, TimeTypes.ABSOLUTE)) {
            diagnostics.push(makeDiagnostic(CustomErrorCodes.MaxAbsoluteTime(), sourceFile, absoluteTimeNode));
          } else if (!isTimeBalanced(absoluteTimeNode.template.text, TimeTypes.ABSOLUTE)) {
            diagnostics.push(
              makeDiagnostic(
                CustomErrorCodes.UnbalancedTime(getDoyTime(new Date(getUnixEpochTime(absoluteTimeNode.template.text)))),
                sourceFile,
                absoluteTimeNode,
                tsc.DiagnosticCategory.Warning,
              ),
            );
          }
        }
      }
    } else if (tsc.isCallExpression(absoluteTimeNode)) {
      const firstArg = absoluteTimeNode.arguments[0];
      if (tsc.isStringLiteral(firstArg) || tsc.isNoSubstitutionTemplateLiteral(firstArg)) {
        if (!validateTime(firstArg.text, TimeTypes.ABSOLUTE)) {
          diagnostics.push(makeDiagnostic(CustomErrorCodes.InvalidAbsoluteTime(), sourceFile, absoluteTimeNode));
        } else {
          if (isTimeMax(firstArg.text, TimeTypes.ABSOLUTE)) {
            diagnostics.push(makeDiagnostic(CustomErrorCodes.MaxAbsoluteTime(), sourceFile, absoluteTimeNode));
          } else if (!isTimeBalanced(firstArg.text, TimeTypes.ABSOLUTE)) {
            diagnostics.push(
              makeDiagnostic(
                CustomErrorCodes.UnbalancedTime(getDoyTime(new Date(getUnixEpochTime(firstArg.text)))),
                sourceFile,
                absoluteTimeNode,
                tsc.DiagnosticCategory.Warning,
              ),
            );
          }
        }
      }
    }
  }

  return diagnostics;
}
