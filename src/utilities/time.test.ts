import { expect, test } from 'vitest';
import {
  convertDoyToYmd,
  convertDurationStringToInterval,
  convertDurationStringToUs,
  convertUsToDurationString,
  getBalancedDuration,
  getDaysInMonth,
  getDaysInYear,
  getDoy,
  getDoyTime,
  getDoyTimeComponents,
  getShortISOForDate,
  getTimeAgo,
  getUnixEpochTime,
  isTimeBalanced,
  isTimeMax,
  parseDoyOrYmdTime,
  parseDurationString,
  validateTime,
} from '../../src/utilities/time';
import { TimeTypes } from '../enums/time';

test('convertDurationStringToUs', () => {
  expect(convertDurationStringToUs('2y 318d 6h 16m 19s 200ms 0us')).toEqual(90577779200000);
  expect(convertDurationStringToUs('100ms -1000us')).toEqual(99000);
  expect(convertDurationStringToUs('200ms 0us')).toEqual(200000);
  expect(convertDurationStringToUs('30s')).toEqual(3e7);

  expect(convertDurationStringToUs('300')).toEqual(300);
  expect(() => convertDurationStringToUs('30f')).toThrowError(`Invalid time format: Must be of format:
    1y 3d 2h 24m 35s 18ms 70us,
    [+/-]DOYThh:mm:ss[.sss],
    duration
    `);
});

test('convertDurationStringToInterval', () => {
  expect(convertDurationStringToInterval('2y 318d 6h 16m 19s 200ms 0us')).toEqual(
    '2 years 318 days 6 hours 16 minutes 19 seconds 200 milliseconds',
  );
  expect(convertDurationStringToInterval('1d 5h 23m 0s 300ms')).toEqual('1 day 5 hours 23 minutes 300 milliseconds');
  expect(convertDurationStringToInterval('1d -5h')).toEqual('19 hours');
  expect(convertDurationStringToInterval('- 5h 23m 0s 300ms')).toEqual('-5 hours -23 minutes -300 milliseconds');

  expect(() => convertDurationStringToUs('30f')).toThrowError(`Invalid time format: Must be of format:
    1y 3d 2h 24m 35s 18ms 70us,
    [+/-]DOYThh:mm:ss[.sss],
    duration
    `);
});

test('convertUsToDurationString', () => {
  expect(convertUsToDurationString(90577779200000)).toEqual('2y 318d 6h 16m 19s 200ms');
  expect(convertUsToDurationString(200000)).toEqual('200ms');
  expect(convertUsToDurationString(3e7)).toEqual('30s');
  expect(convertUsToDurationString(-8.64e10)).toEqual('- 1d');
});

test('convertDoyToYmd', () => {
  expect(convertDoyToYmd('2023-001T00:10:12', false)).toEqual('2023-01-01T00:10:12Z');
  expect(convertDoyToYmd('2023-001T00:00:00', false)).toEqual('2023-01-01T00:00:00Z');
  expect(convertDoyToYmd('2023-032T00:00:00', false)).toEqual('2023-02-01T00:00:00Z');
  expect(convertDoyToYmd('2023-048T10:32:44.123', true)).toEqual('2023-02-17T10:32:44.123Z');
});

test('getDaysInMonth', () => {
  expect(getDaysInMonth(2022, 0)).toEqual(31);
  expect(getDaysInMonth(2022, 1)).toEqual(28);

  expect(getDaysInMonth(2024, 0)).toEqual(31);
  expect(getDaysInMonth(2024, 1)).toEqual(29);
});

test('getDaysInYear', () => {
  expect(getDaysInYear(2020)).toEqual(366);
  expect(getDaysInYear(2021)).toEqual(365);
  expect(getDaysInYear(2022)).toEqual(365);
  expect(getDaysInYear(2023)).toEqual(365);
  expect(getDaysInYear(2024)).toEqual(366);
  expect(getDaysInYear(2025)).toEqual(365);
});

test('getDoy', () => {
  const doy = getDoy(new Date('1/3/2019'));
  expect(doy).toEqual(3);
});

test('getDoyTimeComponents', () => {
  const doyTimeComponents = getDoyTimeComponents(new Date(1683148238813));
  expect(doyTimeComponents).deep.equal({
    doy: '123',
    hours: '21',
    mins: '10',
    msecs: '813',
    secs: '38',
    year: '2023',
  });
});

test('getDoyTime', () => {
  const doyTime = getDoyTime(new Date(1577779200000));
  expect(doyTime).toEqual('2019-365T08:00:00.000');
});

test('getUnixEpochTime', () => {
  const unixEpochTime = getUnixEpochTime('2019-365T08:00:00.000');
  expect(unixEpochTime).toEqual(1577779200000);
});

