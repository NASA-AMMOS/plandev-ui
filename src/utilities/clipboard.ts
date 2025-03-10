export function setClipboardContent(content: object, success?: () => void, fail?: () => void) {
  navigator.clipboard.writeText(JSON.stringify(content)).then(
    () => {
      if (success !== undefined) {
        success(); //optional success callback
      }
    },
    () => {
      if (fail !== undefined) {
        fail(); //optional fail callback
      }
    },
  );
}

export async function getClipboardContent(): Promise<string | void> {
  try {
    return await window.navigator.clipboard.readText();
  } catch (e) {
    console.error(e);
  }
}
