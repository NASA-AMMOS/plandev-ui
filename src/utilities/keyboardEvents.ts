import { isMacOs } from './generic';

export function isMetaOrCtrlPressed(event: KeyboardEvent | MouseEvent) {
  return isMacOs() ? event.metaKey : event.ctrlKey;
}

export function isDeleteEvent(event: KeyboardEvent) {
  return event.key === 'Delete' || event.key === 'Backspace';
}

export function isSaveEvent(event: KeyboardEvent) {
  return isMetaOrCtrlPressed(event) && event.key === 's';
}
