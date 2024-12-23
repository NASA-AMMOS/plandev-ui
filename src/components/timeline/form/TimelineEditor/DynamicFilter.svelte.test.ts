import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DynamicFilter from './DynamicFilter.svelte';

vi.mock('$env/dynamic/public', () => import.meta.env); // https://github.com/sveltejs/kit/issues/8180

describe('Dynamic Filter component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render the selected field and operator', async () => {
    const { getByLabelText, getByRole, getByDisplayValue } = render(DynamicFilter, {
      filter: { field: 'Type', id: 0, operator: 'includes', value: 'ban' },
      schema: {
        Type: {
          equals: { type: 'variant', values: ['BiteBanana', 'PeelBanana'] },
          includes: { type: 'string' },
        },
      },
    });

    expect((getByRole('option', { name: 'Type' }) as HTMLOptionElement).selected).toBe(true);
    expect((getByRole('option', { name: 'includes' }) as HTMLOptionElement).selected).toBe(true);
    expect(getByDisplayValue('ban')).toBeDefined();

    await fireEvent.change(getByLabelText('operator'), { target: { value: 'equals' } });
    expect((getByRole('option', { name: 'equals' }) as HTMLOptionElement).selected).toBe(true);
    expect(getByRole('combobox', { name: 'Select Variant' })).toBeDefined();
  });
});
