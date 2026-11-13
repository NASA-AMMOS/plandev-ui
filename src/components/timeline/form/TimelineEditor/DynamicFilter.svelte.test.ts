import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DynamicFilter as DynamicFilterType } from '../../../../types/filter';
import DynamicFilter from './DynamicFilter.svelte';

vi.mock('$env/dynamic/public', () => import.meta.env); // https://github.com/sveltejs/kit/issues/8180

describe('Dynamic Filter component', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
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

  it.each(['is_within', 'is_not_within'] as const)(
    'Should update both numeric bounds for %s without mutating earlier filter values',
    async operator => {
      const filter: DynamicFilterType<any> = {
        field: 'Parameter',
        id: 0,
        operator,
        subfield: { name: 'amount', type: 'real' },
        value: [0, 10],
      };
      const { component, getByLabelText } = render(DynamicFilter, {
        filter,
        schema: {
          Parameter: {
            subfields: [{ activityTypes: ['TestActivity'], label: 'amount (real)', name: 'amount', type: 'real' }],
          },
        },
      });
      const changes: DynamicFilterType<any>[] = [];
      component.$on('change', ({ detail: { filter: updatedFilter } }) => {
        changes.push(updatedFilter);
        component.$set({ filter: updatedFilter });
      });
      const min = getByLabelText('value-min') as HTMLInputElement;
      const max = getByLabelText('value-max') as HTMLInputElement;

      min.value = '';
      const setMinValue = vi.spyOn(min, 'value', 'set');
      await fireEvent.input(min);
      // Partial numeric edits must not be overwritten with NaN, which erases a typed minus sign.
      expect(setMinValue).not.toHaveBeenCalled();
      setMinValue.mockRestore();
      expect(changes.at(-1)?.value).toEqual([NaN, 10]);
      expect(min.value).toBe('');
      await fireEvent.input(min, { target: { value: '-5' } });
      expect(changes.at(-1)?.value).toEqual([-5, 10]);
      await fireEvent.input(min, { target: { value: '-5.5' } });
      expect(changes.at(-1)?.value).toEqual([-5.5, 10]);
      await fireEvent.input(max, { target: { value: '-1.5' } });
      expect(changes.at(-1)?.value).toEqual([-5.5, -1.5]);
      await fireEvent.input(max, { target: { value: '' } });
      expect(changes.at(-1)?.value).toEqual([-5.5, NaN]);
      await fireEvent.input(max, { target: { value: '2' } });
      expect(changes.at(-1)?.value).toEqual([-5.5, 2]);
      expect(changes).toHaveLength(6);
      expect(changes[0].value).toEqual([NaN, 10]);
      expect(filter.value).toEqual([0, 10]);
    },
  );
});
