import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DropdownOptions } from '../../types/dropdown';
import SearchableDropdown from './SearchableDropdown.svelte';

vi.mock('$env/dynamic/public', () => import.meta.env); // https://github.com/sveltejs/kit/issues/8180

// Mock the virtualizer to render all items directly (avoids complex DOM mocking)
vi.mock('../RowVirtualizerFixed.svelte', async () => {
  const { default: MockComponent } = await import('../__mocks__/RowVirtualizerFixed.svelte');
  return { default: MockComponent };
});

describe('Searchable Dropdown component', () => {
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
    const { getByLabelText, getAllByRole, getByPlaceholderText } = render(SearchableDropdown, {
      options,
      placeholder: 'None',
      searchPlaceholder: 'Search options',
    });

    await fireEvent.click(getByLabelText('None'));
    await fireEvent.click(getByPlaceholderText('Search options'));
    await fireEvent.input(getByPlaceholderText('Search options'), { target: { value: '2' } });

    expect(getAllByRole('menuitem')).toHaveLength(2);

    await fireEvent.input(getByPlaceholderText('Search options'), { target: { value: '1' } });

    expect(getAllByRole('menuitem')).toHaveLength(3);
  });
});
