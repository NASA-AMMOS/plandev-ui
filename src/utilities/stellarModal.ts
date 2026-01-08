import { browser } from '$app/environment';
import type { ComponentType, SvelteComponent } from 'svelte';
import StellarAboutModal from '../components/modals/stellar/StellarAboutModal.svelte';
import StellarActionCreationModal from '../components/modals/stellar/StellarActionCreationModal.svelte';
import StellarAlertDialog from '../components/modals/stellar/StellarAlertDialog.svelte';
import StellarCancelActionRunModal from '../components/modals/stellar/StellarCancelActionRunModal.svelte';
import StellarConfirmActivityCreationModal from '../components/modals/stellar/StellarConfirmActivityCreationModal.svelte';
import StellarCreatePlanBranchModal from '../components/modals/stellar/StellarCreatePlanBranchModal.svelte';
import StellarDeleteActivitiesModal from '../components/modals/stellar/StellarDeleteActivitiesModal.svelte';
import StellarDeleteDerivationGroupModal from '../components/modals/stellar/StellarDeleteDerivationGroupModal.svelte';
import StellarDeleteExternalEventSourceTypeModal from '../components/modals/stellar/StellarDeleteExternalEventSourceTypeModal.svelte';
import StellarDeleteExternalSourceModal from '../components/modals/stellar/StellarDeleteExternalSourceModal.svelte';
import StellarCreatePlanSnapshotModal from '../components/modals/stellar/StellarCreatePlanSnapshotModal.svelte';
import StellarCreateViewModal from '../components/modals/stellar/StellarCreateViewModal.svelte';
import StellarEditViewModal from '../components/modals/stellar/StellarEditViewModal.svelte';
import StellarExpansionPanelModal from '../components/modals/stellar/StellarExpansionPanelModal.svelte';
import StellarExpansionSequenceModal from '../components/modals/stellar/StellarExpansionSequenceModal.svelte';
import StellarImportWorkspaceFileModal from '../components/modals/stellar/StellarImportWorkspaceFileModal.svelte';
import StellarLibrarySequenceModal from '../components/modals/stellar/StellarLibrarySequenceModal.svelte';
import StellarManagePlanConstraintsModal from '../components/modals/stellar/StellarManagePlanConstraintsModal.svelte';
import StellarManagePlanDerivationGroupsModal from '../components/modals/stellar/StellarManagePlanDerivationGroupsModal.svelte';
import StellarManagePlanSchedulingConditionsModal from '../components/modals/stellar/StellarManagePlanSchedulingConditionsModal.svelte';
import StellarManagePlanSchedulingGoalsModal from '../components/modals/stellar/StellarManagePlanSchedulingGoalsModal.svelte';
import StellarMergeReviewEndedModal from '../components/modals/stellar/StellarMergeReviewEndedModal.svelte';
import StellarMoveItemToWorkspaceModal from '../components/modals/stellar/StellarMoveItemToWorkspaceModal.svelte';
import StellarMoveWorkspaceItemModal from '../components/modals/stellar/StellarMoveWorkspaceItemModal.svelte';
import StellarPlanBranchesModal from '../components/modals/stellar/StellarPlanBranchesModal.svelte';
import StellarPlanBranchMergeDerivationGroupMessageModal from '../components/modals/stellar/StellarPlanBranchMergeDerivationGroupMessageModal.svelte';
import StellarPlanMergeRequestsModal from '../components/modals/stellar/StellarPlanMergeRequestsModal.svelte';
import StellarRestorePlanSnapshotModal from '../components/modals/stellar/StellarRestorePlanSnapshotModal.svelte';
import StellarRunActionModal from '../components/modals/stellar/StellarRunActionModal.svelte';
import StellarNewSequenceModal from '../components/modals/stellar/StellarNewSequenceModal.svelte';
import StellarNewWorkspaceFolderModal from '../components/modals/stellar/StellarNewWorkspaceFolderModal.svelte';
import StellarNewWorkspaceSequenceModal from '../components/modals/stellar/StellarNewWorkspaceSequenceModal.svelte';
import StellarPlanBranchRequestModal from '../components/modals/stellar/StellarPlanBranchRequestModal.svelte';
import StellarRenameWorkspaceItemModal from '../components/modals/stellar/StellarRenameWorkspaceItemModal.svelte';
import StellarRunActionResultsModal from '../components/modals/stellar/StellarRunActionResultsModal.svelte';
import StellarSavedViewsModal from '../components/modals/stellar/StellarSavedViewsModal.svelte';
import StellarTimeRangeModal from '../components/modals/stellar/StellarTimeRangeModal.svelte';
import StellarTransformActivitiesModal from '../components/modals/stellar/StellarTransformActivitiesModal.svelte';
import StellarUpdatePlanMissionModelModal from '../components/modals/stellar/StellarUpdatePlanMissionModelModal.svelte';
import StellarUploadViewModal from '../components/modals/stellar/StellarUploadViewModal.svelte';
import type { ActivityDirectiveDeletionMap, ActivityDirectiveId } from '../types/activity';
import type { User } from '../types/app';
import type { DerivationGroup, ExternalSource, ExternalSourceSlim } from '../types/external-source';
import type { ExpansionSequence } from '../types/expansion';
import type { ModelSlim } from '../types/model';
import type { ModalElement, ModalElementValue } from '../types/modal';
import type { Plan, PlanBranchRequestAction, PlanForMerging, PlanMergeRequestTypeFilter, PlanSlim } from '../types/plan';
import type { PlanSnapshot } from '../types/plan-snapshot';
import type { StellarModalOptions } from '../types/stellar-modal';
import type { Tag } from '../types/tags';
import type { ActivityTransformDirection } from '../types/time';
import type { ViewDefinition } from '../types/view';
import type { ActionDefinition } from '../types/actions';
import type { ArgumentsMap } from '../types/parameter';
import type { Workspace } from '../types/workspace';
import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../types/workspace-tree-view';

