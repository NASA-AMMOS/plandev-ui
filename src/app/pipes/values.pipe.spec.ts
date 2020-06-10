import { ValuesPipe } from './values.pipe';

describe('ValuesPipe', () => {
  it('create an instance', () => {
    const pipe = new ValuesPipe();
    expect(pipe).toBeTruthy();
  });

  it('should transform a map of arrays into a single flat array', () => {
    const pipe = new ValuesPipe();
    const value = { x: [1, 2], y: [3, 4] };
    expect(pipe.transform(value)).toEqual([1, 2, 3, 4]);
  });
});
