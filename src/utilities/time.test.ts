import { expect, test } from 'vitest';
import { getDoy } from './time';

test('getDoy', () => {
  const doy = getDoy(new Date('1/3/2019'));
  expect(doy).toEqual(3);
});
