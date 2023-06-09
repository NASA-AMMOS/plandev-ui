<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { gqlSubscribable } from '../../stores/subscribable';
  import type { ActivityDirective, ActivityPreset } from '../../types/activity';
  import type { User } from '../../types/app';
  import type {
    DropdownOption,
    DropdownOptionValue,
    DropdownOptions,
    SelectedDropdownOptionValue,
  } from '../../types/dropdown';
  import type { GqlSubscribable } from '../../types/subscribable';
  import gql from '../../utilities/gql';
  import { tooltip } from '../../utilities/tooltip';
  import EditableDropdown from '../ui/EditableDropdown.svelte';
  import Highlight from '../ui/Highlight.svelte';

  export let activityDirective: ActivityDirective | null | undefined;
  export let disabled: boolean = false;
  export let hasChanges: boolean = false;
  export let highlightKeysMap: Record<string, boolean> = {};
  export let modelId: number;
  export let user: User | null;

  const dispatch = createEventDispatcher();

  let activityPresets: GqlSubscribable<ActivityPreset[]> = gqlSubscribable<ActivityPreset[]>(
    gql.SUB_ACTIVITY_PRESETS,
    { activityTypeName: activityDirective.type, modelId },
    [],
    user,
  );
  let options: DropdownOptions = [];

  $: activityPresets.setVariables({ activityTypeName: activityDirective.type, modelId });
  $: options = $activityPresets.map((activityPreset: ActivityPreset) => ({
    display: activityPreset.name,
    value: activityPreset.id,
  }));

  function onDeletePreset(event: CustomEvent<DropdownOptionValue>) {
    const { detail: presetId } = event;
    dispatch('deletePreset', presetId);
  }

  function onSaveNewPreset(event: CustomEvent<string>) {
    const { detail: presetName } = event;
    dispatch('saveNewPreset', { name: presetName });
  }

  function onSavePreset(event: CustomEvent<DropdownOption>) {
    const { detail: preset } = event;
    dispatch('savePreset', { name: preset.display });
  }

  function onSelectPreset(event: CustomEvent<SelectedDropdownOptionValue>) {
    const { detail: activityPresetId } = event;
    dispatch('applyPreset', activityPresetId);
  }
</script>

<Highlight highlight={highlightKeysMap.activity_preset}>
  <div class="activity-preset-input-container">
    <div class="preset-input-container st-input w-100">
      <!-- svelte-ignore a11y-label-has-associated-control -->
      <label class="label" use:tooltip={{ content: 'Choose activity preset', placement: 'top' }}> Preset </label>
      <EditableDropdown
        {disabled}
        canSaveOver={hasChanges}
        {options}
        optionLabel="preset"
        placeholder="None"
        selectedOptionValue={activityDirective.applied_preset?.preset_id}
        on:deleteOption={onDeletePreset}
        on:saveNewOption={onSaveNewPreset}
        on:saveOption={onSavePreset}
        on:selectOption={onSelectPreset}
      />
    </div>
  </div>
</Highlight>

<style>
  .activity-preset-input-container {
    --aerie-menu-item-template-columns: 1fr;
    align-items: center;
    display: grid;
  }

  .preset-input-container {
    display: grid;
    grid-template-rows: repeat(2, min-content);
    position: relative;
    row-gap: 4px;
  }
</style>
