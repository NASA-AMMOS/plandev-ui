<svelte:options immutable={true} />

<script lang="ts">
  import { Label, Select } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { field } from '../../stores/form';
  import { workspaces } from '../../stores/workspaces';
  import type { User } from '../../types/app';
  import type { Workspace } from '../../types/workspace';
  import { featurePermissions } from '../../utilities/permissions';
  import { min } from '../../utilities/validators';
  import Field from '../form/Field.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let user: User | null;
  export let height: number = 200;
  export let width: number = 380;

  const dispatch = createEventDispatcher<{
    close: void;
    save: { workspaceId: number; workspaceName: string };
  }>();

  let workspaceIdField = field<number>(-1, [min(1, 'Field is required')]);
  let workspaceIdFieldName: string;
  let selectedWorkspace: Workspace | undefined;
  let hasUpdatePermission: boolean = false;

  let saveButtonDisabled: boolean = true;

  $: if (selectedWorkspace !== undefined) {
    hasUpdatePermission = featurePermissions.workspace.canUpdate(user, selectedWorkspace);
  }
  $: saveButtonDisabled = $workspaceIdField.value === -1 || !hasUpdatePermission;
  $: selectedWorkspace = $workspaces.find(({ id }) => $workspaceIdField.value === id);
  $: if ($workspaceIdField.value) {
    workspaceIdFieldName = $workspaces.find(workspace => workspace.id === $workspaceIdField.value)?.name ?? '';
  }

  function save() {
    if (!saveButtonDisabled) {
      dispatch('save', { workspaceId: $workspaceIdField.value, workspaceName: workspaceIdFieldName });
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      save();
    }
  }

  function getDisplayNameForWorkspace(workspace?: Workspace) {
    if (!workspace) {
      return '';
    }
    return `${workspace.name} (${workspace.id})`;
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width} on:close>
  <ModalHeader on:close>Send Expansion Result To Sequencing</ModalHeader>

  <ModalContent>
    <div class="st-typography-body">Select a workspace and parcel to use for sequencing.</div>

    <fieldset class="send-to-workspace-form">
      <Field field={workspaceIdField}>
        <Label size="sm" for="workspace-id" class="pb-0.5">Workspace Id</Label>
        <Select.Root
          selected={{ label: getDisplayNameForWorkspace(selectedWorkspace), value: selectedWorkspace?.id ?? '' }}
        >
          <Select.Trigger class="min-w-[124px]" value={selectedWorkspace?.id} size="xs" aria-labelledby={null}>
            <Select.Value aria-label="Select a sequencing workspace" placeholder="Select a sequencing workspace" />
          </Select.Trigger>
          <Select.Content class="z-[10000]">
            {#each $workspaces as workspace}
              <Select.Item
                size="xs"
                value={workspace.id}
                label={getDisplayNameForWorkspace(workspace)}
                class="flex gap-1"
              >
                {workspace.name}
                <div class="whitespace-nowrap text-muted-foreground">(Id: {workspace.id})</div>
              </Select.Item>
            {/each}
          </Select.Content>
          <Select.Input type="number" name="workspace-id" aria-label="Select Workspace hidden input" />
        </Select.Root>
      </Field>
    </fieldset>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={saveButtonDisabled} on:click={save}> Save </button>
  </ModalFooter>
</Modal>

<style>
  .send-to-workspace-form {
    gap: 4px;
  }
</style>
