import { padStart } from 'lodash-es';
import parseInterval from 'postgres-interval';
import type { ActivityDirectiveId, ActivityDirectivesMap } from '../types/activity';
import type { SpanUtilityMaps, SpansMap } from '../types/simulation';
import type { ParsedDoyString, ParsedDurationString, ParsedYmdString } from '../types/time';

function parseDurationString(durationString: string): ParsedDurationString | never {
  const validNegationRegex = `((?<isNegative>-)\\s)?`;
  const validDurationValueRegex = `-?\\d+(?:\\.\\d+)?`;
  const validYearsDurationRegex = `(?:\\s*(?<years>${validDurationValueRegex})y)`;
  const validDaysDurationRegex = `(?:\\s*(?<days>${validDurationValueRegex})d)`;
  const validHoursDurationRegex = `(?:\\s*(?<hours>${validDurationValueRegex})h)`;
  const validMinutesDurationRegex = `(?:\\s*(?<minutes>${validDurationValueRegex})m(?!s))`;
  const validSecondsDurationRegex = `(?:\\s*(?<seconds>${validDurationValueRegex})s)`;
  const validMillisecondsDurationRegex = `(?:\\s*(?<milliseconds>${validDurationValueRegex})ms)`;
  const validMicrosecondsDurationRegex = `(?:\\s*(?<microseconds>${validDurationValueRegex})us)`;

  const fullValidDurationRegex = new RegExp(
    `^${validNegationRegex}${validYearsDurationRegex}?${validDaysDurationRegex}?${validHoursDurationRegex}?${validMinutesDurationRegex}?${validSecondsDurationRegex}?${validMillisecondsDurationRegex}?${validMicrosecondsDurationRegex}?$`,
  );

  const matches = durationString.match(fullValidDurationRegex);

  if (matches !== null) {
    const {
      groups: {
        isNegative = '',
        years = '0',
        days = '0',
        hours = '0',
        minutes = '0',
        seconds = '0',
        milliseconds = '0',
        microseconds = '0',
      } = {},
    } = matches;

    return {
      days: parseFloat(days),
      hours: parseFloat(hours),
      isNegative: !!isNegative,
      microseconds: parseFloat(microseconds),
      milliseconds: parseFloat(milliseconds),
      minutes: parseFloat(minutes),
      seconds: parseFloat(seconds),
      years: parseFloat(years),
    };
  }

  const fullMicrosecondsRegex = new RegExp(`^${validDurationValueRegex}$`);

  if (fullMicrosecondsRegex.test(durationString)) {
    const microseconds = parseFloat(durationString);
    return {
      days: 0,
      hours: 0,
      isNegative: microseconds < 0,
      microseconds,
      milliseconds: 0,
      minutes: 0,
      seconds: 0,
      years: 0,
    };
  }

  throw Error('Must be of format: 1y 3d 2h 24m 35s 18ms 70us');
}

function addUnit(value: number, unit: string, isNegative: boolean) {
  return `${isNegative ? '-' : ''}${value} ${value !== 1 ? `${unit}s` : unit}`;
}

/**
 * Converts a DOY string (YYYY-DDDDTHH:mm:ss) into a YYYY-MM-DDTHH:mm:ss formatted time string
 */
export function convertDoyToYmd(doyString: string, includeMsecs = true): string | null {
  const parsedDoy: ParsedDoyString = parseDoyOrYmdTime(doyString) as ParsedDoyString;

  if (parsedDoy !== null) {
    if (parsedDoy.doy !== undefined) {
      const date = new Date(parsedDoy.year, 0, parsedDoy.doy);
      const ymdString = `${[
        date.getFullYear(),
        padStart(`${date.getUTCMonth() + 1}`, 2, '0'),
        padStart(`${date.getUTCDate()}`, 2, '0'),
      ].join('-')}T${parsedDoy.time}`;
      if (includeMsecs) {
        return `${ymdString}Z`;
      }
      return `${ymdString.replace(/(\.\d+)/, '')}Z`;
    } else {
      // doyString is already in ymd format
      return doyString;
    }
  }

  return null;
}

