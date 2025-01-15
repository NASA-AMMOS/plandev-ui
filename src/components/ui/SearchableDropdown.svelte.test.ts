import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { DropdownOptions } from '../../types/dropdown';
import SearchableDropdown from './SearchableDropdown.svelte';

vi.mock('$env/dynamic/public', () => import.meta.env); // https://github.com/sveltejs/kit/issues/8180

describe('Searchable Dropdown component', () => {
  // Store original function and restore after tests complete
  const gbcr = window.Element.prototype.getBoundingClientRect;

  beforeAll(() => {
    // TODO should try to use spy here but typing was tricky, need help
    window.Element.prototype.getBoundingClientRect = () => ({
      bottom: 0,
      height: 100,
      left: 0,
      right: 0,
      toJSON: () => {},
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    });
  });

  afterAll(() => {
    // Restore
    window.Element.prototype.getBoundingClientRect = gbcr;
  });

  const options: DropdownOptions = [
    {
      display: 'Option 1',
      value: 1,
    },
    {
      display: 'Option 2',
      value: 2,
    },
    {
      display: 'Option 10',
      value: 10,
    },
    {
      display: 'Option 12',
      value: 12,
    },
  ];

  afterEach(() => {
    cleanup();
  });

  it('Should render the placeholder text when no option is selected', () => {
    const placeholderText = 'None';
    const { getByText } = render(SearchableDropdown, {
      options,
      placeholder: placeholderText,
    });

    expect(getByText(placeholderText)).toBeDefined();
  });

  it('Should render the selected value text when an option is selected', () => {
    const selectedOption = options[1];
    const placeholderText = 'None';
    const { getByText, queryByText } = render(SearchableDropdown, {
      options,
      placeholder: 'None',
      selectedOptionValues: [selectedOption.value],
    });

    expect(queryByText(placeholderText)).toBeNull();
    expect(getByText(selectedOption.display)).toBeDefined();
  });

  it('Should render the selected option label when provided and when an option is selected', () => {
    const selectedOption = options[1];
    const selectedOptionLabel = 'Alternative Label';
    const placeholderText = 'None';
    const { getByText, queryByText } = render(SearchableDropdown, {
      options,
      placeholder: 'None',
      selectedOptionLabel,
      selectedOptionValues: [selectedOption.value],
    });

    expect(queryByText(placeholderText)).toBeNull();
    expect(getByText(selectedOptionLabel)).toBeDefined();
  });

  it('Should render the selected value text when multiple options are selected', () => {
    const placeholderText = 'None';
    const { getByText, queryByText } = render(SearchableDropdown, {
      options,
      placeholder: 'None',
      selectedOptionValues: [options[0].value, options[1].value],
    });

    expect(queryByText(placeholderText)).toBeNull();
    expect(getByText(`${options[0].display}, ${options[1].display}`)).toBeDefined();
  });

  it('Should render the option items after clicking on the input', async () => {
    const selectedOption = options[0];
    const { getByText, getAllByRole } = render(SearchableDropdown, {
      options,
      placeholder: 'None',
      selectedOptionValues: [selectedOption.value],
    });

    await fireEvent.click(getByText(selectedOption.display));

    expect(getAllByRole('menuitem')).toHaveLength(options.length + 1);
  });

  it('Should render the filtered options after searching in the search field', async () => {
    const { getByLabelText, getAllByRole, findAllByRole, getByPlaceholderText } = render(SearchableDropdown, {
      options,
      placeholder: 'None',
      searchPlaceholder: 'Search options',
    });

    await fireEvent.click(getByLabelText('None'));
    await fireEvent.click(getByPlaceholderText('Search options'));
    await fireEvent.input(getByPlaceholderText('Search options'), { target: { value: '2' } });

    expect(await findAllByRole('menuitem')).toHaveLength(2);

    await fireEvent.input(getByPlaceholderText('Search options'), { target: { value: '1' } });

    expect(getAllByRole('menuitem')).toHaveLength(3);
  });
});
