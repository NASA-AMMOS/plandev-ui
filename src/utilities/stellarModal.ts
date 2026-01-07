import { browser } from '$app/environment';
import type { ComponentType, SvelteComponent } from 'svelte';
import StellarAboutModal from '../components/modals/stellar/StellarAboutModal.svelte';
import StellarActionCreationModal from '../components/modals/stellar/StellarActionCreationModal.svelte';
import StellarAlertDialog from '../components/modals/stellar/StellarAlertDialog.svelte';
import StellarCancelActionRunModal from '../components/modals/stellar/StellarCancelActionRunModal.svelte';
import StellarCreatePlanBranchModal from '../components/modals/stellar/StellarCreatePlanBranchModal.svelte';
import StellarCreatePlanSnapshotModal from '../components/modals/stellar/StellarCreatePlanSnapshotModal.svelte';
import StellarCreateViewModal from '../components/modals/stellar/StellarCreateViewModal.svelte';
import StellarEditViewModal from '../components/modals/stellar/StellarEditViewModal.svelte';
import StellarExpansionPanelModal from '../components/modals/stellar/StellarExpansionPanelModal.svelte';
import StellarLibrarySequenceModal from '../components/modals/stellar/StellarLibrarySequenceModal.svelte';
import StellarRestorePlanSnapshotModal from '../components/modals/stellar/StellarRestorePlanSnapshotModal.svelte';
import StellarRunActionModal from '../components/modals/stellar/StellarRunActionModal.svelte';
import StellarNewSequenceModal from '../components/modals/stellar/StellarNewSequenceModal.svelte';
import StellarNewWorkspaceFolderModal from '../components/modals/stellar/StellarNewWorkspaceFolderModal.svelte';
import StellarNewWorkspaceSequenceModal from '../components/modals/stellar/StellarNewWorkspaceSequenceModal.svelte';
import StellarPlanBranchRequestModal from '../components/modals/stellar/StellarPlanBranchRequestModal.svelte';
import StellarRenameWorkspaceItemModal from '../components/modals/stellar/StellarRenameWorkspaceItemModal.svelte';
import StellarTimeRangeModal from '../components/modals/stellar/StellarTimeRangeModal.svelte';
import StellarTransformActivitiesModal from '../components/modals/stellar/StellarTransformActivitiesModal.svelte';
import StellarUpdatePlanMissionModelModal from '../components/modals/stellar/StellarUpdatePlanMissionModelModal.svelte';
import type { User } from '../types/app';
import type { ModelSlim } from '../types/model';
import type { ModalElement, ModalElementValue } from '../types/modal';
import type { Plan, PlanBranchRequestAction, PlanForMerging, PlanSlim } from '../types/plan';
import type { PlanSnapshot } from '../types/plan-snapshot';
import type { StellarModalOptions } from '../types/stellar-modal';
import type { Tag } from '../types/tags';
import type { ActivityTransformDirection } from '../types/time';
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
