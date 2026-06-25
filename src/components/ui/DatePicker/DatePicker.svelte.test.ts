import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DatePicker from './DatePicker.svelte';

describe('DatePicker DatePicker Component', () => {
  beforeAll(() => {
    const date = new Date(2020, 1, 1, 1);
    vi.useFakeTimers();
    vi.setSystemTime(date);
  });

  afterAll(() => {
    vi.setSystemTime(vi.getRealSystemTime());
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
  });

  it('Should open the datepicker on input focus', async () => {
    const { getByRole, getByText, queryByText } = render(DatePicker);

    expect(queryByText('April')).toBeNull();

    await fireEvent.focus(getByRole('textbox'));

    expect(getByText('April')).not.toBeNull();
  });

  it('Should open the datepicker on input click', async () => {
    const { getByRole, getByText, queryByText } = render(DatePicker);

    expect(queryByText('April')).toBeNull();

    await fireEvent.click(getByRole('textbox'));

    expect(getByText('April')).not.toBeNull();
  });

  it('Should close the datepicker when the user presses the ESC key', async () => {
    const { getByRole, getByText, queryByText } = render(DatePicker);

    expect(queryByText('April')).toBeNull();

    await fireEvent.click(getByRole('textbox'));

    expect(getByText('April')).not.toBeNull();

    await fireEvent.keyDown(document, { key: 'Escape' });

    expect(queryByText('April')).toBeNull();
  });

  it('Should close the datepicker when the user confirms their typing changes', async () => {
    const { getByRole, queryByText } = render(DatePicker);

    await fireEvent.focus(getByRole('textbox'));
    await fireEvent.change(getByRole('textbox'), { target: { value: '2022-100' } });
    await fireEvent.keyDown(getByRole('textbox'), { key: 'Enter' });

    expect(queryByText('April')).toBeNull();
  });

  it('Should close the datepicker when the user confirms their day selection', async () => {
    const { getByRole, getByText, queryByText } = render(DatePicker, {
      dateString: '2021-360T00:00:00',
    });

    await fireEvent.focus(getByRole('textbox'));
    await fireEvent.click(getByText('359'));

    expect(queryByText('April')).toBeNull();
  });

  it('Should autocomplete the date when partially valid', async () => {
    const { getByDisplayValue, getByRole } = render(DatePicker);

    await fireEvent.change(getByRole('textbox'), { target: { value: '2022-100' } });

    expect(getByDisplayValue('2022-100T00:00:00')).not.toBeNull();
  });

  it('Should autocomplete the date when partially valid when the user presses the Enter key', async () => {
    const { getByDisplayValue, getByRole } = render(DatePicker);

    await fireEvent.input(getByRole('textbox'), { target: { value: '2022-100' } });

    expect(getByDisplayValue('2022-100')).not.toBeNull();

    await fireEvent.keyDown(getByRole('textbox'), { key: 'Enter' });

    expect(getByDisplayValue('2022-100T00:00:00')).not.toBeNull();
  });

  it('Should roll the view to the previous year when clicking the previous month button in January', async () => {
    const { getAllByRole, getByRole, getAllByText } = render(DatePicker, {
      dateString: '2021-001T00:00:00',
    });

    await fireEvent.click(getByRole('textbox'));

    const previousButton = getAllByRole('button').at(0);
    expect(previousButton).toBeDefined();

    await fireEvent.click(previousButton as HTMLElement);

    expect(getAllByText('December')).toHaveLength(2);
  });

  it('Should roll the view to the next year when clicking the next month button in December', async () => {
    const { getAllByRole, getByRole, getAllByText } = render(DatePicker, {
      dateString: '2021-360T00:00:00',
    });

    await fireEvent.click(getByRole('textbox'));

    const nextButton = getAllByRole('button').at(1);
    expect(nextButton).toBeDefined();
    await fireEvent.click(nextButton as HTMLElement);

    expect(getAllByText('January')).toHaveLength(2);
  });

  it('Should only show an error after the user first enters a value at least once', async () => {
    const { getByRole } = render(DatePicker, {
      dateString: '2021-3333T00:00:00',
    });

    await fireEvent.click(getByRole('textbox'));

    await fireEvent.change(getByRole('textbox'), { target: { value: '2022-3333' } });

    expect(getByRole('textbox').ariaInvalid).toBe('false');

    await fireEvent.keyDown(document, { key: 'Escape' });

    expect(getByRole('textbox').ariaInvalid).toBe('true');
  });

  it('Should default the view to the middle of min/max range when current date is outside the range', async () => {
    // Set min and max dates that don't include the current date (Feb 1, 2020)
    const minDate = new Date(Date.UTC(2025, 0, 1)); // Jan 1, 2025
    const maxDate = new Date(Date.UTC(2030, 11, 31)); // Dec 31, 2030

    // Calculate the middle date: (minTimestamp + maxTimestamp) / 2
    const middleTimestamp = (minDate.getTime() + maxDate.getTime()) / 2;
    const middleDate = new Date(middleTimestamp);
    const expectedYear = middleDate.getUTCFullYear(); // Should be 2028
    const expectedMonth = middleDate.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }); // Should be July

    const { getByRole, getByText } = render(DatePicker, {
      maxDate,
      minDate,
    });

    await fireEvent.click(getByRole('textbox'));

    // The view should default to the exact middle of the range
    expect(getByText(expectedMonth, { selector: 'span' })).toBeTruthy();
    expect(getByText(expectedYear.toString(), { selector: 'span' })).toBeTruthy();
  });
});