/**
 * Get a Postgres Interval duration given a string duration of the format '2y 318d 6h 16m 19s 200ms 0us'.
 * @example convertDurationStringToInterval('8d 6h 16m') -> 8 days 6 hours 16 minutes
 */
export function convertDurationStringToInterval(durationString: string): string | never {
  const parsedDuration = parseDurationString(convertUsToDurationString(convertDurationStringToUs(durationString)));

  const { isNegative, years, days, hours, minutes, seconds, milliseconds, microseconds } = parsedDuration;

  const yearsString = years ? addUnit(years, 'year', isNegative) : '';
  const daysString = days ? addUnit(days, 'day', isNegative) : '';
  const hoursString = hours ? addUnit(hours, 'hour', isNegative) : '';
  const minutesString = minutes ? addUnit(minutes, 'minute', isNegative) : '';
  const secondsString = seconds ? addUnit(seconds, 'second', isNegative) : '';
  const millisecondsString = milliseconds ? addUnit(milliseconds, 'millisecond', isNegative) : '';
  const microsecondsString = microseconds ? addUnit(microseconds, 'microsecond', isNegative) : '';

  const intervalString = [
    yearsString,
    daysString,
    hoursString,
    minutesString,
    secondsString,
    millisecondsString,
    microsecondsString,
  ]
    .filter(Boolean)
    .join(' ');

  return intervalString ? intervalString : '0';
}

/**
 * Get a number value in microseconds given a string duration of the format '2y 318d 6h 16m 19s 200ms 0us'.
 * @example convertDurationStringToUs('2y 318d 6h 16m 19s 200ms 0us') -> 90577779200000
 * @note inverse of convertUsToDurationString
 */
export function convertDurationStringToUs(durationString: string): number | never {
  const usPerYear = 3.154e13;
  const usPerDay = 8.64e10;
  const usPerHour = 3.6e9;
  const usPerMinute = 6e7;
  const usPerSecond = 1000000;
  const usPerMillisecond = 1000;

  const parsedDuration = parseDurationString(durationString);

  let durationUs = 0;

  const { isNegative, years, days, hours, minutes, seconds, milliseconds, microseconds } = parsedDuration;

  durationUs += years * usPerYear;
  durationUs += days * usPerDay;
  durationUs += hours * usPerHour;
  durationUs += minutes * usPerMinute;
  durationUs += seconds * usPerSecond;
  durationUs += milliseconds * usPerMillisecond;
  durationUs += microseconds;

  return durationUs * (isNegative ? -1 : 1);
}

/**
 * Get a formatted duration string given a duration in microseconds.
 * @example convertUsToDurationString(90577779200000) -> '2y 318d 6h 16m 19s 200ms'
 * @note inverse of convertDurationStringToUs
 */
