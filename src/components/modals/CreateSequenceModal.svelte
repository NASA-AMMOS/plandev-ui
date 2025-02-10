<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import effects from '../../utilities/effects';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';
  import type { User } from '../../types/app';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { plan, planReadOnly } from '../../stores/plan';
  import DatePickerField from '../form/DatePickerField.svelte';
  import { simulationDatasetId } from '../../stores/simulation';
  import { creatingExpansionSequence } from '../../stores/expansion';
  import { featurePermissions } from '../../utilities/permissions';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import type { SequenceFilter } from '../../types/sequencing';
  import type { FieldStore } from '../../types/form';
  import { plugins } from '../../stores/plugins';
  import { convertDoyToYmd, formatDate } from '../../utilities/time';
  import { field } from '../../stores/form';
  import { required } from '../../utilities/validators';
  import ActivityFilterBuilder from '../timeline/form/TimelineEditor/ActivityFilterBuilder.svelte';

  export let height: number | string = 450;
  export let width: number | string = 300;
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();
  const planStartTimeDate: Date = new Date($plan?.start_time ?? '');
  const planEndTimeDate: Date = new Date(convertDoyToYmd($plan?.end_time_doy ?? '') ?? '');

  let seqIdInput: string;
  let hasCreatePermission: boolean = false;
  let filterMenuActiveFilter: SequenceFilter = {};
  let startTimeField: FieldStore<string>;
  let endTimeField: FieldStore<string>;
  let planStartTime: string = formatDate(planStartTimeDate, $plugins.time.primary.format);
  let planEndTime: string = formatDate(planEndTimeDate, $plugins.time.primary.format);
  let isCreateEnabled: boolean = false;
  let filterMenu: ActivityFilterBuilder;

  $: startTimeField = field<string>(planStartTime, [required, $plugins.time.primary.validate]);
  $: endTimeField = field<string>(planEndTime, [required, $plugins.time.primary.validate]);

  $: if (user !== null && $plan !== null) {
    hasCreatePermission = featurePermissions.expansionSequences.canCreate(user) && !$planReadOnly;
  }

  $: isCreateEnabled =
    seqIdInput !== undefined && seqIdInput !== '' && $startTimeField.value !== '' && $endTimeField.value !== '';

  function onToggleFilterMenu() {
    filterMenu.toggle();
  }

  function onCreateExpansionSequence() {
    // We may not have a filter form the user, so at minimum send the time filter
    const result = effects.createExpansionSequence(
      seqIdInput,
      $simulationDatasetId,
      Object.keys(filterMenuActiveFilter).length > 0
        ? filterMenuActiveFilter
        : { timeFilter: { end: $endTimeField.value, start: $startTimeField.value } },
      user,
    );
    // On success, reset the filter options
    if (result !== null) {
      filterMenu.setActiveFilter({});
      dispatch('close');
    }
  }
</script>

<Modal {height} {width}>
  <ActivityFilterBuilder
    layerName={seqIdInput}
    bind:this={filterMenu}
    on:rename={newName => {
      seqIdInput = newName.detail.name;
    }}
    on:filterChange={filter => {
      filterMenuActiveFilter = {
        ...filter.detail.filter,
        timeFilter: {
          end: $endTimeField.value,
          start: $startTimeField.value,
        },
      };
    }}
  />
  <ModalHeader on:close>Create Expansion Sequence</ModalHeader>
  <ModalContent style="overflow: auto; padding: 8px; height: 100%;">
    <div class="options">
      <div class="option">
        <label for="seqId">Sequence ID </label>
        <input
          bind:value={seqIdInput}
          class="st-input seq-id-input"
          name="seqId"
          use:permissionHandler={{
            hasPermission: hasCreatePermission,
            permissionError: $planReadOnly
              ? PlanStatusMessages.READ_ONLY
              : 'You do not have permission to create an expansion',
          }}
        />
      </div>
      {#if $plan !== null}
        <div class="option">
          <label for="startTime">Start Time</label>
          <DatePickerField
            field={startTimeField}
            minDate={planStartTimeDate}
            maxDate={planEndTimeDate}
            name="startTime"
          />
        </div>
        <div class="option">
          <label for="endTime">End Time</label>
          <DatePickerField field={endTimeField} minDate={planStartTimeDate} maxDate={planEndTimeDate} name="endTime" />
        </div>
      {/if}
      <button
        class="st-button secondary w-100"
        use:permissionHandler={{
          hasPermission: hasCreatePermission,
          permissionError: $planReadOnly
            ? PlanStatusMessages.READ_ONLY
            : 'You do not have permission to create an expansion.',
        }}
        on:click|stopPropagation={onToggleFilterMenu}
      >
        Modify Filter
      </button>
    </div>
  </ModalContent>
  <ModalFooter>
    <button
      class="st-button primary"
      disabled={!isCreateEnabled}
      use:permissionHandler={{
        hasPermission: hasCreatePermission,
        permissionError: $planReadOnly
          ? PlanStatusMessages.READ_ONLY
          : 'You do not have permission to create an expansion',
      }}
      on:click|stopPropagation={onCreateExpansionSequence}
    >
      {$creatingExpansionSequence ? 'Creating... ' : 'Create Sequence'}
    </button>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
  </ModalFooter>
</Modal>

<style>
  .options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .option {
    display: inline;
    width: 100%;
  }

  .seq-id-input {
    width: 100%;
  }
</style>