/**
 * Animation duration for modal transitions.
 * Used to delay cleanup until exit animation completes.
 */
const ANIMATION_DURATION_MS = 250;

/**
 * Delay before mounting modal to allow context menus to fully close.
 * This fixes an issue where clicking (vs keyboard) to select a context menu
 * item interferes with the dialog's focus trap initialization.
 */
const MOUNT_DELAY_MS = 50;

/**
 * Shows a Stellar modal component and returns a Promise that resolves when the modal closes.
 *
 * This function bridges the imperative Promise-based API with Stellar's declarative modal system.
 * It mounts a modal component to #svelte-modal, listens for close/confirm/resolve events,
 * and cleans up after the exit animation completes.
 *
 * @param Component - The Svelte modal component to render
 * @param props - Props to pass to the modal component
 * @param options - Modal options (closeOnEscape, closeOnOutsideClick, size)
 * @returns Promise that resolves with { confirm: boolean, value?: T }
 *
 * @example
 * ```typescript
 * const { confirm, value } = await showStellarModal(
 *   StellarConfirmModal,
 *   { title: 'Confirm', message: 'Are you sure?' },
 *   { size: 'sm' }
 * );
 * ```
 */
export async function showStellarModal<T = unknown, Props extends Record<string, unknown> = Record<string, unknown>>(
  Component: ComponentType<SvelteComponent>,
  props: Props = {} as Props,
  options: StellarModalOptions = {},
): Promise<ModalElementValue<T>> {
  return new Promise(resolve => {
    if (!browser) {
      resolve({ confirm: false });
      return;
    }

    const target: ModalElement | null = document.querySelector('#svelte-modal');
    if (!target) {
      resolve({ confirm: false });
      return;
    }

    setTimeout(() => {
      let resolved = false;

      const cleanup = (component: SvelteComponent) => {
        target.replaceChildren();
        component.$destroy();
      };

      const resolveAndCleanup = (value: ModalElementValue<T>, component: SvelteComponent) => {
        if (resolved) {
          return;
        }
        resolved = true;
        // Allow animation to complete before cleanup
        setTimeout(() => cleanup(component), ANIMATION_DURATION_MS);
        resolve(value);
      };

      // Merge options with defaults - start with open: false so transition can play
      const modalProps = {
        ...props,
        closeOnEscape: options.closeOnEscape ?? true,
        closeOnOutsideClick: options.closeOnOutsideClick ?? true,
        open: false,
        size: options.size,
      };

      // Mount directly to target like the legacy modal.ts does
      const component = new Component({
        props: modalProps,
        target,
      });

      // Set open to true after mount so the open transition plays
      requestAnimationFrame(() => {
        component.$set({ open: true });
      });

      // Listen for close event (cancel/dismiss)
      component.$on('close', () => {
        resolveAndCleanup({ confirm: false }, component);
      });

      // Listen for confirm event (primary action)
      component.$on('confirm', (e: CustomEvent<T | undefined>) => {
        console.log('CONFIRM', e);
        resolveAndCleanup({ confirm: true, value: e?.detail }, component);
      });

      // Support custom resolve event for complex modals
      // that need to return arbitrary values
      component.$on('resolve', (e: CustomEvent<ModalElementValue<T>>) => {
        resolveAndCleanup(e.detail, component);
      });
    }, MOUNT_DELAY_MS);
  });
}

