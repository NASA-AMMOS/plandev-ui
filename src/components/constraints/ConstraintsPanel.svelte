<svelte:options immutable={true} />

<script lang="ts">
  import ChecklistIcon from '@nasa-jpl/stellar/icons/checklist.svg?component';
  import FilterIcon from '@nasa-jpl/stellar/icons/filter.svg?component';
  import PlanLeftArrow from '@nasa-jpl/stellar/icons/plan_with_left_arrow.svg?component';
  import PlanRightArrow from '@nasa-jpl/stellar/icons/plan_with_right_arrow.svg?component';
  import RefreshIcon from '@nasa-jpl/stellar/icons/refresh.svg?component';
  import VisibleHideIcon from '@nasa-jpl/stellar/icons/visible_hide.svg?component';
  import VisibleShowIcon from '@nasa-jpl/stellar/icons/visible_show.svg?component';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { Status } from '../../enums/status';
  import {
    allowedConstraintPlanSpecs,
    cachedConstraintsStatus,
    constraintPlanSpecs,
    constraintResponseMap,
    constraintResponses,
    constraintVisibilityMap,
    constraintsMap,
    constraintsStatus,
    initialConstraintPlanSpecsLoading,
    initialConstraintsLoading,
    resetConstraintStores,
    setAllConstraintsVisible,
    setConstraintVisibility,
  } from '../../stores/constraints';
  import { field } from '../../stores/form';
  import { plan, planReadOnly, viewTimeRange } from '../../stores/plan';
  import { plugins } from '../../stores/plugins';
  import { simulationStatus } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type {
    ConstraintInvocationMap,
    ConstraintPlanSpecification,
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
  import Loading from '../Loading.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import DatePickerActionButton from '../ui/DatePicker/DatePickerActionButton.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import ConstraintListItem from './ConstraintListItem.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  let constraintToConstraintResponseMap: ConstraintInvocationMap<ConstraintResponse> = {};
  let deletePermissionError: string;
  let editPermissionError: string;
  let endTime: string;
  let endTimeField: FieldStore<string>;
  let filteredConstraintPlanSpecifications: ConstraintPlanSpecification[] = [];
  let filteredViolationCount: number = 0;
  let filterText: string = '';
  let hasSpecEditPermission: boolean;
  let numOfPrivateConstraints: number = 0;
  let showAll: boolean = true;
  let showConstraintsWithNoViolations: boolean = true;
  let showFilters: boolean = false;
  let startTime: string;
  let startTimeField: FieldStore<string>;

  $: if ($plan) {
    startTime = formatDate(new Date($plan.start_time), $plugins.time.primary.format);
    const endTimeYmd = convertDoyToYmd($plan.end_time_doy);
    if (endTimeYmd) {
      endTime = formatDate(new Date(endTimeYmd), $plugins.time.primary.format);
    } else {
      endTime = '';
    }
    hasSpecEditPermission = featurePermissions.constraintsPlanSpec.canUpdate(user, $plan) && !$planReadOnly;

    editPermissionError = $planReadOnly
      ? PlanStatusMessages.READ_ONLY
      : 'You do not have permission to edit constraints for this plan.';
    deletePermissionError = hasSpecEditPermission
      ? editPermissionError
      : 'You cannot delete the last invocation of this constraint.';
  }

  $: startTimeField = field<string>(startTime, [required, $plugins.time.primary.validate]);
  $: endTimeField = field<string>(endTime, [required, $plugins.time.primary.validate]);
  $: startTimeMs = typeof startTime === 'string' ? $plugins.time.primary.parse(startTime)?.getTime() : null;
  $: endTimeMs = typeof endTime === 'string' ? $plugins.time.primary.parse(endTime)?.getTime() : null;
  $: if ($allowedConstraintPlanSpecs && $constraintResponseMap && startTimeMs && endTimeMs) {
    constraintToConstraintResponseMap = {};
    $allowedConstraintPlanSpecs.forEach(constraintPlanSpec => {
      const { constraint_id: constraintId, invocation_id: invocationId } = constraintPlanSpec;
      const constraintResponse = $constraintResponseMap[constraintId]?.[invocationId];
      if (constraintResponse) {
        if (!constraintToConstraintResponseMap[constraintId]) {
          constraintToConstraintResponseMap[constraintId] = {};
        }

        constraintToConstraintResponseMap[constraintId][invocationId] = {
          constraintId,
          constraintInvocationId: invocationId,
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
  $: filteredConstraintPlanSpecifications = filterConstraints(
    $allowedConstraintPlanSpecs,
    constraintToConstraintResponseMap,
    filterText,
    showConstraintsWithNoViolations,
  );
  $: numOfPrivateConstraints = ($constraintPlanSpecs || []).length - $allowedConstraintPlanSpecs.length;

  $: totalViolationCount = getViolationCount($constraintResponses);
  $: filteredViolationCount = getViolationCount(
    filteredConstraintPlanSpecifications.map(({ constraint_id: constraintId, invocation_id: invocationId }) => {
      return constraintToConstraintResponseMap[constraintId]?.[invocationId];
    }),
  );

  function filterConstraints(
    planSpecs: ConstraintPlanSpecification[],
    constraintInvocationToConstraintResponseMap: ConstraintInvocationMap<ConstraintResponse>,
    filter: string,
    shouldShowConstraintsWithNoViolations: boolean,
  ) {
    return planSpecs.filter(constraintPlanSpec => {
      const filterTextLowerCase = filter.toLowerCase();
      const includesName = constraintPlanSpec.constraint_metadata?.name
        .toLocaleLowerCase()
        .includes(filterTextLowerCase);
      if (!includesName) {
        return false;
      }

      const constraintResponse =
        constraintInvocationToConstraintResponseMap[constraintPlanSpec.constraint_id]?.[
          constraintPlanSpec.invocation_id
        ];
      // Always show constraints with no violations
      if (!constraintResponse?.results.violations?.length) {
        return shouldShowConstraintsWithNoViolations;
      }

      return true;
    });
  }

  function getViolationCount(constraintResponse: ConstraintResponse[]) {
    return constraintResponse.reduce((count, response) => {
      return response?.results.violations
        ? response.results.violations.filter(violation => violation.windows.length > 0).length + count
        : count;
    }, 0);
  }

  async function onDuplicateConstraintInvocation(event: CustomEvent<ConstraintPlanSpecification>) {
    const {
      detail: { constraint_metadata, invocation_id, order, ...constraintPlanSpec },
    } = event;
    if ($plan) {
      await effects.createConstraintPlanSpecification(
        {
          ...constraintPlanSpec,
          order: order + 1,
        },
        user,
      );
    }
  }

  async function onDeleteConstraintInvocation(event: CustomEvent<ConstraintPlanSpecification>) {
    const {
      detail: { constraint_metadata, ...constraintPlanSpec },
    } = event;
    if ($plan) {
      await effects.deleteConstraintInvocations($plan, [constraintPlanSpec.invocation_id], user);
    }
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

  async function onSetTimeBoundsToView() {
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

  async function onUpdateConstraint(event: CustomEvent<ConstraintPlanSpecification>) {
    if ($plan) {
      const {
        detail: { constraint_metadata, ...constraintPlanSpec },
      } = event;

      await effects.updateConstraintPlanSpecification($plan, constraintPlanSpec, user);
      resetConstraintStores();
    }
  }

  async function onUpdateConstraintOrder(event: CustomEvent<ConstraintPlanSpecification>) {
    if ($plan) {
      const {
        detail: { constraint_metadata, ...constraintPlanSpec },
      } = event;

      await effects.updateConstraintPlanSpecification($plan, constraintPlanSpec, user);
    }
  }

  function onResetFilters() {
    onPlanStartTimeClick();
    onPlanEndTimeClick();
    filterText = '';
  }

  function toggleVisibility(event: CustomEvent<{ constraintId: number; invocationId: number; visible: boolean }>) {
    setConstraintVisibility(event.detail.constraintId, event.detail.invocationId, event.detail.visible);
  }

  function toggleGlobalVisibility() {
    showAll = !showAll;
    setAllConstraintsVisible(showAll);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Constraints" />
    <PanelHeaderActions
      status={$constraintsStatus !== Status.Failed ? $cachedConstraintsStatus : $constraintsStatus}
      indeterminate
    >
      <PanelHeaderActionButton
        title="Re-Check"
        disabled={$simulationStatus !== Status.Complete || $constraintsStatus !== Status.Complete}
        tooltipContent="Re-check constraints"
        showLabel
        use={[
          [
            permissionHandler,
            {
              hasPermission: $plan
                ? featurePermissions.constraintRuns.canCreate(user, $plan, $plan.model) && !$planReadOnly
                : false,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to run constraint checks',
            },
          ],
        ]}
        on:click={() => $plan && effects.checkConstraints($plan, user, true)}
      >
        <RefreshIcon />
      </PanelHeaderActionButton>
      <PanelHeaderActionButton
        disabled={$simulationStatus !== Status.Complete || $constraintsStatus === Status.Complete}
        tooltipContent={$simulationStatus !== Status.Complete ? 'Completed simulation required' : ''}
        title="Check Constraints"
        on:click={() => $plan && effects.checkConstraints($plan, user, false)}
        use={[
          [
            permissionHandler,
            {
              hasPermission: $plan
                ? featurePermissions.constraintRuns.canCreate(user, $plan, $plan.model) && !$planReadOnly
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
        <button class="st-button secondary" on:click={onSetTimeBoundsToView}> Set from Timeline View Bounds </button>
        <button class="st-button secondary" on:click={onResetFilters}> Reset Filters </button>
      </fieldset>
    </CollapsibleListControls>

    <div class="pt-2">
      {#if $initialConstraintsLoading || $initialConstraintPlanSpecsLoading}
        <div class="p-1">
          <Loading />
        </div>
      {:else if !filteredConstraintPlanSpecifications.length}
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
            {#if $cachedConstraintsStatus}
              <FilterIcon />
              {filteredConstraintPlanSpecifications.length} of {$allowedConstraintPlanSpecs.length} constraints, {filteredViolationCount}
              of
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

        {#each filteredConstraintPlanSpecifications as constraintPlanSpec, specIndex (constraintPlanSpec.invocation_id)}
          {#if $constraintsMap[constraintPlanSpec.constraint_id]}
            <ConstraintListItem
              constraint={$constraintsMap[constraintPlanSpec.constraint_id]}
              {constraintPlanSpec}
              constraintResponse={constraintToConstraintResponseMap[constraintPlanSpec.constraint_id]?.[
                constraintPlanSpec.invocation_id
              ]}
              {deletePermissionError}
              {editPermissionError}
              hasEditPermission={hasSpecEditPermission}
              hasDeletePermission={hasSpecEditPermission}
              hasReadPermission={featurePermissions.constraints.canRead(user)}
              modelId={$plan?.model.id}
              shouldShowUpButton={(constraintPlanSpec?.order ?? 0) > 0}
              shouldShowDownButton={specIndex < filteredConstraintPlanSpecifications.length - 1}
              totalViolationCount={$constraintResponseMap[constraintPlanSpec.constraint_id]?.[
                constraintPlanSpec.invocation_id
              ]?.results.violations?.length || 0}
              visible={$constraintVisibilityMap[constraintPlanSpec.constraint_id]?.[constraintPlanSpec.invocation_id]}
              on:updateConstraintPlanSpecOrder={onUpdateConstraintOrder}
              on:updateConstraintPlanSpec={onUpdateConstraint}
              on:duplicateConstraintInvocation={onDuplicateConstraintInvocation}
              on:deleteConstraintInvocation={onDeleteConstraintInvocation}
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
