import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { DropdownOptions } from '../../types/dropdown';
import EditableDropdown from './EditableDropdown.svelte';

describe('Editable Dropdown component', () => {
  const options: DropdownOptions = [
    {
      display: 'Preset Test 3',
      value: 1,
    },
    {
      display: 'Preset Test 2',
      value: 2,
    },
    {
      display: 'Preset Test 10',
      value: 10,
    },
    {
      display: 'Preset Test 12',
      value: 12,
    },
  ];

  afterEach(() => {
    cleanup();
  });

  it('Save new option button should be disabled when no name is provided', async () => {
    const { getByText, getByRole } = render(EditableDropdown, {
      optionLabel: 'preset',
      options,
      placeholder: 'None',
    });

    await fireEvent.click(getByText('None'));
    expect(getByRole('button', { name: 'Enter a unique name for the new preset' }).className).toContain('disabled');
  });

  it('Save new option button should be disabled when a non-unique name is provided', async () => {
    const { getByText, getByRole, getByPlaceholderText } = render(EditableDropdown, {
      optionLabel: 'preset',
      options,
      placeholder: 'None',
    });

    await fireEvent.click(getByText('None'));
    await fireEvent.input(getByPlaceholderText('Enter preset name'), { target: { value: 'Preset Test 3' } });
    expect(getByRole('button', { name: 'Enter a unique name for the new preset' }).className).toContain('disabled');
  });

  it('Save new option button should be clickable ', async () => {
    const { getByText, getByRole, getByPlaceholderText } = render(EditableDropdown, {
      optionLabel: 'preset',
      options,
      placeholder: 'None',
    });

    await fireEvent.click(getByText('None'));
    await fireEvent.input(getByPlaceholderText('Enter preset name'), { target: { value: 'Preset Test 1' } });
    expect(getByRole('button', { name: 'Enter a unique name for the new preset' }).className).not.toContain('disabled');
  });
});
