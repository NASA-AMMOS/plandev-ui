export function setSessionStorageClipboard(content: string) {
  sessionStorage.setItem(`aerie_clipboard`, content);
}

export function getSessionStorageClipboard(): string | null {
  return sessionStorage.getItem(`aerie_clipboard`);
}
