import { isMacOs } from './generic';

export function isDeleteEvent(event: KeyboardEvent) {
  return event.key === 'Delete' || event.key === 'Backspace';
}

export function isSaveEvent(event: KeyboardEvent) {
  return (isMacOs() ? event.metaKey : event.ctrlKey) && event.key === 's';
}
