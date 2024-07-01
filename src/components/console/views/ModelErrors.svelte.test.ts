import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ModelErrorsTest from './ModelErrors.test.svelte';

describe('Model Errors Console', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should display an error log automatically if present within the model', () => {
    const { getByLabelText } = render(ModelErrorsTest, {
      props: {
        model: {
          refresh_activity_type_logs: [],
          refresh_model_parameter_logs: [
            {
              error: JSON.stringify({ error: 'This is an error' }),
              error_message: 'This is a Test Error',
              pending: false,
              success: false,
            },
          ],
          refresh_resource_type_logs: [],
        },
        title: 'test',
      },
    });

    expect(getByLabelText('This is a Test Error')).not.toBeNull();
  });
});
