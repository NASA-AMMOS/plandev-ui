<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import ChecklistIcon from '@nasa-jpl/stellar/icons/checklist.svg?component';
  import FilterIcon from '@nasa-jpl/stellar/icons/filter.svg?component';
  import PlanLeftArrow from '@nasa-jpl/stellar/icons/plan_with_left_arrow.svg?component';
  import PlanRightArrow from '@nasa-jpl/stellar/icons/plan_with_right_arrow.svg?component';
  import VisibleHideIcon from '@nasa-jpl/stellar/icons/visible_hide.svg?component';
  import VisibleShowIcon from '@nasa-jpl/stellar/icons/visible_show.svg?component';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import {
    checkConstraintsStatus,
    constraintResultMap,
    constraintResults,
    constraintVisibilityMap,
    constraints,
    setAllConstraintsVisible,
    setConstraintVisibility,
  } from '../../stores/constraints';
  import { field } from '../../stores/form';
  import { plan, planReadOnly, viewTimeRange } from '../../stores/plan';
  import type { User } from '../../types/app';
  import type { Constraint, ConstraintResult } from '../../types/constraint';
  import type { FieldStore } from '../../types/form';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getDoyTime, getUnixEpochTime } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { required, timestamp } from '../../utilities/validators';
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
  let filteredConstraints: Constraint[] = [];
  let endTimeDoy: string;
  let endTimeDoyField: FieldStore<string>;
  let startTimeDoy: string;
  let startTimeDoyField: FieldStore<string>;
  let showFilters: boolean = false;
  let showConstraintsWithNoViolations: boolean = true;
  let filteredConstraintResultMap: Record<Constraint['id'], ConstraintResult> = {};

  $: startTimeDoy = $plan?.start_time_doy || '';
  $: startTimeDoyField = field<string>(startTimeDoy, [required, timestamp]);
  $: endTimeDoy = $plan?.end_time_doy || '';
  $: endTimeDoyField = field<string>(endTimeDoy, [required, timestamp]);
  $: startTimeMs = getUnixEpochTime(startTimeDoy);
  $: endTimeMs = getUnixEpochTime(endTimeDoy);

  $: if ($constraints && $constraintResults && startTimeMs && endTimeMs) {
    filteredConstraintResultMap = {};
    $constraints.forEach(constraint => {
      const constraintResult = $constraintResultMap[constraint.id];
      if (constraintResult) {
        // Filter violations/windows by time bounds
        const filteredViolations = constraintResult.violations.map(violation => ({
          ...violation,
          windows: violation.windows.filter(window => window.end >= startTimeMs && window.start <= endTimeMs),
        }));
        filteredConstraintResultMap[constraint.id] = { ...constraintResult, violations: filteredViolations };
      }
    });
  }

  $: filteredConstraints = filterConstraints(
    $constraints,
    filteredConstraintResultMap,
    filterText,
    showConstraintsWithNoViolations,
  );
  $: totalViolationCount = getViolationCount($constraintResults);
  $: filteredViolationCount = getViolationCount(Object.values(filteredConstraintResultMap));

  function filterConstraints(
    constraints: Constraint[],
    filteredConstraintResultMap: Record<Constraint['id'], ConstraintResult>,
    filterText: string,
    showConstraintsWithNoViolations: boolean,
  ) {
    return constraints.filter(constraint => {
      const filterTextLowerCase = filterText.toLowerCase();
      const includesName = constraint.name.toLocaleLowerCase().includes(filterTextLowerCase);
      if (!includesName) {
        return false;
      }

      const constraintResult = filteredConstraintResultMap[constraint.id];
      // Always show constraints with no violations
      if (!constraintResult?.violations?.length) {
        return showConstraintsWithNoViolations;
      }

      return true;
    });
  }

  function getViolationCount(constraintResults: ConstraintResult[]) {
    return constraintResults.reduce((count, constraintResult) => {
      return count + constraintResult.violations.length;
    }, 0);
  }

  function onUpdateStartTime() {
    if ($startTimeDoyField.valid && startTimeDoy !== $startTimeDoyField.value) {
      startTimeDoy = $startTimeDoyField.value;
    }
  }

  function onUpdateEndTime() {
    if ($endTimeDoyField.valid && endTimeDoy !== $endTimeDoyField.value) {
      endTimeDoy = $endTimeDoyField.value;
    }
  }

  async function setTimeBoundsToView() {
    await startTimeDoyField.validateAndSet(getDoyTime(new Date($viewTimeRange.start)).toString());
    await endTimeDoyField.validateAndSet(getDoyTime(new Date($viewTimeRange.end)).toString());
    onUpdateStartTime();
    onUpdateEndTime();
  }

  async function onPlanStartTimeClick() {
    await startTimeDoyField.validateAndSet($plan?.start_time_doy);
    onUpdateStartTime();
  }

  async function onPlanEndTimeClick() {
    await endTimeDoyField.validateAndSet($plan?.end_time_doy);
    onUpdateEndTime();
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
    <PanelHeaderActions status={$checkConstraintsStatus}>
      <PanelHeaderActionButton
        title="Check Constraints"
        on:click={() => effects.checkConstraints(user)}
        use={[
          [
            permissionHandler,
            {
              hasPermission: $plan ? featurePermissions.constraints.canCheck(user, $plan) && !$planReadOnly : false,
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
          name="new-constraint"
          class="st-button secondary"
          use:permissionHandler={{
            hasPermission: $plan ? featurePermissions.constraints.canCreate(user, $plan) && !$planReadOnly : false,
            permissionError: $planReadOnly
              ? PlanStatusMessages.READ_ONLY
              : 'You do not have permission to create constraints',
          }}
          on:click={() => window.open(`${base}/constraints/new`, '_blank')}
        >
          New
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
            field={startTimeDoyField}
            label="Violation Start Time"
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
            field={endTimeDoyField}
            label="Violation End Time"
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
        <div class="pt-1 st-typography-label">No constraints found</div>
      {:else}
        <div class="pt-1 st-typography-label filter-label-row">
          <div class="filter-label">
            {#if $checkConstraintsStatus}
              <FilterIcon />
              {filteredConstraints.length} of {$constraints.length} constraints, {filteredViolationCount} of
              {totalViolationCount} violations
            {:else}
              Constraints not checked
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
          <ConstraintListItem
            {constraint}
            hasDeletePermission={$plan ? featurePermissions.constraints.canDelete(user, $plan) : false}
            hasEditPermission={$plan ? featurePermissions.constraints.canUpdate(user, $plan) : false}
            visible={$constraintVisibilityMap[constraint.id]}
            constraintResult={filteredConstraintResultMap[constraint.id]}
            totalViolationCount={$constraintResultMap[constraint.id]?.violations?.length || 0}
            {user}
            on:toggleVisibility={toggleVisibility}
          />
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

  .checkbox-container {
    align-items: center;
    display: flex;
    gap: 8px;
    padding: 4px 0px;
  }

  .checkbox-container input {
    margin: 0;
  }
</style>
