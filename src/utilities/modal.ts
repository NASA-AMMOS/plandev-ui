import AboutModal from '../components/modals/AboutModal.svelte';
import ConfirmModal from '../components/modals/ConfirmModal.svelte';

export function modalBodyClickListener() {
  const target = document.querySelector('#svelte-modal');
  if (target) {
    target.replaceChildren();
  }
}

export function modalBodyKeyListener(event: KeyboardEvent) {
  const target = document.querySelector('#svelte-modal');
  if (target && event.key == 'Escape') {
    target.replaceChildren();
  }
}

export async function showAboutModal(): Promise<boolean> {
  return new Promise(resolve => {
    const target = document.querySelector('#svelte-modal');

    if (target) {
      const aboutModal = new AboutModal({ target });

      aboutModal.$on('close', () => {
        target.replaceChildren();
        resolve(true);
      });
    }
  });
}

export async function showConfirmModal(confirmText: string, message: string, title: string): Promise<boolean> {
  return new Promise(resolve => {
    const target = document.querySelector('#svelte-modal');

    if (target) {
      const confirmModal = new ConfirmModal({
        props: { confirmText, message, title },
        target,
      });

      confirmModal.$on('close', () => {
        target.replaceChildren();
        resolve(false);
      });

      confirmModal.$on('confirm', () => {
        target.replaceChildren();
        resolve(true);
      });
    }
  });
}