test('parseDoyOrYmdTime', () => {
  expect(parseDoyOrYmdTime('2019-365T08:00:00.1234')).toEqual({
    doy: 365,
    hour: 8,
    min: 0,
    ms: 123.4,
    sec: 0,
    time: '08:00:00.1234',
    year: 2019,
  });

  expect(parseDoyOrYmdTime('2019-01-20T08:10:03.9')).toEqual({
    day: 20,
    hour: 8,
    min: 10,
    month: 1,
    ms: 900,
    sec: 3,
    time: '08:10:03.9',
    year: 2019,
  });

  expect(parseDoyOrYmdTime('2022-01-2T00:00:00')).toEqual({
    day: 2,
    hour: 0,
    min: 0,
    month: 1,
    ms: 0,
    sec: 0,
    time: '00:00:00',
    year: 2022,
  });

  expect(parseDoyOrYmdTime('012T03:01:30.920')).toEqual({
    days: 12,
    hours: 3,
    isNegative: false,
    microseconds: 0,
    milliseconds: 920,
    minutes: 1,
    seconds: 30,
    years: 0,
  });

  expect(parseDoyOrYmdTime('-112T13:41:00')).toEqual({
    days: 112,
    hours: 13,
    isNegative: true,
    microseconds: 0,
    milliseconds: 0,
    minutes: 41,
    seconds: 0,
    years: 0,
  });

  expect(parseDoyOrYmdTime('2019-365T08:80:00.1234')).toEqual(null);
  expect(parseDoyOrYmdTime('2022-20-2T00:00:00')).toEqual(null);
});

test('getTimeAgo', () => {
  const time = new Date('2023-05-23T00:00:00.000Z');
  expect(getTimeAgo(new Date())).toEqual('Now');
  expect(getTimeAgo(new Date(time.getTime() - 100), time)).toEqual('Now');
  expect(getTimeAgo(new Date(time.getTime() - 1000), time)).toEqual('1s ago');
  expect(getTimeAgo(new Date(time.getTime() - 1000 * 60), time)).toEqual('1m ago');
  expect(getTimeAgo(new Date(time.getTime() - 1000 * 60 * 60), time)).toEqual('1h ago');
  expect(getTimeAgo(new Date(time.getTime() - 1000 * 60 * 60 * 23), time)).toEqual('23h ago');
  expect(getTimeAgo(new Date(time.getTime() - 1000 * 60 * 60 * 24), time)).toEqual('2023-05-22');
  expect(getTimeAgo(new Date(time.getTime() - 1000 * 60 * 60 * 24), time, 1000 * 60 * 60 * 24)).toEqual('1d ago');
  expect(getTimeAgo(new Date(time.getTime() - 1000 * 60 * 60 * 24 * 366), time, 1000 * 60 * 60 * 24 * 366)).toEqual(
    '1y ago',
  );
});

test('getShortISOForDate', () => {
  expect(getShortISOForDate(new Date('2023-05-23T00:00:00.000Z'))).toEqual('2023-05-23T00:00:00');
});

test('parseDurationString', () => {
  expect(parseDurationString('1h 30m 45s')).toEqual({
    days: 0,
    hours: 1,
    isNegative: false,
    microseconds: 0,
    milliseconds: 0,
    minutes: 30,
    seconds: 45,
    years: 0,
  });

  expect(parseDurationString('-2d 12h 30m 15.5s 250ms')).toEqual({
    days: 2,
    hours: 12,
    isNegative: true,
    microseconds: 0,
    milliseconds: 250,
    minutes: 30,
    seconds: 15.5,
    years: 0,
  });

  expect(parseDurationString('500us')).toEqual({
    days: 0,
    hours: 0,
    isNegative: false,
    microseconds: 500,
    milliseconds: 0,
    minutes: 0,
    seconds: 0,
    years: 0,
  });

  expect(parseDurationString('1000')).toEqual({
    days: 0,
    hours: 0,
    isNegative: false,
    microseconds: 1000,
    milliseconds: 0,
    minutes: 0,
    seconds: 0,
    years: 0,
  });

  expect(parseDurationString('-1000', 'seconds')).toEqual({
    days: 0,
    hours: 0,
    isNegative: true,
    microseconds: 0,
    milliseconds: 0,
    minutes: 16,
    seconds: 40,
    years: 0,
  });

  expect(parseDurationString('+100000000000')).toEqual({
    days: 0,
    hours: 0,
    isNegative: false,
    microseconds: 0,
    milliseconds: 0,
    minutes: 1,
    seconds: 40,
    years: 0,
  });

  expect(parseDurationString('-366', 'days')).toEqual({
    days: 1,
    hours: 0,
    isNegative: true,
    microseconds: 0,
    milliseconds: 0,
    minutes: 0,
    seconds: 0,
    years: 1,
  });

  expect(parseDurationString('1.1', 'days')).toEqual({
    days: 1,
    hours: 0.1,
    isNegative: false,
    microseconds: 0,
    milliseconds: 0,
    minutes: 0,
    seconds: 0,
    years: 0,
  });

  expect(parseDurationString('1.01', 'minutes')).toEqual({
    days: 0,
    hours: 0,
    isNegative: false,
    microseconds: 0,
    milliseconds: 0,
    minutes: 1,
    seconds: 0.01,
    years: 0,
  });
});