export function convertUsToDurationString(durationUs: number, includeZeros: boolean = false): string {
  const usPerYear = 3.154e13;
  const usPerDay = 8.64e10;
  const usPerHour = 3.6e9;
  const usPerMinute = 6e7;
  const usPerSecond = 1000000;
  const usPerMillisecond = 1000;

  const hoursPerDay = 24;
  const minutesPerHour = 60;
  const secondsPerMinute = 60;

  const isNegative = durationUs < 0;
  let absoluteDuration = Math.abs(durationUs);

  const years = Math.floor(absoluteDuration / usPerYear);
  absoluteDuration -= years * usPerYear;

  const days = Math.floor(absoluteDuration / usPerDay);
  absoluteDuration -= days * usPerDay;

  const hours = Math.floor(absoluteDuration / usPerHour) % hoursPerDay;
  absoluteDuration -= hours * usPerHour;

  const minutes = Math.floor(absoluteDuration / usPerMinute) % minutesPerHour;
  absoluteDuration -= minutes * usPerMinute;

  const seconds = Math.floor(absoluteDuration / usPerSecond) % secondsPerMinute;
  absoluteDuration -= seconds * usPerSecond;

  const milliseconds = Math.floor(absoluteDuration / usPerMillisecond);
  absoluteDuration -= milliseconds * usPerMillisecond;

  const microseconds = absoluteDuration;

  if (includeZeros) {
    return `${
      isNegative ? '- ' : ''
    }${years}y ${days}d ${hours}h ${minutes}m ${seconds}s ${milliseconds}ms ${microseconds}us`;
  }

  const negativeString = isNegative ? '-' : '';
  const yearsString = years ? `${years}y` : '';
  const daysString = days ? `${days}d` : '';
  const hoursString = hours ? `${hours}h` : '';
  const minutesString = minutes ? `${minutes}m` : '';
  const secondsString = seconds ? `${seconds}s` : '';
  const millisecondsString = milliseconds ? `${milliseconds}ms` : '';
  const microsecondsString = microseconds ? `${microseconds}us` : '';

  return [
    negativeString,
    yearsString,
    daysString,
    hoursString,
    minutesString,
    secondsString,
    millisecondsString,
    microsecondsString,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Calculates an activity directive's start time recursively based on what it's anchored to.
 * @todo Calculate this in the database?
 */
export function getActivityDirectiveStartTimeMs(
  id: ActivityDirectiveId,
  planStartTimeYmd: string,
  planEndTimeDoy: string,
  activityDirectivesMap: ActivityDirectivesMap,
  spansMap: SpansMap,
  spanUtilityMaps: SpanUtilityMaps,
  cachedStartTimes: { [activityDirectiveId: ActivityDirectiveId]: number } = {},
  traversalMap: { [activityDirectiveId: ActivityDirectiveId]: boolean } = {},
): number | never {
  // If the start time has already been determined in an earlier iteration
  if (cachedStartTimes[id]) {
    return cachedStartTimes[id];
  }

  const activityDirective = activityDirectivesMap[id];

  if (activityDirective) {
    const { anchored_to_start, anchor_id } = activityDirective;

    if (anchor_id != null) {
      if (traversalMap[anchor_id]) {
        throw Error(`Cycle detected with Activity Directive: ${anchor_id}`);
      }

      const anchoredSpanId = spanUtilityMaps.directiveIdToSpanIdMap[anchor_id];
      const anchoredSpan = spansMap[anchoredSpanId];

      const anchoredStartTimeMs = getUnixEpochTimeFromInterval(
        new Date(
          getUnixEpochTimeFromInterval(
            new Date(
              getActivityDirectiveStartTimeMs(
                anchor_id,
                planStartTimeYmd,
                planEndTimeDoy,
                activityDirectivesMap,
                spansMap,
                spanUtilityMaps,
                cachedStartTimes,
                { ...traversalMap, [anchor_id]: true },
              ),
            ).toISOString(),
            anchored_to_start ? '0' : anchoredSpan?.duration ?? '0',
          ),
        ).toISOString(),
        activityDirective.start_offset,
      );

      cachedStartTimes[anchor_id] = anchoredStartTimeMs;

      return anchoredStartTimeMs;
    }

    const startTimeFromPlanMs = getUnixEpochTimeFromInterval(
      anchored_to_start ? planStartTimeYmd : `${new Date(getUnixEpochTime(planEndTimeDoy))}`,
      activityDirective.start_offset,
    );

    cachedStartTimes[id] = startTimeFromPlanMs;

    return startTimeFromPlanMs;
  }

  return new Date(planStartTimeYmd).getTime();
}

/**
 * Get the number of days in a given month (0-11) of a specific year.
 * @example getDaysInMonth(2020, 5) -> 3
 */
export function getDaysInMonth(year: number, month: number): number {
  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));

  return lastOfMonth.getUTCDate();
}

export function getDaysInYear(year: number): number {
  let daysInYear = 0;
  for (let month: number = 0; month < 12; month++) {
    daysInYear += getDaysInMonth(year, month);
  }

  return daysInYear;
}

/**
 * Get the day-of-year for a given date.
 * @example getDoy(new Date('1/3/2019')) -> 3
 * @see https://stackoverflow.com/a/8619946
 */
export function getDoy(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start;
  const oneDay = 8.64e7; // Number of milliseconds in a day.
  return Math.floor(diff / oneDay);
}

/**
 * Get the DOY components for a given JavaScript Date object.
 */
