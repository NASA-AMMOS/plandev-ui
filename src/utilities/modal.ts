import AboutModal from '../components/modals/AboutModal.svelte';
import ConfirmModal from '../components/modals/ConfirmModal.svelte';
import CreatePlanBranchModal from '../components/modals/CreatePlanBranchModal.svelte';
import CreateViewModal from '../components/modals/CreateViewModal.svelte';
import ExpansionSequenceModal from '../components/modals/ExpansionSequenceModal.svelte';
import PlanBranchesModal from '../components/modals/PlanBranchesModal.svelte';

/**
 * Listens for clicks on the document body and removes the modal children.
 */
export function modalBodyClickListener(): void {
  const target: ModalElement = document.querySelector('#svelte-modal');
  if (target && target.resolve) {
    target.replaceChildren();
    target.resolve({ confirm: false });
    target.resolve = null;
  }
}

/**
 * Listens for escape key presses on the document body and removes the modal children.
 */
export function modalBodyKeyListener(event: KeyboardEvent): void {
  const target: ModalElement = document.querySelector('#svelte-modal');
  if (target && target.resolve && event.key == 'Escape') {
    target.replaceChildren();
    target.resolve({ confirm: false });
    target.resolve = null;
  }
}

/**
 * Shows an AboutModal component.
 */
export async function showAboutModal(): Promise<ModalElementValue> {
  return new Promise(resolve => {
    const target: ModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const aboutModal = new AboutModal({ target });
      target.resolve = resolve;

      aboutModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: true });
      });
    }
  });
}

/**
 * Shows a ConfirmModal component with the supplied arguments.
 */
export async function showConfirmModal(
  confirmText: string,
  message: string,
  title: string,
): Promise<ModalElementValue> {
  return new Promise(resolve => {
    const target: ModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const confirmModal = new ConfirmModal({
        props: { confirmText, message, title },
        target,
      });
      target.resolve = resolve;

      confirmModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: false });
      });

      confirmModal.$on('confirm', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: true });
      });
    }
  });
}

/**
 * Shows a CreatePlanBranchModal with the supplied arguments.
 */
export async function showCreatePlanBranchModal(plan: Plan): Promise<ModalElementValue<{ name: string; plan: Plan }>> {
  return new Promise(resolve => {
    const target: ModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const createPlanBranchModal = new CreatePlanBranchModal({ props: { plan }, target });
      target.resolve = resolve;

      createPlanBranchModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: false });
      });

      createPlanBranchModal.$on('create', (e: CustomEvent<{ name: string; plan: Plan }>) => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: true, value: e.detail });
      });
    }
  });
}

/**
 * Shows a CreateViewModal component.
 */
export async function showCreateViewModal(): Promise<ModalElementValue<{ name: string }>> {
  return new Promise(resolve => {
    const target: ModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const createViewModal = new CreateViewModal({ target });
      target.resolve = resolve;

      createViewModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: false });
      });

      createViewModal.$on('create', (e: CustomEvent<{ name: string }>) => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: true, value: e.detail });
      });
    }
  });
}

/**
 * Shows a SequenceModal with the supplied arguments.
 */
export async function showExpansionSequenceModal(expansionSequence: ExpansionSequence): Promise<ModalElementValue> {
  return new Promise(resolve => {
    const target: ModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const sequenceModal = new ExpansionSequenceModal({ props: { expansionSequence }, target });
      target.resolve = resolve;

      sequenceModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: true });
      });
    }
  });
}

/**
 * Shows an PlanBranchesModal component with the supplied arguments.
 */
export async function showPlanBranchesModal(plan: Plan): Promise<ModalElementValue> {
  return new Promise(resolve => {
    const target: ModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const planBranchesModal = new PlanBranchesModal({ props: { plan }, target });
      target.resolve = resolve;

      planBranchesModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: true });
      });
    }
  });
}