test('isTimeBalanced', () => {
  expect(isTimeBalanced('2024-001T00:00:00', TimeTypes.ABSOLUTE)).toBe(true);
  expect(isTimeBalanced('2024-001T12:90:00', TimeTypes.ABSOLUTE)).toBe(false);
  expect(isTimeBalanced('9999-365T23:59:60.999', TimeTypes.ABSOLUTE)).toBe(false);
  expect(isTimeBalanced('2024-365T23:59:60', TimeTypes.ABSOLUTE)).toBe(false);
  expect(isTimeBalanced('2023-363T23:19:30', TimeTypes.ABSOLUTE)).toBe(true);
  expect(isTimeBalanced('0000-000T00:00:00', TimeTypes.ABSOLUTE)).toBe(false);
  expect(isTimeBalanced('0000-000T24:60:60', TimeTypes.ABSOLUTE)).toBe(false);
  expect(isTimeBalanced('001T12:43:20.000', TimeTypes.RELATIVE)).toBe(true);
  expect(isTimeBalanced('09:04:00.340', TimeTypes.RELATIVE)).toBe(true);
  expect(isTimeBalanced('001T23:59:60.000', TimeTypes.RELATIVE)).toBe(false);
  expect(isTimeBalanced('365T23:59:60.000', TimeTypes.RELATIVE)).toBe(false);
  expect(isTimeBalanced('24:60:60', TimeTypes.RELATIVE)).toBe(false);
  expect(isTimeBalanced('+001T12:43:20.000', TimeTypes.EPOCH)).toBe(true);
  expect(isTimeBalanced('-09:04:00.340', TimeTypes.EPOCH)).toBe(true);
  expect(isTimeBalanced('-001T23:59:60.000', TimeTypes.EPOCH)).toBe(false);
  expect(isTimeBalanced('-365T23:59:60.000', TimeTypes.EPOCH)).toBe(false);
  expect(isTimeBalanced('365T22:59:60.000', TimeTypes.EPOCH)).toBe(false);
});

test('getBalancedDuration', () => {
  expect(getBalancedDuration('001T23:59:60.1')).toBe('002T00:00:00.100');
  expect(getBalancedDuration('24:60:60')).toBe('001T01:01:00.000');
  expect(getBalancedDuration('1')).toBe('00:00:01.000');
  expect(getBalancedDuration('45600')).toBe('12:40:00.000');
  expect(getBalancedDuration('-001T00:59:10.000')).toBe('-001T00:59:10.000');
  expect(getBalancedDuration('-365T22:59:60.999')).toBe('-365T23:00:00.999');
  expect(getBalancedDuration('-1')).toBe('-00:00:01.000');
  expect(getBalancedDuration('+190')).toBe('00:03:10.000');
});

test('isTimeMax', () => {
  expect(isTimeMax('9999-365T23:59:60.999', TimeTypes.ABSOLUTE)).toBe(true);
  expect(isTimeMax('365T23:59:60.999', TimeTypes.RELATIVE)).toBe(true);
  expect(isTimeMax('365T23:59:60.000', TimeTypes.RELATIVE)).toBe(true);
  expect(isTimeMax('-365T23:59:60.999', TimeTypes.EPOCH)).toBe(true);
  expect(isTimeMax('365T22:59:60.999', TimeTypes.EPOCH)).toBe(false);
});

test('validateTime', () => {
  expect(validateTime('2024-001T00:00:00', TimeTypes.ABSOLUTE)).toBe(true);
  expect(validateTime('2024-001T', TimeTypes.ABSOLUTE)).toBe(false);
  expect(validateTime('12:90:00', TimeTypes.ABSOLUTE)).toBe(false);
  expect(validateTime('-001T23:59:60.000', TimeTypes.RELATIVE)).toBe(false);
  expect(validateTime('365T23:59:60.000', TimeTypes.RELATIVE)).toBe(true);
  expect(validateTime('-03:59:60.000', TimeTypes.RELATIVE)).toBe(false);
  expect(validateTime('+03:59:60.000', TimeTypes.RELATIVE)).toBe(false);
  expect(validateTime('03:59:60.190', TimeTypes.RELATIVE)).toBe(true);
  expect(validateTime('2023-365T23:59:60', TimeTypes.EPOCH)).toBe(false);
  expect(validateTime('2023-365T23:59:60', TimeTypes.EPOCH)).toBe(false);
  expect(validateTime('-001T23:59:60.000', TimeTypes.EPOCH)).toBe(true);
  expect(validateTime('365T23:59:60.000', TimeTypes.EPOCH)).toBe(true);
  expect(validateTime('+03:59:60.000', TimeTypes.EPOCH)).toBe(true);
  expect(validateTime('3:59:60', TimeTypes.EPOCH)).toBe(false);
});