export function getDoyTimeComponents(date: Date) {
  return {
    doy: getDoy(date).toString().padStart(3, '0'),
    hours: date.getUTCHours().toString().padStart(2, '0'),
    mins: date.getUTCMinutes().toString().padStart(2, '0'),
    msecs: date.getUTCMilliseconds().toString().padStart(3, '0'),
    secs: date.getUTCSeconds().toString().padStart(2, '0'),
    year: date.getUTCFullYear().toString(),
  };
}

/**
 * Get a day-of-year timestamp from a given JavaScript Date object.
 * @example getDoyTime(new Date(1577779200000)) -> 2019-365T08:00:00.000
 * @note inverse of getUnixEpochTime
 */
export function getDoyTime(date: Date, includeMsecs = true): string {
  const { doy, hours, mins, msecs, secs, year } = getDoyTimeComponents(date);
  let doyTimestamp = `${year}-${doy}T${hours}:${mins}:${secs}`;

  if (includeMsecs) {
    doyTimestamp += `.${msecs}`;
  }

  return doyTimestamp;
}

/**
 * Get a day-of-year timestamp from a given an ISO 8601 start time string, and a Postgres Interval duration.
 */
export function getDoyTimeFromInterval(startTime: string, interval: string, includeMsecs = true): string {
  const startDate = new Date(startTime);
  const parsedInterval = parseInterval(interval);
  const { days, hours, milliseconds, minutes, seconds } = parsedInterval;
  const endDate = new Date(startDate.getTime());
  endDate.setUTCDate(endDate.getUTCDate() + days);
  endDate.setUTCHours(endDate.getUTCHours() + hours);
  endDate.setUTCMinutes(endDate.getUTCMinutes() + minutes);
  endDate.setUTCSeconds(endDate.getUTCSeconds() + seconds);
  endDate.setUTCMilliseconds(endDate.getUTCMilliseconds() + milliseconds);
  return getDoyTime(endDate, includeMsecs);
}

/**
 * Returns a Postgres Interval duration in milliseconds.
 * If duration is null, undefined, or empty string then we just return 0.
 * @note This function assumes 24-hour days.
 */
export function getIntervalInMs(interval: string | null | undefined): number {
  if (interval !== null && interval !== undefined && interval !== '') {
    const parsedInterval = parseInterval(interval);
    const { days, hours, milliseconds, minutes, seconds } = parsedInterval;
    const daysInMs = days * 24 * 60 * 60 * 1000;
    const hoursInMs = hours * 60 * 60 * 1000;
    const minutesInMs = minutes * 60 * 1000;
    const secondsInMs = seconds * 1000;
    return daysInMs + hoursInMs + minutesInMs + secondsInMs + milliseconds;
  }
  return 0;
}

/**
 * Returns a Postgres Interval over the specified range of DOY strings.
 */
export function getIntervalFromDoyRange(startTime: string, endTime: string): string {
  const startTimeMs = getUnixEpochTime(startTime);
  const endTimeMs = getUnixEpochTime(endTime);
  return getIntervalUnixEpochTime(startTimeMs, endTimeMs);
}

/**
 * Returns a Postgres Interval over the specified range of unix epoch UTC times.
 */
