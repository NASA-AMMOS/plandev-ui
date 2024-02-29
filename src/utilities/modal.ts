import { browser } from '$app/environment';
import AboutModal from '../components/modals/AboutModal.svelte';
import ConfirmModal from '../components/modals/ConfirmModal.svelte';
import CreatePlanBranchModal from '../components/modals/CreatePlanBranchModal.svelte';
import CreatePlanSnapshotModal from '../components/modals/CreatePlanSnapshotModal.svelte';
import CreateViewModal from '../components/modals/CreateViewModal.svelte';
import DeleteActivitiesModal from '../components/modals/DeleteActivitiesModal.svelte';
import EditViewModal from '../components/modals/EditViewModal.svelte';
import ExpansionSequenceModal from '../components/modals/ExpansionSequenceModal.svelte';
import ManagePlanConstraintsModal from '../components/modals/ManagePlanConstraintsModal.svelte';
import MergeReviewEndedModal from '../components/modals/MergeReviewEndedModal.svelte';
import PlanBranchRequestModal from '../components/modals/PlanBranchRequestModal.svelte';
import PlanBranchesModal from '../components/modals/PlanBranchesModal.svelte';
import PlanLockedModal from '../components/modals/PlanLockedModal.svelte';
import PlanMergeRequestsModal from '../components/modals/PlanMergeRequestsModal.svelte';
import RestorePlanSnapshotModal from '../components/modals/RestorePlanSnapshotModal.svelte';
import SavedViewsModal from '../components/modals/SavedViewsModal.svelte';
import UploadViewModal from '../components/modals/UploadViewModal.svelte';
import type { ActivityDirectiveDeletionMap, ActivityDirectiveId } from '../types/activity';
import type { User } from '../types/app';
import type { ExpansionSequence } from '../types/expansion';
import type { ModalElement, ModalElementValue } from '../types/modal';
import type {
  Plan,
  PlanBranchRequestAction,
  PlanForMerging,
  PlanMergeRequestStatus,
  PlanMergeRequestTypeFilter,
} from '../types/plan';
import type { PlanSnapshot } from '../types/plan-snapshot';
import type { Tag } from '../types/tags';
import type { ViewDefinition } from '../types/view';

/**
 * Listens for clicks on the document body and removes the modal children.
 */
export function modalBodyClickListener(): void {
  if (browser) {
    const target: ModalElement | null = document.querySelector('#svelte-modal');
    if (target && target.resolve && target.getAttribute('data-dismissible') !== 'false') {
      target.replaceChildren();
      target.resolve({ confirm: false });
      target.resolve = null;
    }
  }
}

/**
 * Listens for escape key presses on the document body and removes the modal children.
 */
export function modalBodyKeyListener(event: KeyboardEvent): void {
  if (browser) {
    const target: ModalElement | null = document.querySelector('#svelte-modal');
    if (target && target.resolve && event.key === 'Escape' && target.getAttribute('data-dismissible') !== 'false') {
      target.replaceChildren();
      target.resolve({ confirm: false });
      target.resolve = null;
    }
  }
}

/**
 * Closes the active modal if found and resolve nothing
 */
export function closeActiveModal(): void {
  if (browser) {
    const target: ModalElement | null = document.querySelector('#svelte-modal');
    if (target && target.resolve) {
      target.removeAttribute('data-dismissible');
      target.replaceChildren();
      target.resolve = null;
    }
  }
}

/**
 * Shows an AboutModal component.
 */
export async function showAboutModal(): Promise<ModalElementValue> {
  return new Promise(resolve => {
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const aboutModal = new AboutModal({ target });
        target.resolve = resolve;

        aboutModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: true });
          aboutModal.$destroy(); // destroy the component since it was manually invoked
        });
      }
    } else {
      resolve({ confirm: false });
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
  cancelText?: string,
): Promise<ModalElementValue> {
  return new Promise(resolve => {
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const confirmModal = new ConfirmModal({
          props: { actionCanBeUndone, cancelText, confirmText, message, title },
          target,
        });
        target.resolve = resolve;

        confirmModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: false });
          confirmModal.$destroy();
        });

        confirmModal.$on('confirm', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: true });
          confirmModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
    }
  });
}

