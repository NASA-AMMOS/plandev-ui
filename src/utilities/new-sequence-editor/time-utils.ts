export const ABSOLUTE_TIME = /^(\d{4})-(\d{3})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/g;

export const RELATIVE_TIME = /([0-9]{3}T)?([0-9]{2}):([0-9]{2}):([0-9]{2})(\.[0-9]+)?$/g;
export const RELATIVE_SIMPLE = /(\d+)(\.[0-9]+)?$/g;

export const EPOCH_TIME = /(^[+-]?)([0-9]{3}T)?([0-9]{2}):([0-9]{2}):([0-9]{2})(\.[0-9]+)?$/g;
export const EPOCH_SIMPLE = /(^[+-]?)(\d+)(\.[0-9]+)?$/g;

/**
 * Tests if a given time string matches a specified regular expression.
 *
 * @param {string} time - The time string to be tested.
 * @param {RegExp} regex - The regular expression to test against.
 * @return {RegExpExecArray | null} The result of the regular expression execution, or null if no match is found.
 */
export function testTime(time: string, regex: RegExp): RegExpExecArray | null {
  regex.lastIndex = 0;
  return regex.exec(time);
}

export function isTimeBalanced(
  time: string,
  regex: RegExp,
): { error?: string | undefined; warning?: string | undefined } {
  const { years, days, hours, minutes, seconds, milliseconds } = extractTime(time, regex);

  if (regex === ABSOLUTE_TIME && years !== undefined && days !== undefined) {
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
      return balanceDuration(days ?? 0, hours, minutes, seconds, milliseconds);
    }
  }

  return {};
}

function extractTime(
  time: string,
  regex: RegExp,
): {
  days?: number;
  hours: number;
  milliseconds: number;
  minutes: number;
  seconds: number;
  years?: number;
} {
  regex.lastIndex = 0;
  const matches = regex.exec(time);

  if (!matches) {
    return { hours: 0, milliseconds: 0, minutes: 0, seconds: 0 };
  }

  if (regex.source === ABSOLUTE_TIME.source) {
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
  if (regex.source === EPOCH_TIME.source) {
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
  } else if (regex.source === RELATIVE_TIME.source) {
    const [, days = undefined, hours = '0', minutes = '0', seconds = '0', milliseconds = '0'] = matches;
    const [hoursNum, minuteNum, secondsNum, millisecondNum] = [hours, minutes, seconds, milliseconds].map(Number);
    const daysNum = days !== undefined ? Number(days.replace('T', '')) : days;
    return {
      days: daysNum,
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
): { error?: string | undefined; warning?: string | undefined } {
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

  const balancedTime = `${DD}${HH}:${MM}:${SS}[.${sss}]`;

  if (days > 365) {
    return {
      error: `Time Error: Maximum time reached.
      Received: Balanced time - ${balancedTime}.
      Expected: ${balancedTime} <= 365T23:59:59.999`,
    };
  } else {
    return {
      warning: `Time Warning: Unbalanced time used.
      Suggestion: ${balancedTime}`,
    };
  }
}

function balanceAbsolute(
  unbalanceYears: number,
  unbalanceDays: number,
  unbalancedHours: number,
  unbalanceMinutes: number,
  unbalanceSeconds: number,
  unbalanceMilliseconds: number,
): { error?: string | undefined; warning?: string | undefined } {
  const { years, days, hours, minutes, seconds, milliseconds } = normalizeTime(
    unbalanceDays,
    unbalancedHours,
    unbalanceMinutes,
    unbalanceSeconds,
    unbalanceMilliseconds,
    unbalanceYears,
  );

  const YY = years !== 0 && years !== undefined ? `${formatNumber(years, 4)}-` : '';
  const DD = (years !== 0 && days === 0) || days !== 0 ? `${formatNumber(days, 3)}T` : '';
  const HH = days !== 0 ? formatNumber(hours, 2) : formatNumber(hours, 2);
  const MM = formatNumber(minutes, 2);
  const SS = formatNumber(seconds, 2);
  const sss = formatNumber(milliseconds, 3);

  const balancedTime = `${YY}${DD}${HH}:${MM}:${SS}.${sss}`;

  if (years && years > 9999) {
    return {
      error: `Time Error: Maximum time reached
    Received: Balanced time - ${balancedTime}.
    Expected: ${balancedTime} <= 9999-365T23:59:59.999`,
    };
  }

  return {
    warning: `Time Warning: Unbalanced time used.
  Suggestion: ${balancedTime}`,
  };
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
  if (years !== undefined) {
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
