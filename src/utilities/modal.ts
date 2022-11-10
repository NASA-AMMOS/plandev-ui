import AboutModal from '../components/modals/AboutModal.svelte';
import ConfirmModal from '../components/modals/ConfirmModal.svelte';
import CreatePlanBranchModal from '../components/modals/CreatePlanBranchModal.svelte';
import CreateViewModal from '../components/modals/CreateViewModal.svelte';
import ExpansionSequenceModal from '../components/modals/ExpansionSequenceModal.svelte';
import PlanBranchesModal from '../components/modals/PlanBranchesModal.svelte';
import PlanBranchRequestModal from '../components/modals/PlanBranchRequestModal.svelte';
import PlanLockedModal from '../components/modals/PlanLockedModal.svelte';
import PlanMergeRequestsModal from '../components/modals/PlanMergeRequestsModal.svelte';

/**
 * Listens for clicks on the document body and removes the modal children.
 */
export function modalBodyClickListener(): void {
  const target: ModalElement = document.querySelector('#svelte-modal');
  if (target && target.resolve && target.getAttribute('data-dismissible') !== 'false') {
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
  if (target && target.resolve && event.key == 'Escape' && target.getAttribute('data-dismissible') !== 'false') {
    target.replaceChildren();
    target.resolve({ confirm: false });
    target.resolve = null;
  }
}

/**
 * Closes the active modal if found and resolve nothing
 */
export function closeActiveModal(): void {
  const target: ModalElement = document.querySelector('#svelte-modal');
  if (target && target.resolve) {
    target.removeAttribute('data-dismissible');
    target.replaceChildren();
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
  actionCanBeUndone?: boolean,
): Promise<ModalElementValue> {
  return new Promise(resolve => {
    const target: ModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const confirmModal = new ConfirmModal({
        props: { actionCanBeUndone, confirmText, message, title },
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
 * Shows a ConfirmModal component with the supplied arguments.
 */
export async function showPlanLockedModal(planId: number): Promise<ModalElementValue> {
  return new Promise(resolve => {
    const target: ModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const planLockedModal = new PlanLockedModal({
        props: { planId },
        target,
      });
      target.resolve = resolve;

      // Do not allow users to dismiss this modal
      target.setAttribute('data-dismissible', 'false');

      planLockedModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        target.removeAttribute('data-dismissible');
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
 * Shows a PlanBranchRequestModal with the supplied arguments.
 */
export async function showPlanBranchRequestModal(
  plan: Plan,
  action: PlanBranchRequestAction,
): Promise<ModalElementValue<{ source_plan_id: number; target_plan_id: number }>> {
  return new Promise(resolve => {
    const target: ModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const planModal = new PlanBranchRequestModal({ props: { action, plan }, target });
      target.resolve = resolve;

      planModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: false });
      });

      planModal.$on('create', (e: CustomEvent<{ source_plan_id: number; target_plan_id: number }>) => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: true, value: e.detail });
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

/**
 * Shows a PlanMergeRequestsModal with the supplied arguments.
 */
export async function showPlanMergeRequestsModal(
  selectedFilter?: PlanMergeRequestTypeFilter,
): Promise<ModalElementValue> {
  return new Promise(resolve => {
    const target: ModalElement = document.querySelector('#svelte-modal');

    if (target) {
      const planMergeRequestsModal = new PlanMergeRequestsModal({ props: { selectedFilter }, target });
      target.resolve = resolve;

      planMergeRequestsModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: false });
      });
    }
  });
}
