import { expect, test } from 'vitest';
import {
  convertDurationStringToUs,
  convertUsToDurationString,
  getDoy,
  getDoyTime,
  getUnixEpochTime,
  parseDoyOrYmdTime,
} from '../../src/utilities/time';

test('convertDurationStringToUs', () => {
  expect(convertDurationStringToUs('2y 318d 6h 16m 19s 200ms 0us')).toEqual(90577779200000);
  expect(convertDurationStringToUs('200ms 0us')).toEqual(200000);
  expect(convertDurationStringToUs('30s')).toEqual(3e7);
  expect(() => convertDurationStringToUs('30f')).toThrowError('Must be of format: 1y 3d 2h 24m 35s 18ms 70us');
});

test('convertUsToDurationString', () => {
  expect(convertUsToDurationString(90577779200000)).toEqual('2y 318d 6h 16m 19s 200ms');
  expect(convertUsToDurationString(200000)).toEqual('200ms');
  expect(convertUsToDurationString(3e7)).toEqual('30s');
});

test('getDoy', () => {
  const doy = getDoy(new Date('1/3/2019'));
  expect(doy).toEqual(3);
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
