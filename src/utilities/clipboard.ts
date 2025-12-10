import { showFailureToast, showSuccessToast } from './toast';

export function setClipboardContent(
  content: any,
  successMessage: string = 'Copied to clipboard',
  failureMessage: string = 'Failed to copy to clipboard',
): void {
  let contentString = '';

  if (typeof content === 'object') {
    contentString = JSON.stringify(content);
  } else {
    contentString = content;
  }
  navigator.clipboard.writeText(contentString).then(
    () => showSuccessToast(successMessage),
    () => showFailureToast(failureMessage),
  );
}

export async function getClipboardContent(): Promise<string | void> {
  try {
    return await window.navigator.clipboard.readText();
  } catch (e) {
    console.error(e);
  }
}