/**
 * Shows an ManagePlanConstraintsModal component with the supplied arguments.
 */
export async function showManagePlanConstraintsModal(user: User | null): Promise<ModalElementValue> {
  return new Promise(resolve => {
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const managePlanConstraintsModal = new ManagePlanConstraintsModal({
          props: { user },
          target,
        });
        target.resolve = resolve;

        managePlanConstraintsModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          target.removeAttribute('data-dismissible');
          managePlanConstraintsModal.$destroy();
        });

        managePlanConstraintsModal.$on(
          'add',
          (e: CustomEvent<{ constraindId: number; constraintRevision: number }[]>) => {
            target.replaceChildren();
            target.resolve = null;
            resolve({ confirm: true, value: e.detail });
            managePlanConstraintsModal.$destroy();
          },
        );
      }
    } else {
      resolve({ confirm: false });
    }
  });
}

/**
 * Shows a PlanLockedModal component with the supplied arguments.
 */
export async function showPlanLockedModal(planId: number): Promise<ModalElementValue> {
  return new Promise(resolve => {
    if (browser) {
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
          planLockedModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
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
    if (browser) {
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
          mergeReviewEndedModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
    }
  });
}

/**
 * Shows a CreatePlanBranchModal with the supplied arguments.
 */
export async function showCreatePlanBranchModal(plan: Plan): Promise<ModalElementValue<{ name: string; plan: Plan }>> {
  return new Promise(resolve => {
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const createPlanBranchModal = new CreatePlanBranchModal({ props: { plan }, target });
        target.resolve = resolve;

        createPlanBranchModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: false });
          createPlanBranchModal.$destroy();
        });

        createPlanBranchModal.$on('create', (e: CustomEvent<{ name: string; plan: Plan }>) => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: true, value: e.detail });
          createPlanBranchModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
    }
  });
}

/**
 * Shows a CreatePlanSnapshotModal with the supplied arguments.
 */
export async function showCreatePlanSnapshotModal(
  plan: Plan,
  user: User | null,
): Promise<ModalElementValue<{ description: string; name: string; plan: Plan; tags: Tag[] }>> {
  return new Promise(resolve => {
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const createPlanSnapshotModal = new CreatePlanSnapshotModal({ props: { plan, user }, target });
        target.resolve = resolve;

        createPlanSnapshotModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: false });
          createPlanSnapshotModal.$destroy();
        });

        createPlanSnapshotModal.$on(
          'create',
          (e: CustomEvent<{ description: string; name: string; plan: Plan; tags: Tag[] }>) => {
            target.replaceChildren();
            target.resolve = null;
            resolve({ confirm: true, value: e.detail });
            createPlanSnapshotModal.$destroy();
          },
        );
      }
    } else {
      resolve({ confirm: false });
    }
  });
}

/**
 * Shows a CreateViewModal component.
 */
export async function showCreateViewModal(): Promise<ModalElementValue<{ modelId: number; name: string }>> {
  return new Promise(resolve => {
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const createViewModal = new CreateViewModal({ target });
        target.resolve = resolve;

        createViewModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: false });
          createViewModal.$destroy();
        });

        createViewModal.$on('create', (e: CustomEvent<{ modelId: number; name: string }>) => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: true, value: e.detail });
          createViewModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
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
    if (browser) {
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
          deleteActivitiesModal.$destroy();
        });

        deleteActivitiesModal.$on('delete', (e: CustomEvent<ActivityDirectiveDeletionMap>) => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: true, value: e.detail });
          deleteActivitiesModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
    }
  });
}

/**
 * Shows an EditViewModal component.
 */
export async function showEditViewModal(): Promise<ModalElementValue<{ id: number; modelId: number; name: string }>> {
  return new Promise(resolve => {
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const editViewModal = new EditViewModal({ target });
        target.resolve = resolve;

        editViewModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: false });
          editViewModal.$destroy();
        });

        editViewModal.$on('save', (e: CustomEvent<{ id: number; modelId: number; name: string }>) => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: true, value: e.detail });
          editViewModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
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
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const sequenceModal = new ExpansionSequenceModal({ props: { expansionSequence, user }, target });
        target.resolve = resolve;

        sequenceModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: true });
          sequenceModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
    }
  });
}

