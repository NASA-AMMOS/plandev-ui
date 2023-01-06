import { screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { showFailureToast, showSuccessToast } from './toast';

interface ElementLikeObject {
  textContent: string;
}

interface ToastifyOptions {
  callback: (toastElement: ElementLikeObject) => void;
  text: string;
}

vi.mock('toastify-js', () => {
  const Toastify = vi.fn().mockImplementation((options: ToastifyOptions) => {
    if (options.callback) {
      setTimeout(() => options.callback({ textContent: options.text }), 1000);
    }

    const toastDiv = document.createElement('div');
    toastDiv.className = 'toast';
    toastDiv.textContent = options.text;

    return {
      hideToast: () => {
        if (options.callback) {
          options.callback({ textContent: options.text });
        }

        document.body.removeChild(toastDiv);
      },
      options: { text: options.text },
      showToast: () => {
        document.body.appendChild(toastDiv);
      },
    };
  });

  return { default: Toastify };
});

describe('Toastify utility', () => {
  it('Should properly show a failure toast without showing duplicates', () => {
    showFailureToast('Failed!');
    showFailureToast('Failed!');
    const failedToasts = screen.getAllByText('Failed!');

    expect(failedToasts.length).toEqual(1);

    showSuccessToast('Success!');
    showSuccessToast('Success!');
    const successToasts = screen.getAllByText('Success!');

    expect(successToasts.length).toEqual(1);
  });
});
