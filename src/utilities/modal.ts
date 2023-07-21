import AboutModal from '../components/modals/AboutModal.svelte';
import ConfirmModal from '../components/modals/ConfirmModal.svelte';
import CreatePlanBranchModal from '../components/modals/CreatePlanBranchModal.svelte';
import CreateViewModal from '../components/modals/CreateViewModal.svelte';
import DeleteActivitiesModal from '../components/modals/DeleteActivitiesModal.svelte';
import EditViewModal from '../components/modals/EditViewModal.svelte';
import ExpansionSequenceModal from '../components/modals/ExpansionSequenceModal.svelte';
import MergeReviewEndedModal from '../components/modals/MergeReviewEndedModal.svelte';
import PlanBranchesModal from '../components/modals/PlanBranchesModal.svelte';
import PlanBranchRequestModal from '../components/modals/PlanBranchRequestModal.svelte';
import PlanLockedModal from '../components/modals/PlanLockedModal.svelte';
import PlanMergeRequestsModal from '../components/modals/PlanMergeRequestsModal.svelte';
import SavedViewsModal from '../components/modals/SavedViewsModal.svelte';
import UploadViewModal from '../components/modals/UploadViewModal.svelte';
import type { ActivityDirectiveDeletionMap, ActivityDirectiveId } from '../types/activity';
import type { User } from '../types/app';
import type { ExpansionSequence } from '../types/expansion';
import type { ModalElement, ModalElementValue } from '../types/modal';
import type { Plan, PlanBranchRequestAction, PlanMergeRequestStatus, PlanMergeRequestTypeFilter } from '../types/plan';
import type { ViewDefinition } from '../types/view';

/**
 * Listens for clicks on the document body and removes the modal children.
 */
export function modalBodyClickListener(): void {
  const target: ModalElement | null = document.querySelector('#svelte-modal');
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
  const target: ModalElement | null = document.querySelector('#svelte-modal');
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
  const target: ModalElement | null = document.querySelector('#svelte-modal');
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
    const target: ModalElement | null = document.querySelector('#svelte-modal');

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
    const target: ModalElement | null = document.querySelector('#svelte-modal');

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
 * Shows a PlanLockedModal component with the supplied arguments.
 */
export async function showPlanLockedModal(planId: number): Promise<ModalElementValue> {
  return new Promise(resolve => {
    const target: ModalElement | null = document.querySelector('#svelte-modal');

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
 * Shows a PlanLockedModal component with the supplied arguments.
 */
export async function showMergeReviewEndedModal(
  planId: number,
  status: PlanMergeRequestStatus,
): Promise<ModalElementValue> {
  return new Promise(resolve => {
    const target: ModalElement | null = document.querySelector('#svelte-modal');

    if (target) {
      const mergeReviewEndedModal = new MergeReviewEndedModal({
        props: { planId, status },
        target,
      });
      target.resolve = resolve;

      // Do not allow users to dismiss this modal
      target.setAttribute('data-dismissible', 'false');

      mergeReviewEndedModal.$on('close', () => {
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
    const target: ModalElement | null = document.querySelector('#svelte-modal');

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
export async function showCreateViewModal(): Promise<ModalElementValue<{ modelId: number; name: string }>> {
  return new Promise(resolve => {
    const target: ModalElement | null = document.querySelector('#svelte-modal');

    if (target) {
      const createViewModal = new CreateViewModal({ target });
      target.resolve = resolve;

      createViewModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: false });
      });

      createViewModal.$on('create', (e: CustomEvent<{ modelId: number; name: string }>) => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: true, value: e.detail });
      });
    }
  });
}

/**
 * Shows an DeleteActivitiesModal component.
 */
export async function showDeleteActivitiesModal(
  ids: ActivityDirectiveId[],
): Promise<ModalElementValue<ActivityDirectiveDeletionMap>> {
  return new Promise(resolve => {
    const target: ModalElement | null = document.querySelector('#svelte-modal');

    if (target) {
      const deleteActivitiesModal = new DeleteActivitiesModal({
        props: { activityIds: ids },
        target,
      });
      target.resolve = resolve;

      deleteActivitiesModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: false });
      });

      deleteActivitiesModal.$on('delete', (e: CustomEvent<ActivityDirectiveDeletionMap>) => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: true, value: e.detail });
      });
    }
  });
}

/**
 * Shows an EditViewModal component.
 */
export async function showEditViewModal(): Promise<ModalElementValue<{ id: number; modelId: number; name: string }>> {
  return new Promise(resolve => {
    const target: ModalElement | null = document.querySelector('#svelte-modal');

    if (target) {
      const editViewModal = new EditViewModal({ target });
      target.resolve = resolve;

      editViewModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: false });
      });

      editViewModal.$on('save', (e: CustomEvent<{ id: number; modelId: number; name: string }>) => {
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
export async function showExpansionSequenceModal(
  expansionSequence: ExpansionSequence,
  user: User | null,
): Promise<ModalElementValue> {
  return new Promise(resolve => {
    const target: ModalElement | null = document.querySelector('#svelte-modal');

    if (target) {
      const sequenceModal = new ExpansionSequenceModal({ props: { expansionSequence, user }, target });
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
    const target: ModalElement | null = document.querySelector('#svelte-modal');

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
    const target: ModalElement | null = document.querySelector('#svelte-modal');

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
  user: User | null,
  selectedFilter?: PlanMergeRequestTypeFilter,
): Promise<ModalElementValue> {
  return new Promise(resolve => {
    const target: ModalElement | null = document.querySelector('#svelte-modal');

    if (target) {
      const planMergeRequestsModal = new PlanMergeRequestsModal({ props: { selectedFilter, user }, target });
      target.resolve = resolve;

      planMergeRequestsModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: false });
      });
    }
  });
}

/**
 * Shows a SavedViewsModal component.
 */
export async function showSavedViewsModal(
  user: User | null,
): Promise<ModalElementValue<{ id: number; modelId: number; name: string }>> {
  return new Promise(resolve => {
    const target: ModalElement | null = document.querySelector('#svelte-modal');

    if (target) {
      const savedViewsModal = new SavedViewsModal({ props: { height: 400, user, width: '50%' }, target });
      target.resolve = resolve;

      savedViewsModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: false });
      });
    }
  });
}

/**
 * Shows a UploadViewModal component.
 */
export async function showUploadViewModal(): Promise<ModalElementValue<{ definition: ViewDefinition; name: string }>> {
  return new Promise(resolve => {
    const target: ModalElement | null = document.querySelector('#svelte-modal');

    if (target) {
      const uploadViewModal = new UploadViewModal({ target });
      target.resolve = resolve;

      uploadViewModal.$on('close', () => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: false });
      });

      uploadViewModal.$on('upload', (e: CustomEvent<{ definition: ViewDefinition; name: string }>) => {
        target.replaceChildren();
        target.resolve = null;
        resolve({ confirm: true, value: e.detail });
      });
    }
  });
}
