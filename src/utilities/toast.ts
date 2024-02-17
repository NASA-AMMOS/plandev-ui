import Toastify from 'toastify-js';

interface Toast {
  hideToast: () => void;
  readonly options: Toastify.Options;
  showToast: () => void;
  readonly toastElement: Element | null;
}

let currentToasts: Toast[] = [];

function findToast(toastText: string, checkIsClosed: boolean = false) {
  return currentToasts.findIndex(
    toast => toast.options.text === toastText && ((checkIsClosed && toast.options.close === false) || !checkIsClosed),
  );
}

function hideToast(toast: Toast) {
  // Only hide toast if in browser context
  if (typeof document === 'undefined') {
    return;
  }

  toast.options.close = true;
  toast.hideToast();
}

function removeToast(toastText: string) {
  const toastIndex = findToast(toastText);

  if (toastIndex > -1) {
    currentToasts = [...currentToasts.slice(0, toastIndex), ...currentToasts.slice(toastIndex + 1)];
  }
}

function toastCallback(this: Element) {
  if (this.textContent) {
    removeToast(this.textContent);
  }
}

function showToast(toast: Toast) {
  // Only show toast if in browser context
  if (typeof document === 'undefined') {
    return;
  }
  const toastText = toast.options.text;
  const existingToastIndex = toastText !== undefined ? findToast(toastText, true) : -1;

  if (existingToastIndex > -1) {
    hideToast(currentToasts[existingToastIndex]);
  }

  toast.showToast();
  currentToasts.push(toast);
}

export function showFailureToast(text: string): void {
  const toast = Toastify({
    backgroundColor: '#a32a2a',
    callback: toastCallback,
    className: 'st-typography-body',
    close: false,
    duration: 3000,
    gravity: 'bottom',
    offset: {
      x: 0,
      y: 30,
    },
    position: 'right',
    text,
  });
  showToast(toast);
}

export function showSuccessToast(text: string): void {
  const toast = Toastify({
    backgroundColor: '#2da44e',
    callback: toastCallback,
    className: 'st-typography-body',
    close: false,
    duration: 3000,
    gravity: 'bottom',
    offset: {
      x: 0,
      y: 30,
    },
    position: 'right',
    text,
  });
  showToast(toast);
}
