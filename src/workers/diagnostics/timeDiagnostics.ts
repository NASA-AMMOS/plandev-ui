import tsc from 'typescript';
import type { Diagnostic as ResponseDiagnostic } from '../../types/monaco-internal';
import type { ErrorCode } from '../customCodes';
import { CustomErrorCodes } from '../customCodes';
import { getDescendants, makeDiagnostic } from '../workerHelpers';

const DOY_REGEX = /^(\d{4})-(\d{3})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;
const HMS_RELATIVE_REGEX = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;
const HMS_EPOCH_REGEX = /^([-+])?(\d{3}T)?(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;
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

  const processTimeNodes = (timeNodes: tsc.Node[], regex: RegExp, errorCode: ErrorCode) => {
    for (const timeNode of timeNodes) {
      if (tsc.isTaggedTemplateExpression(timeNode)) {
        if (tsc.isNoSubstitutionTemplateLiteral(timeNode.template)) {
          if (!regex.test(timeNode.template.text)) {
            diagnostics.push(makeDiagnostic(errorCode, sourceFile, timeNode));
          } else {
            const balanced = isTimeBalanced(timeNode.template.text, regex);
            if (balanced.error) {
              diagnostics.push(makeDiagnostic(balanced.error, sourceFile, timeNode, tsc.DiagnosticCategory.Error));
            }
            if (balanced.warning) {
              diagnostics.push(makeDiagnostic(balanced.warning, sourceFile, timeNode, tsc.DiagnosticCategory.Warning));
            }
          }
        }
      } else if (tsc.isCallExpression(timeNode)) {
        const firstArg = timeNode.arguments[0];
        if (tsc.isStringLiteral(firstArg) || tsc.isNoSubstitutionTemplateLiteral(firstArg)) {
          if (!regex.test(firstArg.text)) {
            diagnostics.push(makeDiagnostic(errorCode, sourceFile, timeNode));
          } else {
            const balanced = isTimeBalanced(firstArg.text, regex);
            if (balanced.error) {
              diagnostics.push(makeDiagnostic(balanced.error, sourceFile, timeNode, tsc.DiagnosticCategory.Error));
            }
            if (balanced.warning) {
              diagnostics.push(makeDiagnostic(balanced.warning, sourceFile, timeNode, tsc.DiagnosticCategory.Warning));
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
    HMS_RELATIVE_REGEX,
    CustomErrorCodes.InvalidRelativeTime(),
  );

  processTimeNodes(
    getDescendants(
      sourceFileSymbol,
      node =>
        tsc.isIdentifier(node) &&
        node.escapedText === 'E' &&
        (tsc.isTaggedTemplateExpression(node.parent) || tsc.isCallExpression(node.parent)),
    ).map(node => node.parent),
    HMS_EPOCH_REGEX,
    CustomErrorCodes.InvalidEpochTime(),
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
        if (!DOY_REGEX.test(absoluteTimeNode.template.text)) {
          diagnostics.push(makeDiagnostic(CustomErrorCodes.InvalidAbsoluteTime(), sourceFile, absoluteTimeNode));
        } else {
          const balanced = isTimeBalanced(absoluteTimeNode.template.text, DOY_REGEX);
          if (balanced.error) {
            diagnostics.push(
              makeDiagnostic(balanced.error, sourceFile, absoluteTimeNode, tsc.DiagnosticCategory.Error),
            );
          }
          if (balanced.warning) {
            diagnostics.push(
              makeDiagnostic(balanced.warning, sourceFile, absoluteTimeNode, tsc.DiagnosticCategory.Warning),
            );
          }
        }
      }
    } else if (tsc.isCallExpression(absoluteTimeNode)) {
      const firstArg = absoluteTimeNode.arguments[0];
      if (tsc.isStringLiteral(firstArg) || tsc.isNoSubstitutionTemplateLiteral(firstArg)) {
        if (!DOY_REGEX.test(firstArg.text)) {
          diagnostics.push(makeDiagnostic(CustomErrorCodes.InvalidAbsoluteTime(), sourceFile, absoluteTimeNode));
        } else {
          const balanced = isTimeBalanced(firstArg.text, DOY_REGEX);
          if (balanced.error) {
            diagnostics.push(
              makeDiagnostic(balanced.error, sourceFile, absoluteTimeNode, tsc.DiagnosticCategory.Error),
            );
          }
          if (balanced.warning) {
            diagnostics.push(
              makeDiagnostic(balanced.warning, sourceFile, absoluteTimeNode, tsc.DiagnosticCategory.Warning),
            );
          }
        }
      }
    }
  }

  return diagnostics;
}

function isTimeBalanced(
  time: string,
  regex: RegExp,
): { error?: ErrorCode | undefined; warning?: ErrorCode | undefined } {
  const { years, days, hours, minutes, seconds, milliseconds } = extractTime(time, regex);

  if (regex === DOY_REGEX && years && days) {
    const isUnbalanced =
      (years >= 0 &&
        years <= 9999 &&
        days >= 0 &&
        days <= (isLeapYear(years) ? 366 : 365) &&
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59 &&
        seconds >= 0 &&
        seconds <= 59) === false;

    if (isUnbalanced) {
      return balanceAbsolute(years, days, hours, minutes, seconds, milliseconds);
    }
  } else {
    const isUnbalanced =
      (days !== undefined
        ? days >= 1 &&
          days <= 365 &&
          hours >= 0 &&
          hours <= 23 &&
          minutes >= 0 &&
          minutes <= 59 &&
          seconds >= 0 &&
          seconds <= 59
        : hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) === false;

    if (isUnbalanced) {
      return balanceDuration(days ?? 0, hours, minutes, seconds, milliseconds, regex);
    }
  }

  return {};
}

function extractTime(
  duration: string,
  regex: RegExp,
): {
  days?: number;
  hours: number;
  milliseconds: number;
  minutes: number;
  seconds: number;
  years?: number;
} {
  const matches = duration.match(regex);

  if (!matches) {
    return { hours: 0, milliseconds: 0, minutes: 0, seconds: 0 };
  }

  if (regex.source === DOY_REGEX.source) {
    const [, years = '0', days = '0', hours = '0', minutes = '0', seconds = '0', milliseconds = '0'] = matches;
    const [yearsNum, daysNum, hoursNum, minuteNum, secondsNum, millisecondNum] = [
      years,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
    ].map(Number);
    return {
      days: daysNum,
      hours: hoursNum,
      milliseconds: millisecondNum,
      minutes: minuteNum,
      seconds: secondsNum,
      years: yearsNum,
    };
  }
  if (regex.source === HMS_EPOCH_REGEX.source) {
    const [, , days = undefined, hours = '0', minutes = '0', seconds = '0', milliseconds = '0'] = matches;
    const [hoursNum, minuteNum, secondsNum, millisecondNum] = [hours, minutes, seconds, milliseconds].map(Number);
    const daysNum = days !== undefined ? Number(days.replace('T', '')) : days;
    return {
      days: daysNum,
      hours: hoursNum,
      milliseconds: millisecondNum,
      minutes: minuteNum,
      seconds: secondsNum,
    };
  } else if (regex.source === HMS_RELATIVE_REGEX.source) {
    const [, hours = '0', minutes = '0', seconds = '0', milliseconds = '0'] = matches;
    const [hoursNum, minuteNum, secondsNum, millisecondNum] = [hours, minutes, seconds, milliseconds].map(Number);
    return {
      hours: hoursNum,
      milliseconds: millisecondNum,
      minutes: minuteNum,
      seconds: secondsNum,
    };
  }

  return { hours: 0, milliseconds: 0, minutes: 0, seconds: 0 };
}

function balanceDuration(
  unbalanceDays: number,
  unbalancedHours: number,
  unbalanceMinutes: number,
  unbalanceSeconds: number,
  unbalanceMilliseconds: number,
  regex: RegExp,
): { error?: ErrorCode | undefined; warning?: ErrorCode | undefined } {
  const { days, hours, minutes, seconds, milliseconds } = normalizeTime(
    unbalanceDays,
    unbalancedHours,
    unbalanceMinutes,
    unbalanceSeconds,
    unbalanceMilliseconds,
  );

  const DD = days !== 0 ? `${formatNumber(days, 3)}T` : '';
  const HH = days !== 0 ? formatNumber(hours, 2) : formatNumber(hours, 2);
  const MM = formatNumber(minutes, 2);
  const SS = formatNumber(seconds, 2);
  const sss = formatNumber(milliseconds, 3);

  const balancedTime = `${DD}${HH}:${MM}:${SS}.${sss}`;

  if (regex.source === HMS_EPOCH_REGEX.source) {
    if (days > 365) {
      return { error: CustomErrorCodes.MaxEpochTime(balancedTime) };
    } else {
      return { warning: CustomErrorCodes.UnbalancedTime(`E\`${balancedTime}\``) };
    }
  }

  if (regex.source === HMS_RELATIVE_REGEX.source) {
    if (days !== 0) {
      return { error: CustomErrorCodes.MaxRelativeTime(balancedTime) };
    }
    return { warning: CustomErrorCodes.UnbalancedTime(`R\`${balancedTime}\``) };
  }
  return { error: undefined, warning: undefined };
}

function balanceAbsolute(
  unbalanceYears: number,
  unbalanceDays: number,
  unbalancedHours: number,
  unbalanceMinutes: number,
  unbalanceSeconds: number,
  unbalanceMilliseconds: number,
): { error?: ErrorCode | undefined; warning?: ErrorCode | undefined } {
  const { years, days, hours, minutes, seconds, milliseconds } = normalizeTime(
    unbalanceDays,
    unbalancedHours,
    unbalanceMinutes,
    unbalanceSeconds,
    unbalanceMilliseconds,
    unbalanceYears,
  );

  const YY = years !== 0 && years !== undefined ? `${formatNumber(years, 4)}-` : '';
  const DD = days !== 0 ? `${formatNumber(days, 3)}T` : '';
  const HH = days !== 0 ? formatNumber(hours, 2) : formatNumber(hours, 2);
  const MM = formatNumber(minutes, 2);
  const SS = formatNumber(seconds, 2);
  const sss = formatNumber(milliseconds, 3);

  const balancedTime = `${YY}${DD}${HH}:${MM}:${SS}.${sss}`;

  if (years && years > 9999) {
    return { error: CustomErrorCodes.MaxAbsoluteTime(balancedTime) };
  }

  return { warning: CustomErrorCodes.UnbalancedTime(balancedTime) };
}

function normalizeTime(
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
  years?: number,
): { days: number; hours: number; milliseconds: number; minutes: number; seconds: number; years?: number } {
  // Normalize milliseconds and seconds
  seconds += Math.floor(milliseconds / 1000);
  milliseconds = milliseconds % 1000;

  // Normalize seconds and minutes
  minutes += Math.floor(seconds / 60);
  seconds = seconds % 60;

  // Normalize minutes and hours
  hours += Math.floor(minutes / 60);
  minutes = minutes % 60;

  // Normalize hours and days
  days += Math.floor(hours / 24);
  hours = hours % 24;

  // Normalize days and years
  if (years) {
    const isLY = isLeapYear(years);
    years += Math.floor(days / (isLY ? 366 : 365));
    days = days % (isLY ? 366 : 365);
  }

  // Return the normalized values
  return { days, hours, milliseconds, minutes, seconds, years };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function formatNumber(number: number, size: number): string {
  const isNegative = number < 0;
  const absoluteNumber = Math.abs(number).toString();
  const formattedNumber = absoluteNumber.padStart(size, '0');
  return isNegative ? `-${formattedNumber}` : formattedNumber;
}