/**
 * Shows a PlanBranchRequestModal with the supplied arguments.
 */
export async function showPlanBranchRequestModal(
  plan: Plan,
  action: PlanBranchRequestAction,
): Promise<
  ModalElementValue<{
    source_plan: PlanForMerging;
    target_plan: PlanForMerging;
  }>
> {
  return new Promise(resolve => {
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const planModal = new PlanBranchRequestModal({ props: { action, plan }, target });
        target.resolve = resolve;

        planModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: false });
          planModal.$destroy();
        });

        planModal.$on(
          'create',
          (
            e: CustomEvent<{
              source_plan: PlanForMerging;
              target_plan: PlanForMerging;
            }>,
          ) => {
            target.replaceChildren();
            target.resolve = null;
            resolve({ confirm: true, value: e.detail });
            planModal.$destroy();
          },
        );
      }
    } else {
      resolve({ confirm: false });
    }
  });
}

/**
 * Shows an PlanBranchesModal component with the supplied arguments.
 */
export async function showPlanBranchesModal(plan: Plan): Promise<ModalElementValue> {
  return new Promise(resolve => {
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const planBranchesModal = new PlanBranchesModal({ props: { plan }, target });
        target.resolve = resolve;

        planBranchesModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: true });
          planBranchesModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
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
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const planMergeRequestsModal = new PlanMergeRequestsModal({ props: { selectedFilter, user }, target });
        target.resolve = resolve;

        planMergeRequestsModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: false });
          planMergeRequestsModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
    }
  });
}

/**
 * Shows a RestorePlanSnapshotModal with the supplied arguments.
 */
export async function showRestorePlanSnapshotModal(
  snapshot: PlanSnapshot,
  numOfActivities: number,
  user: User | null,
): Promise<
  ModalElementValue<{
    description: string;
    name: string;
    shouldCreateSnapshot: boolean;
    snapshot: PlanSnapshot;
    tags: Tag[];
  }>
> {
  return new Promise(resolve => {
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const restorePlanSnapshotModal = new RestorePlanSnapshotModal({
          props: { numOfActivities, snapshot, user },
          target,
        });
        target.resolve = resolve;

        restorePlanSnapshotModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: false });
          restorePlanSnapshotModal.$destroy();
        });

        restorePlanSnapshotModal.$on(
          'restore',
          (
            e: CustomEvent<{
              description: string;
              name: string;
              shouldCreateSnapshot: boolean;
              snapshot: PlanSnapshot;
              tags: Tag[];
            }>,
          ) => {
            target.replaceChildren();
            target.resolve = null;
            resolve({ confirm: true, value: e.detail });
            restorePlanSnapshotModal.$destroy();
          },
        );
      }
    } else {
      resolve({ confirm: false });
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
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const savedViewsModal = new SavedViewsModal({ props: { height: 400, user, width: '50%' }, target });
        target.resolve = resolve;

        savedViewsModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: false });
          savedViewsModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
    }
  });
}

/**
 * Shows a UploadViewModal component.
 */
export async function showUploadViewModal(): Promise<ModalElementValue<{ definition: ViewDefinition; name: string }>> {
  return new Promise(resolve => {
    if (browser) {
      const target: ModalElement | null = document.querySelector('#svelte-modal');

      if (target) {
        const uploadViewModal = new UploadViewModal({ target });
        target.resolve = resolve;

        uploadViewModal.$on('close', () => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: false });
          uploadViewModal.$destroy();
        });

        uploadViewModal.$on('upload', (e: CustomEvent<{ definition: ViewDefinition; name: string }>) => {
          target.replaceChildren();
          target.resolve = null;
          resolve({ confirm: true, value: e.detail });
          uploadViewModal.$destroy();
        });
      }
    } else {
      resolve({ confirm: false });
    }
  });
}