// ============================================================================
// Typed show*Modal functions for each Stellar modal
// These provide the same API as the legacy modal.ts functions
// ============================================================================

export interface StellarConfirmModalOptions {
  actionCanBeUndone?: boolean;
  cancelText?: string;
  confirmButtonVariant?: 'default' | 'destructive';
}

/**
 * Shows a Stellar confirmation modal.
 */
export function showStellarConfirmModal(
  confirmText: string,
  message: string,
  title: string,
  options: StellarConfirmModalOptions = {},
): Promise<ModalElementValue> {
  return showStellarModal(StellarAlertDialog, {
    actionCanBeUndone: options.actionCanBeUndone,
    cancelText: options.cancelText,
    confirmButtonVariant: options.confirmButtonVariant,
    confirmText,
    message,
    title,
  });
}

/**
 * Shows a Stellar about modal.
 */
export function showStellarAboutModal(): Promise<ModalElementValue> {
  return showStellarModal(StellarAboutModal, {});
}

/**
 * Shows a Stellar create view modal.
 */
export function showStellarCreateViewModal(): Promise<ModalElementValue<{ name: string }>> {
  return showStellarModal<{ name: string }>(StellarCreateViewModal, {});
}

/**
 * Shows a Stellar cancel action run modal.
 */
export function showStellarCancelActionRunModal(): Promise<ModalElementValue> {
  return showStellarModal(StellarCancelActionRunModal, {});
}

/**
 * Shows a Stellar time range modal.
 */
export function showStellarTimeRangeModal(
  defaultStartTime: string,
  defaultEndTime: string,
): Promise<ModalElementValue<{ timeRangeEnd: string; timeRangeStart: string }>> {
  return showStellarModal<{ timeRangeEnd: string; timeRangeStart: string }>(StellarTimeRangeModal, {
    defaultEndTime,
    defaultStartTime,
  });
}

/**
 * Shows a Stellar new sequence modal.
 */
export function showStellarNewSequenceModal(): Promise<ModalElementValue<{ newSequenceName: string }>> {
  return showStellarModal<{ newSequenceName: string }>(StellarNewSequenceModal, {});
}

/**
 * Shows a Stellar edit view modal.
 */
export function showStellarEditViewModal(
  viewId: number | undefined,
  viewName: string,
): Promise<ModalElementValue<{ id: number | undefined; name: string }>> {
  return showStellarModal<{ id: number | undefined; name: string }>(StellarEditViewModal, {
    viewId,
    viewName,
  });
}

/**
 * Shows a Stellar rename workspace item modal.
 */
export function showStellarRenameWorkspaceItemModal(
  originalNode: WorkspaceTreeNode,
  originalPath: string,
): Promise<ModalElementValue<{ originalNode: WorkspaceTreeNode; originalPath: string; targetPath: string }>> {
  return showStellarModal<{ originalNode: WorkspaceTreeNode; originalPath: string; targetPath: string }>(
    StellarRenameWorkspaceItemModal,
    {
      originalNode,
      originalPath,
    },
  );
}

/**
 * Shows a Stellar create plan branch modal.
 */
export function showStellarCreatePlanBranchModal(
  plan: Plan,
): Promise<ModalElementValue<{ name: string; plan: Plan }>> {
  return showStellarModal<{ name: string; plan: Plan }>(StellarCreatePlanBranchModal, { plan });
}

/**
 * Shows a Stellar create plan snapshot modal.
 */
export function showStellarCreatePlanSnapshotModal(
  plan: Plan,
  user: User | null,
): Promise<ModalElementValue<{ description: string; name: string; plan: Plan; tags: Tag[] }>> {
  return showStellarModal<{ description: string; name: string; plan: Plan; tags: Tag[] }>(
    StellarCreatePlanSnapshotModal,
    { plan, user },
  );
}

