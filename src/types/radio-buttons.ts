import type { Writable } from 'svelte/store';

export type RadioButtonId = number | string | Record<string, never>;

export interface RadioButtonContext {
  registerRadioButton: (radioButtonId: RadioButtonId) => void;
  selectRadioButton: (radioButtonId: RadioButtonId) => void;
  selectedRadioButton: Writable<RadioButtonId>;
  unregisterRadioButton: (radioButtonId: RadioButtonId) => void;
}
