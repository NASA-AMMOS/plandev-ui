import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ModelStatusIcon from './ModelStatusIcon.svelte';

describe('Model Status Icon', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should display an error icon', () => {
    const { queryByTestId } = render(ModelStatusIcon, {
      props: {
        status: 'error',
      },
    });

    expect(queryByTestId('error')).not.toBeNull();
  });

  it('Should display an check icon', () => {
    const { queryByTestId } = render(ModelStatusIcon, {
      props: {
        status: 'complete',
      },
    });

    expect(queryByTestId('complete')).not.toBeNull();
  });

  it('Should not display an check icon when `showCompleteStatus` is false', () => {
    const { queryByTestId } = render(ModelStatusIcon, {
      props: {
        showCompleteStatus: false,
        status: 'complete',
      },
    });

    expect(queryByTestId('complete')).toBeNull();
  });

  it('Should display a spinner icon', () => {
    const { queryByTestId } = render(ModelStatusIcon, {
      props: {
        status: 'extracting',
      },
    });

    expect(queryByTestId('extracting')).not.toBeNull();
  });
});