/**
 * Shows a Stellar new workspace folder modal.
 */
export function showStellarNewWorkspaceFolderModal(
  currentWorkspace: Workspace | null | undefined,
  currentWorkspaceContents: WorkspaceTreeNode | null,
  startingPath: string,
  user: User | null,
): Promise<ModalElementValue<{ folderPath: string }>> {
  return showStellarModal<{ folderPath: string }>(StellarNewWorkspaceFolderModal, {
    currentWorkspace,
    currentWorkspaceContents,
    startingPath,
    user,
  });
}

/**
 * Shows a Stellar new workspace sequence modal.
 */
export function showStellarNewWorkspaceSequenceModal(
  currentWorkspace: Workspace | null | undefined,
  currentWorkspaceContents: WorkspaceTreeNode | null,
  startingPath: string,
  user: User | null,
): Promise<ModalElementValue<{ filePath: string }>> {
  return showStellarModal<{ filePath: string }>(StellarNewWorkspaceSequenceModal, {
    currentWorkspace,
    currentWorkspaceContents,
    startingPath,
    user,
  });
}

/**
 * Shows a Stellar restore plan snapshot modal.
 */
export function showStellarRestorePlanSnapshotModal(
  numOfActivities: number,
  snapshot: PlanSnapshot,
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
  return showStellarModal<{
    description: string;
    name: string;
    shouldCreateSnapshot: boolean;
    snapshot: PlanSnapshot;
    tags: Tag[];
  }>(StellarRestorePlanSnapshotModal, { numOfActivities, snapshot, user });
}

/**
 * Shows a Stellar plan branch request modal.
 */
export function showStellarPlanBranchRequestModal(
  action: PlanBranchRequestAction,
  plan: Plan,
): Promise<
  ModalElementValue<{
    source_plan: PlanForMerging;
    target_plan: PlanForMerging;
  }>
> {
  return showStellarModal<{
    source_plan: PlanForMerging;
    target_plan: PlanForMerging;
  }>(StellarPlanBranchRequestModal, { action, plan });
}

/**
 * Shows a Stellar library sequence modal.
 */
export function showStellarLibrarySequenceModal(): Promise<ModalElementValue<{ library: FileList; parcel: number }>> {
  return showStellarModal<{ library: FileList; parcel: number }>(StellarLibrarySequenceModal, {});
}

/**
 * Shows a Stellar expansion panel modal.
 */
export function showStellarExpansionPanelModal(): Promise<
  ModalElementValue<{ parcelId: number; workspaceId: number }>
> {
  return showStellarModal<{ parcelId: number; workspaceId: number }>(StellarExpansionPanelModal, {});
}

/**
 * Shows a Stellar action creation modal.
 */
export function showStellarActionCreationModal(
  user: User | null,
  workspaceId: number,
): Promise<ModalElementValue<void>> {
  return showStellarModal<void>(StellarActionCreationModal, {
    user,
    workspaceId,
  });
}

/**
 * Shows a Stellar run action modal.
 */
export function showStellarRunActionModal(
  actionDefinition: ActionDefinition,
  user: User | null,
  workspace: Workspace,
  workspaceFiles: WorkspaceTreeNodeWithFullPath[],
  parameters: ArgumentsMap | undefined,
): Promise<ModalElementValue<{ id: number | null }>> {
  return showStellarModal<{ id: number | null }>(StellarRunActionModal, {
    actionDefinition,
    parameters,
    user,
    workspace,
    workspaceFiles,
  });
}

/**
 * Shows a Stellar update plan mission model modal.
 */
export function showStellarUpdatePlanMissionModelModal(
  plan: PlanSlim,
  user: User | null,
): Promise<ModalElementValue<ModelSlim>> {
  return showStellarModal<ModelSlim>(StellarUpdatePlanMissionModelModal, {
    plan,
    user,
  });
}

/**
 * Shows a Stellar pack activities modal.
 */
export function showStellarPackActivitiesModal(): Promise<
  ModalElementValue<{ direction: ActivityTransformDirection; offsetDuration: string }>
> {
  return showStellarModal<{ direction: ActivityTransformDirection; offsetDuration: string }>(
    StellarTransformActivitiesModal,
    {
      offsetLabel: 'Offset',
      subtitle: 'Pack activity directives to the left or the right with a time offset.',
      title: 'Pack Directives',
    },
  );
}

