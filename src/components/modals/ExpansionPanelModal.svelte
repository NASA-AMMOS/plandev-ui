<svelte:options immutable={true} />

<script lang="ts">
  import { Label, Select } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { field } from '../../stores/form';
  import { parcels, workspaces } from '../../stores/sequencing';
  import type { Parcel, Workspace } from '../../types/sequencing';
  import { min } from '../../utilities/validators';
  import Field from '../form/Field.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 200;
  export let width: number = 380;

  const dispatch = createEventDispatcher<{
    close: void;
    save: { parcelId: number; workspaceId: number };
  }>();

  let workspaceIdField = field<number>(-1, [min(1, 'Field is required')]);
  let selectedWorkspace: Workspace | undefined;

  let parcelIdField = field<number>(-1, [min(1, 'Field is required')]);
  let selectedParcel: Parcel | undefined;

  let saveButtonDisabled: boolean = true;

  $: saveButtonDisabled = $workspaceIdField.value === -1 || $parcelIdField.value === -1;
  $: selectedWorkspace = $workspaces.find(({ id }) => $workspaceIdField.value === id);
  $: selectedParcel = $parcels.find(({ id }) => $parcelIdField.value === id);

  function save() {
    if (!saveButtonDisabled) {
      dispatch('save', { parcelId: $parcelIdField.value, workspaceId: $workspaceIdField.value });
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

  function getDisplayNameForParcel(parcel?: Parcel) {
    if (!parcel) {
      return '';
    }
    return `${parcel.name} (${parcel.id})`;
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
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
      <Field field={parcelIdField}>
        <Label size="sm" for="parcel-id" class="pb-0.5">Parcel Id</Label>
        <Select.Root selected={{ label: getDisplayNameForParcel(selectedParcel), value: selectedParcel?.id ?? '' }}>
          <Select.Trigger class="min-w-[124px]" value={selectedParcel?.id} size="xs" aria-labelledby={null}>
            <Select.Value aria-label="Select a parcel" placeholder="Select a parcel" />
          </Select.Trigger>
          <Select.Content class="z-[10000]">
            {#each $parcels as parcel}
              <Select.Item size="xs" value={parcel.id} label={getDisplayNameForParcel(parcel)} class="flex gap-1">
                {parcel.name}
                <div class="whitespace-nowrap text-muted-foreground">(Id: {parcel.id})</div>
              </Select.Item>
            {/each}
          </Select.Content>
          <Select.Input type="number" name="parcel-id" aria-label="Select Parcel hidden input" />
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
