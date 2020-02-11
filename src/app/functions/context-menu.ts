import { MatMenuTrigger } from '@angular/material/menu';

/**
 * Opens a context menu for a given menu trigger.
 * @see https://github.com/angular/components/issues/5007
 */
export function contextMenu(
  event: MouseEvent,
  trigger: MatMenuTrigger,
  data: any,
) {
  event.preventDefault();
  // @ts-ignore
  const triggerElement: HTMLElement = trigger._element.nativeElement;
  triggerElement.style.setProperty('left', `${event.clientX}px`);
  triggerElement.style.setProperty('position', 'fixed');
  triggerElement.style.setProperty('top', `${event.clientY}px`);
  triggerElement.style.setProperty('visibility', 'hidden');
  trigger.menuData = { data };
  trigger.menu.focusFirstItem('mouse');
  trigger.openMenu();
}
