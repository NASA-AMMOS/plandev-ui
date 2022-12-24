import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { FormParameter } from '../../types/parameter';
import Parameters from './Parameters.svelte';

describe('Parameters component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render the list of parameters in the correct order', () => {
    const formParameters: FormParameter[] = [
      {
        errors: null,
        name: 'bar',
        order: 1,
        schema: {
          type: 'string',
        },
        value: 'value 2',
        valueSource: 'user',
      },
      {
        errors: null,
        name: 'foo',
        order: 0,
        schema: {
          type: 'string',
        },
        value: 'value 1',
        valueSource: 'user',
      },
    ];
    const { getAllByRole } = render(Parameters, { formParameters });

    expect(getAllByRole('textbox').length).toBe(2);
    expect((getAllByRole('textbox')[0] as HTMLInputElement).value).toEqual('value 1');
    expect((getAllByRole('textbox')[1] as HTMLInputElement).value).toEqual('value 2');
  });

  it('Should render a star next to a required parameter', () => {
    const formParameters: FormParameter[] = [
      {
        errors: null,
        name: 'bar',
        order: 1,
        schema: {
          type: 'string',
        },
        value: 'value 2',
        valueSource: 'mission',
      },
      {
        errors: null,
        name: 'foo',
        order: 0,
        required: true,
        schema: {
          type: 'string',
        },
        value: 'value 1',
        valueSource: 'mission',
      },
    ];
    const { getByText } = render(Parameters, { formParameters });

    expect(getByText('foo').getElementsByClassName('required').length).to.equals(1);
    expect(getByText('bar').getElementsByClassName('required').length).to.equals(0);
  });
});
