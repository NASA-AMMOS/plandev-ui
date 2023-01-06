import Toastify from 'toastify-js';

interface Toast {
  hideToast: () => void;
  readonly options: Toastify.Options;
  showToast: () => void;
  readonly toastElement: Element | null;
}

let currentToasts: Toast[] = [];

function findToast(toastText: string) {
  return currentToasts.findIndex(toast => toast.options.text === toastText);
}

function removeToast(toastText: string) {
  const toastIndex = findToast(toastText);

  if (toastIndex > -1) {
    currentToasts[toastIndex].hideToast();
    currentToasts = [...currentToasts.slice(0, toastIndex), ...currentToasts.slice(toastIndex + 1)];
  }
}

function toastCallback(this: Element) {
  removeToast(this.textContent);
}

function showToast(toast: Toast) {
  const toastText = toast.options.text;
  const existingToastIndex = findToast(toastText);

  if (existingToastIndex > -1) {
    currentToasts[existingToastIndex].hideToast();
  }

  toast.showToast();
  currentToasts.push(toast);
}

export function showFailureToast(text: string): void {
  const toast = Toastify({
    backgroundColor: '#a32a2a',
    callback: toastCallback,
    className: 'st-typography-body',
    duration: 3000,
    gravity: 'bottom',
    position: 'left',
    text,
  });
  showToast(toast);
}

export function showSuccessToast(text: string): void {
  const toast = Toastify({
    backgroundColor: '#2da44e',
    callback: toastCallback,
    className: 'st-typography-body',
    duration: 3000,
    gravity: 'bottom',
    position: 'left',
    text,
  });
  showToast(toast);
}