/**
 * Shows a Stellar bulk shift activities modal.
 */
export function showStellarBulkShiftActivitiesModal(): Promise<
  ModalElementValue<{ direction: ActivityTransformDirection; offsetDuration: string }>
> {
  return showStellarModal<{ direction: ActivityTransformDirection; offsetDuration: string }>(
    StellarTransformActivitiesModal,
    {
      offsetLabel: 'Shift by',
      subtitle: 'Shift activity directives forwards or backwards in time.',
      title: 'Shift Directives',
    },
  );
}

/**
 * Shows a Stellar manage plan constraints modal.
 */
export function showStellarManagePlanConstraintsModal(user: User | null): Promise<ModalElementValue<void>> {
  return showStellarModal<void>(StellarManagePlanConstraintsModal, {
    user,
  });
}

/**
 * Shows a Stellar manage plan scheduling conditions modal.
 */
export function showStellarManagePlanSchedulingConditionsModal(user: User | null): Promise<ModalElementValue<void>> {
  return showStellarModal<void>(StellarManagePlanSchedulingConditionsModal, {
    user,
  });
}

/**
 * Shows a Stellar manage plan scheduling goals modal.
 */
export function showStellarManagePlanSchedulingGoalsModal(user: User | null): Promise<ModalElementValue<void>> {
  return showStellarModal<void>(StellarManagePlanSchedulingGoalsModal, {
    user,
  });
}

/**
 * Shows a Stellar manage plan derivation groups modal.
 */
export function showStellarManagePlanDerivationGroupsModal(user: User | null): Promise<ModalElementValue<void>> {
  return showStellarModal<void>(StellarManagePlanDerivationGroupsModal, {
    user,
  });
}

/**
 * Shows a Stellar delete activities modal.
 */
export function showStellarDeleteActivitiesModal(
  activityIds: ActivityDirectiveId[],
): Promise<ModalElementValue<ActivityDirectiveDeletionMap>> {
  return showStellarModal<ActivityDirectiveDeletionMap>(StellarDeleteActivitiesModal, {
    activityIds,
  });
}

/**
 * Shows a Stellar import workspace file modal.
 */
export function showStellarImportWorkspaceFileModal(
  currentWorkspace: Workspace,
  currentWorkspaceContents: WorkspaceTreeNode,
  inputLanguageName: string,
  outputLanguageExtensions: string[],
  startingPath: string,
  workspace: Workspace | null | undefined,
  user: User | null,
): Promise<
  ModalElementValue<{
    filesToConvert: File[];
    filesToUpload: File[];
    shouldKeepOriginalFiles: boolean;
    targetDirectory: string;
  }>
> {
  return showStellarModal<{
    filesToConvert: File[];
    filesToUpload: File[];
    shouldKeepOriginalFiles: boolean;
    targetDirectory: string;
  }>(StellarImportWorkspaceFileModal, {
    currentWorkspace,
    currentWorkspaceContents,
    inputLanguageName,
    outputLanguageExtensions,
    startingPath,
    user,
    workspace,
  });
}

/**
 * Shows a Stellar move workspace item modal.
 */
export function showStellarMoveWorkspaceItemModal(
  currentWorkspace: Workspace,
  currentWorkspaceContents: WorkspaceTreeNode,
  originalNode: WorkspaceTreeNode,
  originalPath: string,
  workspace: Workspace | null | undefined,
  user: User | null,
): Promise<
  ModalElementValue<{
    originalNode: WorkspaceTreeNode;
    originalPath: string;
    shouldCopy: boolean;
    targetPath: string;
  }>
> {
  return showStellarModal<{
    originalNode: WorkspaceTreeNode;
    originalPath: string;
    shouldCopy: boolean;
    targetPath: string;
  }>(StellarMoveWorkspaceItemModal, {
    currentWorkspace,
    currentWorkspaceContents,
    originalNode,
    originalPath,
    user,
    workspace,
  });
}

/**
 * Shows a Stellar move item to workspace modal.
 */
export function showStellarMoveItemToWorkspaceModal(
  currentWorkspace: Workspace,
  originalNode: WorkspaceTreeNode,
  originalPath: string,
  user: User | null,
): Promise<
  ModalElementValue<{
    shouldCopy: boolean;
    targetPath: string;
    targetWorkspace: Workspace;
  }>
