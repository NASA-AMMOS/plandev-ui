<svelte:options immutable={true} />

<script lang="ts">
  import { Label, Select } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { field } from '../../../stores/form';
  import { parcels } from '../../../stores/sequencing';
  import { workspaces } from '../../../stores/workspaces';
  import type { Parcel } from '../../../types/sequencing';
  import type { Workspace } from '../../../types/workspace';
  import { min } from '../../../utilities/validators';
  import Field from '../../form/Field.svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean; value?: { parcelId: number; workspaceId: number } };
  }>();

  let workspaceIdField = field<number>(-1, [min(1, 'Field is required')]);
  let selectedWorkspace: Workspace | undefined;

  let parcelIdField = field<number>(-1, [min(1, 'Field is required')]);
  let selectedParcel: Parcel | undefined;

  $: saveButtonDisabled = $workspaceIdField.value === -1 || $parcelIdField.value === -1;
  $: selectedWorkspace = $workspaces.find(({ id }) => $workspaceIdField.value === id);
  $: selectedParcel = $parcels.find(({ id }) => $parcelIdField.value === id);

  function handleCancel() {
    open = false;
  }

  function handleSave() {
    if (!saveButtonDisabled) {
      open = false;
      dispatch('resolve', {
        confirm: true,
        value: { parcelId: $parcelIdField.value, workspaceId: $workspaceIdField.value },
      });
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

<StellarDialog bind:open size="sm" title="Send Expansion Result To Sequencing" on:close>
  <div class="grid gap-4 py-2">
    <div class="text-sm">Select a workspace and parcel to use for sequencing.</div>

    <div class="grid gap-1">
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
    </div>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmText="Save"
      confirmDisabled={saveButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleSave}
    />
  </svelte:fragment>
</StellarDialog>
