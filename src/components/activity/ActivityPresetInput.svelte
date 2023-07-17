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
  import type { Plan } from '../../types/plan';
  import type { GqlSubscribable } from '../../types/subscribable';
  import gql from '../../utilities/gql';
  import { featurePermissions } from '../../utilities/permissions';
  import { tooltip } from '../../utilities/tooltip';
  import EditableDropdown from '../ui/EditableDropdown.svelte';
  import Highlight from '../ui/Highlight.svelte';

  export let activityDirective: ActivityDirective | null | undefined;
  export let disabled: boolean = false;
  export let hasChanges: boolean = false;
  export let highlightKeysMap: Record<string, boolean> = {};
  export let modelId: number;
  export let plan: Plan | null;
  export let user: User | null;

  const dispatch = createEventDispatcher();

  let activityPresets: GqlSubscribable<ActivityPreset[]> = gqlSubscribable<ActivityPreset[]>(
    gql.SUB_ACTIVITY_PRESETS,
    { activityTypeName: activityDirective?.type, modelId },
    [],
    user,
  );
  let hasAssignPermission: boolean = false;
  let hasCreatePermission: boolean = false;
  let hasDeletePermission: boolean = false;
  let hasUpdatePermission: boolean = false;
  let options: DropdownOptions = [];

  $: if (activityDirective != null) {
    activityPresets.setVariables({ activityTypeName: activityDirective.type, modelId });
  }
  $: options = $activityPresets.map((activityPreset: ActivityPreset) => ({
    display: activityPreset.name,
    hasSelectPermission: hasAssignPermission,
    value: activityPreset.id,
  }));
  $: if (plan !== null) {
    hasAssignPermission = featurePermissions.activityPresets.canAssign(user, plan);
    // because we also assign after preset creation, we must include both checks here as part of the creation permission check
    hasCreatePermission =
      featurePermissions.activityPresets.canCreate(user, plan) &&
      featurePermissions.activityPresets.canAssign(user, plan);

    const selectedPreset = $activityPresets.find(
      activityPreset => activityPreset.id === activityDirective?.applied_preset?.preset_id,
    );
    if (selectedPreset !== undefined) {
      hasDeletePermission = featurePermissions.activityPresets.canDelete(user, plan, selectedPreset);
      hasUpdatePermission = featurePermissions.activityPresets.canUpdate(user, plan, selectedPreset);
    }
  }

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
        {hasCreatePermission}
        {hasDeletePermission}
        {hasUpdatePermission}
        {options}
        optionLabel="preset"
        placeholder="None"
        selectedOptionValue={activityDirective?.applied_preset?.preset_id}
        showPlaceholderOption={hasAssignPermission}
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
