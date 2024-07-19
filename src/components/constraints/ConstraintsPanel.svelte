<svelte:options immutable={true} />

<script lang="ts">
  import ChecklistIcon from '@nasa-jpl/stellar/icons/checklist.svg?component';
  import FilterIcon from '@nasa-jpl/stellar/icons/filter.svg?component';
  import PlanLeftArrow from '@nasa-jpl/stellar/icons/plan_with_left_arrow.svg?component';
  import PlanRightArrow from '@nasa-jpl/stellar/icons/plan_with_right_arrow.svg?component';
  import VisibleHideIcon from '@nasa-jpl/stellar/icons/visible_hide.svg?component';
  import VisibleShowIcon from '@nasa-jpl/stellar/icons/visible_show.svg?component';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { Status } from '../../enums/status';
  import {
    allowedConstraintPlanSpecMap,
    allowedConstraintSpecs,
    checkConstraintsStatus,
    constraintPlanSpecs,
    constraintResponseMap,
    constraintVisibilityMap,
    constraintsMap,
    constraintsStatus,
    setAllConstraintsVisible,
    setConstraintVisibility,
  } from '../../stores/constraints';
  import { field } from '../../stores/form';
  import { plan, planReadOnly, viewTimeRange } from '../../stores/plan';
  import { plugins } from '../../stores/plugins';
  import { simulationStatus } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type {
    ConstraintDefinition,
    ConstraintMetadata,
    ConstraintPlanSpec,
    ConstraintResponse,
  } from '../../types/constraint';
  import type { FieldStore } from '../../types/form';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { convertDoyToYmd, formatDate } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { required } from '../../utilities/validators';
  import CollapsibleListControls from '../CollapsibleListControls.svelte';
  import DatePickerField from '../form/DatePickerField.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import DatePickerActionButton from '../ui/DatePicker/DatePickerActionButton.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import ConstraintListItem from './ConstraintListItem.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  let showAll: boolean = true;
  let filterText: string = '';
  let filteredConstraints: ConstraintPlanSpec[] = [];
  let endTime: string;
  let endTimeField: FieldStore<string>;
  let numOfPrivateConstraints: number = 0;
  let startTime: string;
  let startTimeField: FieldStore<string>;
  let showFilters: boolean = false;
  let showConstraintsWithNoViolations: boolean = true;
  let constraintToConstraintResponseMap: Record<ConstraintDefinition['constraint_id'], ConstraintResponse> = {};

  $: if ($plan) {
    startTime = formatDate(new Date($plan.start_time), $plugins.time.primary.format);
    const endTimeYmd = convertDoyToYmd($plan.end_time_doy);
    if (endTimeYmd) {
      endTime = formatDate(new Date(endTimeYmd), $plugins.time.primary.format);
    } else {
      endTime = '';
    }
  }

  $: startTimeField = field<string>(startTime, [required, $plugins.time.primary.validate]);
  $: endTimeField = field<string>(endTime, [required, $plugins.time.primary.validate]);
  $: startTimeMs = typeof startTime === 'string' ? $plugins.time.primary.parse(startTime)?.getTime() : null;
  $: endTimeMs = typeof endTime === 'string' ? $plugins.time.primary.parse(endTime)?.getTime() : null;
  $: if ($allowedConstraintSpecs && $constraintResponseMap && startTimeMs && endTimeMs) {
    constraintToConstraintResponseMap = {};
    $allowedConstraintSpecs.forEach(constraintPlanSpec => {
      const constraintResponse = $constraintResponseMap[constraintPlanSpec.constraint_id];
      if (constraintResponse) {
        constraintToConstraintResponseMap[constraintPlanSpec.constraint_id] = {
          constraintId: constraintResponse.constraintId,
          constraintName: constraintResponse.constraintName,
          errors: constraintResponse.errors,
          results: constraintResponse.results && {
            ...constraintResponse.results,
            violations:
              constraintResponse.results.violations?.map(violation => ({
                ...violation,
                // Filter violations/windows by time bounds
                windows: violation.windows.filter(
                  window => window.end >= (startTimeMs ?? 0) && window.start <= (endTimeMs ?? 0),
                ),
              })) ?? null,
          },
          success: constraintResponse.success,
          type: constraintResponse.type,
        };
      }
    });
  }
  $: filteredConstraints = filterConstraints(
    $allowedConstraintSpecs,
    constraintToConstraintResponseMap,
    filterText,
    showConstraintsWithNoViolations,
  );
  $: filteredConstraintResponses = Object.values(constraintToConstraintResponseMap).filter(r =>
    filteredConstraints.find(c => c.constraint_id === r.constraintId),
  );
  $: numOfPrivateConstraints = $constraintPlanSpecs.length - $allowedConstraintSpecs.length;

  $: totalViolationCount = getViolationCount(Object.values($constraintResponseMap));
  $: filteredViolationCount = getViolationCount(Object.values(filteredConstraintResponses));

  function filterConstraints(
    planSpecs: ConstraintPlanSpec[],
    constraintToConstraintResponseMap: Record<ConstraintMetadata['id'], ConstraintResponse>,
    filterText: string,
    showConstraintsWithNoViolations: boolean,
  ) {
    return planSpecs.filter(constraintPlanSpec => {
      const filterTextLowerCase = filterText.toLowerCase();
      const includesName = constraintPlanSpec.constraint_metadata?.name
        .toLocaleLowerCase()
        .includes(filterTextLowerCase);
      if (!includesName) {
        return false;
      }

      const constraintResponse = constraintToConstraintResponseMap[constraintPlanSpec.constraint_id];
      // Always show constraints with no violations
      if (!constraintResponse?.results.violations?.length) {
        return showConstraintsWithNoViolations;
      }

      return true;
    });
  }

  function getViolationCount(constraintResponse: ConstraintResponse[]) {
    return constraintResponse.reduce((count, constraintResponse) => {
      return constraintResponse.results.violations
        ? constraintResponse.results.violations.filter(violation => violation.windows.length > 0).length + count
        : count;
    }, 0);
  }

  function onManageConstraints() {
    effects.managePlanConstraints(user);
  }

  function onUpdateStartTime() {
    if ($startTimeField.valid && startTime !== $startTimeField.value) {
      startTime = $startTimeField.value;
    }
  }

  function onUpdateEndTime() {
    if ($endTimeField.valid && endTime !== $endTimeField.value) {
      endTime = $endTimeField.value;
    }
  }

  async function setTimeBoundsToView() {
    await startTimeField.validateAndSet(formatDate(new Date($viewTimeRange.start), $plugins.time.primary.format));
    await endTimeField.validateAndSet(formatDate(new Date($viewTimeRange.end), $plugins.time.primary.format));
    onUpdateStartTime();
    onUpdateEndTime();
  }

  async function onPlanStartTimeClick() {
    if ($plan) {
      await startTimeField.validateAndSet(formatDate(new Date($plan.start_time), $plugins.time.primary.format));
      onUpdateStartTime();
    }
  }

  async function onPlanEndTimeClick() {
    if ($plan) {
      const endTimeYmd = convertDoyToYmd($plan.end_time_doy);
      if (endTimeYmd) {
        endTime = formatDate(new Date(endTimeYmd), $plugins.time.primary.format);
        await endTimeField.validateAndSet(endTime);
        onUpdateEndTime();
      }
    }
  }

  async function onUpdateConstraint(event: CustomEvent<ConstraintPlanSpec>) {
    if ($plan) {
      const {
        detail: { constraint_metadata, ...constraintPlanSpec },
      } = event;

      await effects.updateConstraintPlanSpecification($plan, constraintPlanSpec, user);
    }
  }

  function resetFilters() {
    onPlanStartTimeClick();
    onPlanEndTimeClick();
    filterText = '';
  }

  function toggleVisibility(event: CustomEvent) {
    setConstraintVisibility(event.detail.id, event.detail.visible);
  }

  function toggleGlobalVisibility() {
    showAll = !showAll;
    setAllConstraintsVisible(showAll);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Constraints" />
    <PanelHeaderActions status={$constraintsStatus} indeterminate>
      <PanelHeaderActionButton
        disabled={$simulationStatus !== Status.Complete}
        tooltipContent={$simulationStatus !== Status.Complete ? 'Completed simulation required' : ''}
        title="Check Constraints"
        on:click={() => $plan && effects.checkConstraints($plan, user)}
        use={[
          [
            permissionHandler,
            {
              hasPermission: $plan
                ? featurePermissions.constraintsPlanSpec.canCheck(user, $plan, $plan.model) && !$planReadOnly
                : false,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to run constraint checks',
            },
          ],
        ]}
      >
        <ChecklistIcon />
      </PanelHeaderActionButton>
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <CollapsibleListControls bind:value={filterText} placeholder="Filter constraints">
      <svelte:fragment slot="right">
        <button
          use:tooltip={{ content: `${showFilters ? 'Hide' : 'Show'} Additional Filters`, placement: 'top' }}
          on:click={() => (showFilters = !showFilters)}
          class="st-button secondary filter-button"
          class:active={showFilters}
        >
          <FilterIcon />
        </button>
        <button
          name="manage-constraints"
          class="st-button secondary"
          use:permissionHandler={{
            hasPermission: $plan ? featurePermissions.constraints.canCreate(user) && !$planReadOnly : false,
            permissionError: $planReadOnly
              ? PlanStatusMessages.READ_ONLY
              : 'You do not have permission to update constraints',
          }}
          on:click|stopPropagation={onManageConstraints}
        >
          Manage Constraints
        </button>
      </svelte:fragment>
      <!-- TODO move to a menu? -->
      <fieldset class="filter-row" class:hidden={!showFilters}>
        <div class="checkbox-container">
          <input id="showConstraintsWithNoViolations" bind:checked={showConstraintsWithNoViolations} type="checkbox" />
          <label class="st-typography-label" for="showConstraintsWithNoViolations">
            Show Constraints with no Violations
          </label>
        </div>
        <div>
          <DatePickerField
            useFallback={!$plugins.time.enableDatePicker}
            field={startTimeField}
            label={`Violation Start Time (${$plugins.time.primary.label})`}
            layout="inline"
            name="start-time"
            on:change={onUpdateStartTime}
            on:keydown={onUpdateStartTime}
          >
            <DatePickerActionButton on:click={onPlanStartTimeClick} text="Plan Start">
              <PlanLeftArrow />
            </DatePickerActionButton>
          </DatePickerField>
          <DatePickerField
            useFallback={!$plugins.time.enableDatePicker}
            field={endTimeField}
            label={`Violation End Time (${$plugins.time.primary.label})`}
            layout="inline"
            name="end-time"
            on:change={onUpdateEndTime}
            on:keydown={onUpdateEndTime}
          >
            <DatePickerActionButton on:click={onPlanEndTimeClick} text="Plan End">
              <PlanRightArrow />
            </DatePickerActionButton>
          </DatePickerField>
        </div>
        <button class="st-button secondary" on:click={setTimeBoundsToView}> Set from Timeline View Bounds </button>
        <button class="st-button secondary" on:click={resetFilters}> Reset Filters </button>
      </fieldset>
    </CollapsibleListControls>

    <div class="pt-2">
      {#if !filteredConstraints.length}
        <div class="pt-1 st-typography-label filter-label-row">
          <div class="filter-label">No constraints found</div>
          <div class="private-label">
            {#if numOfPrivateConstraints > 0}
              {numOfPrivateConstraints} constraint{numOfPrivateConstraints !== 1 ? 's' : ''}
              {numOfPrivateConstraints > 1 ? 'are' : 'is'} private and not shown
            {/if}
          </div>
        </div>
      {:else}
        <div class="pt-1 st-typography-label filter-label-row">
          <div class="filter-label">
            {#if $checkConstraintsStatus}
              <FilterIcon />
              {filteredConstraints.length} of {$allowedConstraintSpecs.length} constraints, {filteredViolationCount} of
              {totalViolationCount} violations
            {:else}
              Constraints not checked
            {/if}
          </div>
          <div class="private-label">
            {#if numOfPrivateConstraints > 0}
              {numOfPrivateConstraints} constraint{numOfPrivateConstraints !== 1 ? 's' : ''}
              {numOfPrivateConstraints > 1 ? 'are' : 'is'} private and not shown
            {/if}
          </div>
          <button
            use:tooltip={{ content: showAll ? 'Hide All Constraints' : 'Show All Constraints', placement: 'top' }}
            class="st-button icon"
            on:click={toggleGlobalVisibility}
          >
            {#if showAll}
              <VisibleShowIcon />
            {:else}
              <VisibleHideIcon />
            {/if}
          </button>
        </div>

        {#each filteredConstraints as constraint}
          {#if $constraintsMap[constraint.constraint_id]}
            <ConstraintListItem
              constraint={$constraintsMap[constraint.constraint_id]}
              constraintPlanSpec={$allowedConstraintPlanSpecMap[constraint.constraint_id]}
              constraintResponse={constraintToConstraintResponseMap[constraint.constraint_id]}
              hasReadPermission={featurePermissions.constraints.canRead(user)}
              hasEditPermission={$plan ? featurePermissions.constraintsPlanSpec.canUpdate(user, $plan) : false}
              modelId={$plan?.model.id}
              totalViolationCount={$constraintResponseMap[constraint.constraint_id]?.results.violations?.length || 0}
              visible={$constraintVisibilityMap[constraint.constraint_id]}
              on:updateConstraintPlanSpec={onUpdateConstraint}
              on:toggleVisibility={toggleVisibility}
            />
          {/if}
        {/each}
      {/if}
    </div>
  </svelte:fragment>
</Panel>

<style>
  .filter-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px;
  }

  .filter-row.hidden {
    display: none;
  }

  .filter-button.active {
    background: var(--st-utility-blue);
    border-color: transparent;
    color: white;
  }

  .filter-label-row {
    display: flex;
    justify-content: space-between;
    padding-bottom: 4px;
  }

  .filter-label {
    display: flex;
    gap: 4px;
  }

  .filter-label :global(svg) {
    flex-shrink: 0;
  }

  .private-label {
    color: #e6b300;
  }

  .checkbox-container {
    align-items: center;
    display: flex;
    gap: 8px;
    padding: 4px 0px;
  }

  .checkbox-container input {
    margin: 0;
  }

  .st-button {
    white-space: nowrap;
  }
</style>
