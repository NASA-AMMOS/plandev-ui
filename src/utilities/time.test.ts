import { expect, test } from 'vitest';
import {
  convertDoyToYmd,
  convertDurationStringToInterval,
  convertDurationStringToUs,
  convertUsToDurationString,
  getDaysInMonth,
  getDaysInYear,
  getDoy,
  getDoyTime,
  getDoyTimeComponents,
  getUnixEpochTime,
  parseDoyOrYmdTime,
} from '../../src/utilities/time';

test('convertDurationStringToUs', () => {
  expect(convertDurationStringToUs('2y 318d 6h 16m 19s 200ms 0us')).toEqual(90577779200000);
  expect(convertDurationStringToUs('100ms -1000us')).toEqual(99000);
  expect(convertDurationStringToUs('200ms 0us')).toEqual(200000);
  expect(convertDurationStringToUs('30s')).toEqual(3e7);
  expect(convertDurationStringToUs('300')).toEqual(300);
  expect(() => convertDurationStringToUs('30f')).toThrowError('Must be of format: 1y 3d 2h 24m 35s 18ms 70us');
});

test('convertDurationStringToInterval', () => {
  expect(convertDurationStringToInterval('2y 318d 6h 16m 19s 200ms 0us')).toEqual(
    '2 years 318 days 6 hours 16 minutes 19 seconds 200 milliseconds',
  );
  expect(convertDurationStringToInterval('1d 5h 23m 0s 300ms')).toEqual('1 day 5 hours 23 minutes 300 milliseconds');
  expect(convertDurationStringToInterval('1d -5h')).toEqual('19 hours');
  expect(convertDurationStringToInterval('- 5h 23m 0s 300ms')).toEqual('-5 hours -23 minutes -300 milliseconds');

  expect(() => convertDurationStringToUs('30f')).toThrowError('Must be of format: 1y 3d 2h 24m 35s 18ms 70us');
});

test('convertUsToDurationString', () => {
  expect(convertUsToDurationString(90577779200000)).toEqual('2y 318d 6h 16m 19s 200ms');
  expect(convertUsToDurationString(200000)).toEqual('200ms');
  expect(convertUsToDurationString(3e7)).toEqual('30s');
  expect(convertUsToDurationString(-8.64e10)).toEqual('- 1d');
});

test('convertDoyToYmd', () => {
  expect(convertDoyToYmd('2023-001T00:10:12', false)).toEqual('2023-01-01T00:10:12');
  expect(convertDoyToYmd('2023-001T00:00:00', false)).toEqual('2023-01-01T00:00:00');
  expect(convertDoyToYmd('2023-032T00:00:00', false)).toEqual('2023-02-01T00:00:00');
  expect(convertDoyToYmd('2023-048T10:32:44.123', true)).toEqual('2023-02-17T10:32:44.123');
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

  expect(parseDoyOrYmdTime('2019-365T08:80:00.1234')).toEqual(null);
  expect(parseDoyOrYmdTime('2022-20-2T00:00:00')).toEqual(null);
});
