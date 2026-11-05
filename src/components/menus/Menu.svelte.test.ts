import { describe, expect, it } from 'vitest';
import { popperSizeChanged } from './Menu.svelte';

describe('Menu popperSizeChanged', () => {
  it('Should not report a change when the real size matches the measured size', () => {
    expect(popperSizeChanged({ offsetHeight: 400, offsetWidth: 240 }, { height: 400, width: 240 })).toBe(false);
  });

  it('Should ignore sub-pixel differences between the integer offset size and the fractional measured rect', () => {
    expect(popperSizeChanged({ offsetHeight: 413, offsetWidth: 241 }, { height: 412.5, width: 240.6 })).toBe(false);
  });

  it('Should report a change when a scrollbar widens the menu after it was measured', () => {
    expect(popperSizeChanged({ offsetHeight: 400, offsetWidth: 255 }, { height: 400, width: 240 })).toBe(true);
  });

  it('Should report a change when the viewport cap shrinks the menu after it was measured', () => {
    expect(popperSizeChanged({ offsetHeight: 400, offsetWidth: 240 }, { height: 900, width: 240 })).toBe(true);
  });
});
