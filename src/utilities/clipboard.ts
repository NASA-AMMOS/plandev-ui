export function setClipboardContent(content: any, success?: () => void, fail?: () => void) {
  let contentString = '';

  if (typeof content === 'object') {
    contentString = JSON.stringify(content);
  } else {
    contentString = content;
  }
  navigator.clipboard.writeText(contentString).then(
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
