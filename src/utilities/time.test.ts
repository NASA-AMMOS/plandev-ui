import { expect, test } from 'vitest';
import {
  convertDurationStringToUs,
  convertUsToDurationString,
  getDoy,
  getDoyTime,
  getUnixEpochTime,
} from '../../src/utilities/time';

test('convertDurationStringToUs', () => {
  expect(convertDurationStringToUs('2y 318d 6h 16m 19s 200ms 0us')).toEqual(90577779200000);
  expect(convertDurationStringToUs('200ms 0us')).toEqual(200000);
  expect(convertDurationStringToUs('30s')).toEqual(3e7);
  expect(() => convertDurationStringToUs('30f')).toThrowError('Must be of format: 1y 3d 2h 24m 35s 18ms 70us');
});

test('convertUsToDurationString', () => {
  expect(convertUsToDurationString(90577779200000)).toEqual('2y 318d 6h 16m 19s 200ms 0us');
  expect(convertUsToDurationString(200000)).toEqual('0y 0d 0h 0m 0s 200ms 0us');
  expect(convertUsToDurationString(3e7)).toEqual('0y 0d 0h 0m 30s 0ms 0us');
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