> {
  return showStellarModal<{
    shouldCopy: boolean;
    targetPath: string;
    targetWorkspace: Workspace;
  }>(StellarMoveItemToWorkspaceModal, {
    currentWorkspace,
    originalNode,
    originalPath,
    user,
  });
}

/**
 * Shows a Stellar confirm activity creation modal.
 */
export function showStellarConfirmActivityCreationModal(): Promise<ModalElementValue<{ addFilter: boolean }>> {
  return showStellarModal<{ addFilter: boolean }>(StellarConfirmActivityCreationModal, {});
}

/**
 * Shows a Stellar delete derivation group modal.
 */
export function showStellarDeleteDerivationGroupModal(
  derivationGroups: DerivationGroup[],
): Promise<ModalElementValue<void>> {
  return showStellarModal<void>(StellarDeleteDerivationGroupModal, {
    derivationGroups,
  });
}

/**
 * Shows a Stellar delete external source modal.
 */
export function showStellarDeleteExternalSourceModal(
  linked: { pkey: { derivation_group_name: string; key: string }; plan_ids: number[] }[],
  sources: ExternalSourceSlim[],
  unassociatedSources: ExternalSourceSlim[],
): Promise<ModalElementValue<{ deleteUnassociatedSources: boolean }>> {
  return showStellarModal<{ deleteUnassociatedSources: boolean }>(StellarDeleteExternalSourceModal, {
    linked,
    sources,
    unassociatedSources,
  });
}

/**
 * Shows a Stellar delete external event/source type modal.
 */
export function showStellarDeleteExternalEventSourceTypeModal(
  associatedItems: Set<string>,
  itemsToDelete: string[],
  itemsToDeleteTypeName: 'External Event Type(s)' | 'External Source Type(s)',
): Promise<ModalElementValue<void>> {
  return showStellarModal<void>(StellarDeleteExternalEventSourceTypeModal, {
    associatedItems,
    itemsToDelete,
    itemsToDeleteTypeName,
  });
}

/**
 * Shows a Stellar expansion sequence modal.
 */
export function showStellarExpansionSequenceModal(
  expansionSequence: ExpansionSequence,
  user: User | null,
): Promise<ModalElementValue> {
  return showStellarModal(StellarExpansionSequenceModal, {
    expansionSequence,
    user,
  });
}

/**
 * Shows a Stellar merge review ended modal.
 */
export function showStellarMergeReviewEndedModal(
  planId: number,
  status: 'pending' | 'in-progress' | 'accepted' | 'rejected' | 'withdrawn',
): Promise<ModalElementValue> {
  return showStellarModal(
    StellarMergeReviewEndedModal,
    { planId, status },
    { closeOnEscape: false, closeOnOutsideClick: false },
  );
}

/**
 * Shows a Stellar plan branch merge derivation group message modal.
 */
export function showStellarPlanBranchMergeDerivationGroupMessageModal(): Promise<ModalElementValue> {
  return showStellarModal(StellarPlanBranchMergeDerivationGroupMessageModal, {});
}

/**
 * Shows a Stellar plan branches modal.
 */
export function showStellarPlanBranchesModal(plan: Plan): Promise<ModalElementValue> {
  return showStellarModal(StellarPlanBranchesModal, {
    plan,
  });
}

/**
 * Shows a Stellar plan merge requests modal.
 */
export function showStellarPlanMergeRequestsModal(
  user: User | null,
  selectedFilter: PlanMergeRequestTypeFilter = 'all',
): Promise<ModalElementValue> {
  return showStellarModal(StellarPlanMergeRequestsModal, {
    selectedFilter,
    user,
  });
}

/**
 * Shows a Stellar run action results modal.
 */
export function showStellarRunActionResultsModal(actionRunId: number): Promise<ModalElementValue<number>> {
  return showStellarModal<number>(StellarRunActionResultsModal, {
    actionRunId,
  });
}

/**
 * Shows a Stellar saved views modal.
 */
export function showStellarSavedViewsModal(user: User | null): Promise<ModalElementValue> {
  return showStellarModal(StellarSavedViewsModal, {
    user,
  });
}

/**
 * Shows a Stellar upload view modal.
 */
export function showStellarUploadViewModal(): Promise<
  ModalElementValue<{
    definition: ViewDefinition;
    name: string;
  }>
> {
  return showStellarModal<{
    definition: ViewDefinition;
    name: string;
  }>(StellarUploadViewModal, {});
}
