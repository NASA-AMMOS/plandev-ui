import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Month from './Month.svelte';

describe('DatePicker Month Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render the correct number of weeks in a month', () => {
    const { container } = render(Month, {
      maxDate: new Date(Date.UTC(2023, 1, 1)),
      minDate: new Date(Date.UTC(2018, 1, 1)),
      month: 2,
      selectedDate: null,
      year: 2020,
    });

    expect(container.querySelectorAll('.date-picker-week')).toHaveLength(5);
  });
});
