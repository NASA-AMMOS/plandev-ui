import parse from 'postgres-interval';

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

  const validDurationValueRegex = `-?\\d+(?:\\.\\d+)?`;
  const validYearsDurationRegex = `(?:\\s*(?<years>${validDurationValueRegex})y)`;
  const validDaysDurationRegex = `(?:\\s*(?<days>${validDurationValueRegex})d)`;
  const validHoursDurationRegex = `(?:\\s*(?<hours>${validDurationValueRegex})h)`;
  const validMinutesDurationRegex = `(?:\\s*(?<minutes>${validDurationValueRegex})m(?!s))`;
  const validSecondsDurationRegex = `(?:\\s*(?<seconds>${validDurationValueRegex})s)`;
  const validMillisecondsDurationRegex = `(?:\\s*(?<milliseconds>${validDurationValueRegex})ms)`;
  const validMicrosecondsDurationRegex = `(?:\\s*(?<microseconds>${validDurationValueRegex})us)`;

  const fullValidDurationRegex = new RegExp(
    `^${validYearsDurationRegex}?${validDaysDurationRegex}?${validHoursDurationRegex}?${validMinutesDurationRegex}?${validSecondsDurationRegex}?${validMillisecondsDurationRegex}?${validMicrosecondsDurationRegex}?$`,
  );

  const matches = durationString.match(fullValidDurationRegex);

  if (matches !== null) {
    let durationUs = 0;

    const {
      groups: {
        years = '0',
        days = '0',
        hours = '0',
        minutes = '0',
        seconds = '0',
        milliseconds = '0',
        microseconds = '0',
      } = {},
    } = matches;

    durationUs += parseFloat(years) * usPerYear;
    durationUs += parseFloat(days) * usPerDay;
    durationUs += parseFloat(hours) * usPerHour;
    durationUs += parseFloat(minutes) * usPerMinute;
    durationUs += parseFloat(seconds) * usPerSecond;
    durationUs += parseFloat(milliseconds) * usPerMillisecond;
    durationUs += parseFloat(microseconds);

    return durationUs;
  }

  const fullMicrosecondsRegex = new RegExp(`^${validDurationValueRegex}$`);

  if (fullMicrosecondsRegex.test(durationString)) {
    return parseFloat(durationString);
  }

  throw Error('Must be of format: 1y 3d 2h 24m 35s 18ms 70us');
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

  const years = Math.floor(durationUs / usPerYear);
  durationUs -= years * usPerYear;

  const days = Math.floor(durationUs / usPerDay);
  durationUs -= days * usPerDay;

  const hours = Math.floor(durationUs / usPerHour) % hoursPerDay;
  durationUs -= hours * usPerHour;

  const minutes = Math.floor(durationUs / usPerMinute) % minutesPerHour;
  durationUs -= minutes * usPerMinute;

  const seconds = Math.floor(durationUs / usPerSecond) % secondsPerMinute;
  durationUs -= seconds * usPerSecond;

  const milliseconds = Math.floor(durationUs / usPerMillisecond);
  durationUs -= milliseconds * usPerMillisecond;

  const microseconds = durationUs;

  if (includeZeros) {
    return `${years}y ${days}d ${hours}h ${minutes}m ${seconds}s ${milliseconds}ms ${microseconds}us`;
  }

  const yearsString = years ? `${years}y` : '';
  const daysString = days ? `${days}d` : '';
  const hoursString = hours ? `${hours}h` : '';
  const minutesString = minutes ? `${minutes}m` : '';
  const secondsString = seconds ? `${seconds}s` : '';
  const millisecondsString = milliseconds ? `${milliseconds}ms` : '';
  const microsecondsString = microseconds ? `${microseconds}us` : '';

  return [yearsString, daysString, hoursString, minutesString, secondsString, millisecondsString, microsecondsString]
    .filter(Boolean)
    .join(' ');
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
 * Get a day-of-year timestamp from a given JavaScript Date object.
 * @example getDoyTime(new Date(1577779200000)) -> 2019-365T08:00:00.000
 * @note inverse of getUnixEpochTime
 */
export function getDoyTime(date: Date, includeMsecs = true): string {
  const year = date.getUTCFullYear();
  const doy = getDoy(date).toString().padStart(3, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const mins = date.getUTCMinutes().toString().padStart(2, '0');
  const secs = date.getUTCSeconds().toString().padStart(2, '0');
  const msecs = date.getUTCMilliseconds().toString().padStart(3, '0');

  let doyTimestamp = `${year}-${doy}T${hours}:${mins}:${secs}`;

  if (includeMsecs) {
    doyTimestamp += `.${msecs}`;
  }

  return doyTimestamp;
}

/**
 * Get a day-of-year timestamp from a given an ISO 8601 start time string, and a Postgres Interval duration.
 */
export function getDoyTimeFromDuration(startTime: string, duration: string, includeMsecs = true): string {
  const startDate = new Date(startTime);
  const interval = parse(duration);
  const { days, hours, milliseconds, minutes, seconds } = interval;
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
export function getDurationInMs(duration: string | null | undefined): number {
  if (duration !== null && duration !== undefined && duration !== '') {
    const interval = parse(duration);
    const { days, hours, milliseconds, minutes, seconds } = interval;
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
  const differenceMs = endTimeMs - startTimeMs;
  const seconds = Math.floor(differenceMs / 1000);
  const milliseconds = differenceMs % 1000;
  return `${seconds} seconds ${milliseconds} milliseconds`;
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
