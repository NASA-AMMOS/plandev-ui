import parse from 'postgres-interval';

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
