import { screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { LogMessage } from '../types/console';
import { ErrorTypes } from './errors';
import { CompoundError } from './requests';
import { showFailureToast, showSuccessToast } from './toast';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('./login', () => ({ logout: vi.fn() }));

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
      setTimeout(() => options.callback({ textContent: options.text }), 300);
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
      options,
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

  it('Should prefix the fallback label onto a backend message from a CompoundError', () => {
    const ce = new CompoundError('Could not find workspace 42.', [
      makeLogMessage({ message: 'Could not find workspace 42.', type: ErrorTypes.NO_SUCH_WORKSPACE }),
    ]);
    showFailureToast('Workspace File Save Failed', ce);
    expect(screen.getAllByText('Workspace File Save Failed: Could not find workspace 42.').length).toBe(1);
  });

  it('Should fall back to the static label when no backend message is extractable', () => {
    showFailureToast('Generic Plain Error Toast', new Error('plain error'));
    expect(screen.getAllByText('Generic Plain Error Toast').length).toBe(1);
  });

  it('Should truncate the combined toast text to 200 chars with an ellipsis', () => {
    const long = 'x'.repeat(300);
    const ce = new CompoundError(long, [makeLogMessage({ message: long })]);
    showFailureToast('Long Label', ce);
    const matches = screen.getAllByText(/^Long Label: x+…$/);
    expect(matches.length).toBe(1);
    expect(matches[0].textContent!.length).toBe(200);
  });
});

function makeLogMessage(overrides: Partial<LogMessage> = {}): LogMessage {
  return {
    level: 'error',
    message: '',
    timestamp: '2026-05-21T00:00:00Z',
    type: ErrorTypes.CAUGHT_ERROR,
    ...overrides,
  };
}