export function getIntervalUnixEpochTime(startTimeMs: number, endTimeMs: number): string {
  const differenceMs = endTimeMs - startTimeMs;

  const isNegative = differenceMs < 0;
  const absoluteDifferenceMs = Math.abs(differenceMs);

  const seconds = Math.floor(absoluteDifferenceMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const remainingMilliseconds = absoluteDifferenceMs % 1000;

  const paddedHours = hours.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');
  const paddedSeconds = remainingSeconds.toString().padStart(2, '0');
  const paddedMilliseconds = remainingMilliseconds.toString().padStart(3, '0');

  const sign = isNegative ? '-' : '';
  return `${sign}${paddedHours}:${paddedMinutes}:${paddedSeconds}.${paddedMilliseconds}`;
}

/**
 * Get a unix epoch time in milliseconds given a day-of-year timestamp.
 * @example getUnixEpochTime('2019-365T08:00:00.000') -> 1577779200000
 * @note inverse of getDoyTime
 */
export function getUnixEpochTime(doyTimestamp: string): number {
  const re = /(\d{4})-(\d{3})T(\d{2}):(\d{2}):(\d{2})\.?(\d{3})?/;
  const match = re.exec(doyTimestamp);

  if (match) {
    const [, year, doy, hours, mins, secs, msecs = '0'] = match;
    return Date.UTC(+year, 0, +doy, +hours, +mins, +secs, +msecs);
  }

  return 0;
}

/**
 * Helper to calculate a unix epoch time in UTC from a start time and Postgres interval.
 */
export function getUnixEpochTimeFromInterval(startTime: string, interval: string, includeMsecs = true): number {
  const doyTime = getDoyTimeFromInterval(startTime, interval, includeMsecs);
  return getUnixEpochTime(doyTime);
}

/**
 * Parses a date string (YYYY-MM-DDTHH:mm:ss) or DOY string (YYYY-DDDDTHH:mm:ss) into its separate components
 */
export function parseDoyOrYmdTime(dateString: string, numDecimals = 6): null | ParsedDoyString | ParsedYmdString {
  const matches = (dateString ?? '').match(
    new RegExp(
      `^(?<year>\\d{4})-(?:(?<month>(?:[0]?[0-9])|(?:[1][1-2]))-(?<day>(?:[0-2]?[0-9])|(?:[3][0-1]))|(?<doy>\\d{1,3}))(?:T(?<time>(?<hour>[0-9]|[0-2][0-9])(?::(?<min>[0-9]|(?:[0-5][0-9])))?(?::(?<sec>[0-9]|(?:[0-5][0-9]))(?<dec>\\.\\d{1,${numDecimals}})?)?)?)?$`,
      'i',
    ),
  );
  if (matches) {
    const msPerSecond = 1000;

    const { groups: { year, month, day, doy, time = '00:00:00', hour = '0', min = '0', sec = '0', dec = '.0' } = {} } =
      matches;

    const partialReturn = {
      hour: parseInt(hour),
      min: parseInt(min),
      ms: parseFloat((parseFloat(dec) * msPerSecond).toFixed(numDecimals)),
      sec: parseInt(sec),
      time: time,
      year: parseInt(year),
    };

    if (doy !== undefined) {
      return {
        ...partialReturn,
        doy: parseInt(doy),
      };
    }

    return {
      ...partialReturn,
      day: parseInt(day),
      month: parseInt(month),
    };
  }

  return null;
}

/**
 * Returns a string indicating how long ago a date was compared to the given date.
 * Optionally pass in formatAsDateAfterMS to override the default 1 day cut off in MS
 * after which the date will be formatted in a more conventional form.
 * @example getTimeAgo(new Date()) -> 0s
 * @example getTimeAgo(new Date(new Date().getTime() - 1000), new Date(new Date().getTime())) -> 0s
 */
export function getTimeAgo(
  date: Date,
  comparisonDate: Date = new Date(),
  formatAsDateAfterMS: number = 1000 * 60 * 60 * 23,
) {
  const comparisonDateTime = comparisonDate.getTime();
  const diff = comparisonDateTime - date.getTime();
  if (diff < 1000) {
    return 'Now';
  }
  // Format as mm-dd-YYYY if over limit
  if (diff > formatAsDateAfterMS) {
    return date.toISOString().slice(0, 10);
  }
  return `${convertUsToDurationString((comparisonDateTime - date.getTime()) * 1000).split(' ')[0]} ago`;
}

/**
 * Returns a date formatted in ISO string without milliseconds and timezone identifier
 * @example getShortISOForDate(new Date("2023-05-23T00:30:09.597Z")) -> '2023-05-23T00:30:09'
 */
export function getShortISOForDate(date: Date) {
  return date.toISOString().slice(0, 19);
}

export function getShortTimeZoneName() {
  return new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).format(new Date());
}

export function getTimeZoneName() {
  // set up formatter
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  });
  // run formatter on current date
  const parts = formatter?.formatToParts(Date.now());
  // extract the actual value from the formatter
  const timeZoneName = parts.find(formatted => formatted.type === 'timeZoneName');
  if (timeZoneName) {
    return timeZoneName.value;
  }
  return 'UNK';
}
