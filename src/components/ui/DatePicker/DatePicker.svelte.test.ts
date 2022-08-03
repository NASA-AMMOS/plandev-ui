import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import DatePicker from './DatePicker.svelte';

describe('DatePicker DatePicker Component', () => {
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

    await fireEvent.click(getAllByRole('button').at(0));

    expect(getAllByText('December')).toHaveLength(2);
  });

  it('Should roll the view to the next year when clicking the next month button in December', async () => {
    const { getAllByRole, getByRole, getAllByText } = render(DatePicker, {
      dateString: '2021-360T00:00:00',
    });

    await fireEvent.click(getByRole('textbox'));

    await fireEvent.click(getAllByRole('button').at(1));

    expect(getAllByText('January')).toHaveLength(2);
  });

  it('Should only show an error after the user first enters a value at least once', async () => {
    const { getByRole, container } = render(DatePicker, {
      dateString: '2021-3333T00:00:00',
    });

    await fireEvent.click(getByRole('textbox'));

    await fireEvent.change(getByRole('textbox'), { target: { value: '2022-3333' } });

    expect(container.querySelector('.error')).toBeNull();

    await fireEvent.keyDown(document, { key: 'Escape' });

    expect(container.querySelector('.error')).not.toBeNull();
  });
});
