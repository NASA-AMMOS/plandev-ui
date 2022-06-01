import AboutModal from '../components/modals/AboutModal.svelte';
import ConfirmModal from '../components/modals/ConfirmModal.svelte';

/**
 * Listens for clicks on the document body and removes the modal children.
 */
export function modalBodyClickListener() {
  const target: HtmlModalElement = document.querySelector('#svelte-modal');
  if (target && target.resolve) {
    target.replaceChildren();
    target.resolve(false);
    target.resolve = null;
  }
}

/**
 * Listens for escape key presses on the document body and removes the modal children.
 */
export function modalBodyKeyListener(event: KeyboardEvent) {
  const target: HtmlModalElement = document.querySelector('#svelte-modal');
  if (target && target.resolve && event.key == 'Escape') {
    target.replaceChildren();
    target.resolve(false);
    target.resolve = null;
  }
}

/**
 * Shows an AboutModal component.
 */
export async function showAboutModal(): Promise<boolean> {
  return new Promise(resolve => {
    const target: HtmlModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const aboutModal = new AboutModal({ target });
      target.resolve = resolve;

      aboutModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve(true);
      });
    }
  });
}

/**
 * Shows a ConfirmModal component with the supplied arguments.
 */
export async function showConfirmModal(confirmText: string, message: string, title: string): Promise<boolean> {
  return new Promise(resolve => {
    const target: HtmlModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const confirmModal = new ConfirmModal({
        props: { confirmText, message, title },
        target,
      });
      target.resolve = resolve;

      confirmModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve(false);
      });

      confirmModal.$on('confirm', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve(true);
      });
    }
  });
}
