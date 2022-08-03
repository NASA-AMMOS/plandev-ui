import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Week from './Week.svelte';

describe('DatePicker Week Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render the correct days in the week', () => {
    const { getByText } = render(Week, {
      maxDate: new Date(Date.UTC(2023, 1, 1)),
      minDate: new Date(Date.UTC(2018, 1, 1)),
      month: 2,
      selectedDate: null,
      week: 0,
      year: 2020,
    });

    expect(getByText('61')).not.toBeNull();
    expect(getByText('62')).not.toBeNull();
    expect(getByText('63')).not.toBeNull();
    expect(getByText('64')).not.toBeNull();
    expect(getByText('65')).not.toBeNull();
    expect(getByText('66')).not.toBeNull();
    expect(getByText('67')).not.toBeNull();
  });
});
