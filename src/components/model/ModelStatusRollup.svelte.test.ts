import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ModelStatusRollup from './ModelStatusRollup.svelte';

describe('Model Status Rollup', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Full mode', () => {
    it('Should display an activity log error', () => {
      const testError = 'Test Activity Error';
      const { queryByLabelText } = render(ModelStatusRollup, {
        props: {
          mode: 'full',
          model: {
            refresh_activity_type_logs: [
              {
                error: '',
                error_message: testError,
                success: false,
              },
            ],
            refresh_model_parameter_logs: [],
            refresh_resource_type_logs: [],
          },
        },
      });
      expect(queryByLabelText(testError)).not.toBeNull();
    });

    it('Should display a model parameter log error', () => {
      const testError = 'Test Parameter Error';
      const { queryByLabelText } = render(ModelStatusRollup, {
        props: {
          mode: 'full',
          model: {
            refresh_activity_type_logs: [],
            refresh_model_parameter_logs: [
              {
                error: '',
                error_message: testError,
                success: false,
              },
            ],
            refresh_resource_type_logs: [],
          },
        },
      });
      expect(queryByLabelText(testError)).not.toBeNull();
    });

    it('Should display a resource log error', () => {
      const testError = 'Test Resource Error';
      const { queryByLabelText } = render(ModelStatusRollup, {
        props: {
          mode: 'full',
          model: {
            refresh_activity_type_logs: [],
            refresh_model_parameter_logs: [],
            refresh_resource_type_logs: [
              {
                error: '',
                error_message: testError,
                success: false,
              },
            ],
          },
        },
      });
      expect(queryByLabelText(testError)).not.toBeNull();
    });
  });

  describe('Rollup mode', () => {
    it('Should display "extracting" when no logs are present in the model', () => {
      const { getByText } = render(ModelStatusRollup, {
        props: {
          mode: 'rollup',
          model: {
            refresh_activity_type_logs: [],
            refresh_model_parameter_logs: [],
            refresh_resource_type_logs: [],
          },
        },
      });

      expect(getByText('Extracting', { exact: true })).not.toBeNull();
    });

    it('Should display "extracted" when all logs have a success', () => {
      const { getByText } = render(ModelStatusRollup, {
        props: {
          mode: 'rollup',
          model: {
            refresh_activity_type_logs: [
              {
                error: '',
                error_message: '',
                success: true,
              },
            ],
            refresh_model_parameter_logs: [
              {
                error: '',
                error_message: '',
                success: true,
              },
            ],
            refresh_resource_type_logs: [
              {
                error: '',
                error_message: '',
                success: true,
              },
            ],
          },
        },
      });

      expect(getByText('Extracted', { exact: true })).not.toBeNull();
    });

    it('Should display "extracted" when all logs have a success', () => {
      const { getByText } = render(ModelStatusRollup, {
        props: {
          mode: 'rollup',
          model: {
            refresh_activity_type_logs: [
              {
                error: '',
                error_message: '',
                success: true,
              },
            ],
            refresh_model_parameter_logs: [
              {
                error: '',
                error_message: 'Test Error',
                success: false,
              },
            ],
            refresh_resource_type_logs: [
              {
                error: '',
                error_message: '',
                success: true,
              },
            ],
          },
        },
      });

      expect(getByText('Errors extracting', { exact: true })).not.toBeNull();
    });

    it('Should not display an activity log error when in rollup mode', () => {
      const testError = 'Test Activity Error';
      const { queryByLabelText } = render(ModelStatusRollup, {
        props: {
          mode: 'rollup',
          model: {
            refresh_activity_type_logs: [
              {
                error: '',
                error_message: testError,
                success: false,
              },
            ],
            refresh_model_parameter_logs: [],
            refresh_resource_type_logs: [],
          },
        },
      });
      expect(queryByLabelText(testError)).toBeNull();
    });

    it('Should not display a model parameter log error when in rollup mode', () => {
      const testError = 'Test Parameter Error';
      const { queryByLabelText } = render(ModelStatusRollup, {
        props: {
          mode: 'rollup',
          model: {
            refresh_activity_type_logs: [],
            refresh_model_parameter_logs: [
              {
                error: '',
                error_message: testError,
                success: false,
              },
            ],
            refresh_resource_type_logs: [],
          },
        },
      });
      expect(queryByLabelText(testError)).toBeNull();
    });

    it('Should not display a resource log error when in rollup mode', () => {
      const testError = 'Test Resource Error';
      const { queryByLabelText } = render(ModelStatusRollup, {
        props: {
          mode: 'rollup',
          model: {
            refresh_activity_type_logs: [],
            refresh_model_parameter_logs: [],
            refresh_resource_type_logs: [
              {
                error: '',
                error_message: testError,
                success: false,
              },
            ],
          },
        },
      });
      expect(queryByLabelText(testError)).toBeNull();
    });
  });

  describe('Icon Only mode', () => {
    it('Should display not "extracting" when no logs are present in the model when in iconOnly mode', () => {
      const { queryByText } = render(ModelStatusRollup, {
        props: {
          mode: 'iconOnly',
          model: {
            refresh_activity_type_logs: [],
            refresh_model_parameter_logs: [],
            refresh_resource_type_logs: [],
          },
        },
      });

      expect(queryByText('Extracting', { exact: true })).toBeNull();
    });

    it('Should display not "extracted" when all logs have a success when in iconOnly mode', () => {
      const { queryByText } = render(ModelStatusRollup, {
        props: {
          mode: 'iconOnly',
          model: {
            refresh_activity_type_logs: [
              {
                error: '',
                error_message: '',
                success: true,
              },
            ],
            refresh_model_parameter_logs: [
              {
                error: '',
                error_message: '',
                success: true,
              },
            ],
            refresh_resource_type_logs: [
              {
                error: '',
                error_message: '',
                success: true,
              },
            ],
          },
        },
      });

      expect(queryByText('Extracted', { exact: true })).toBeNull();
    });

    it('Should display not "extracted" when all logs have a success when in iconOnly mode', () => {
      const { queryByText } = render(ModelStatusRollup, {
        props: {
          mode: 'iconOnly',
          model: {
            refresh_activity_type_logs: [
              {
                error: '',
                error_message: '',
                success: true,
              },
            ],
            refresh_model_parameter_logs: [
              {
                error: '',
                error_message: 'Test Error',
                success: false,
              },
            ],
            refresh_resource_type_logs: [
              {
                error: '',
                error_message: '',
                success: true,
              },
            ],
          },
        },
      });

      expect(queryByText('Errors extracting', { exact: true })).toBeNull();
    });
  });
});
