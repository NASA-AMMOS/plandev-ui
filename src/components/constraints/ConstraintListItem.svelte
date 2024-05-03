<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import CheckmarkIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import FilterIcon from '@nasa-jpl/stellar/icons/filter.svg?component';
  import VisibleHideIcon from '@nasa-jpl/stellar/icons/visible_hide.svg?component';
  import VisibleShowIcon from '@nasa-jpl/stellar/icons/visible_show.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SearchParameters } from '../../enums/searchParameters';
  import { Status } from '../../enums/status';
  import type { ConstraintMetadata, ConstraintPlanSpec, ConstraintResponse } from '../../types/constraint';
  import { getTarget } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { pluralize } from '../../utilities/text';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import ContextMenuItem from '../context-menu/ContextMenuItem.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import ConstraintViolationButton from './ConstraintViolationButton.svelte';

  export let constraint: ConstraintMetadata;
  export let constraintPlanSpec: ConstraintPlanSpec;
  export let constraintResponse: ConstraintResponse;
  export let modelId: number | undefined;
  export let hasReadPermission: boolean = false;
  export let hasEditPermission: boolean = false;
  export let readOnly: boolean = false;
  export let totalViolationCount: number = 0;
  export let visible: boolean = true;

  const dispatch = createEventDispatcher<{
    toggleVisibility: { id: number; visible: boolean };
    updateConstraintPlanSpec: ConstraintPlanSpec;
  }>();

  let revisions: number[] = [];

  $: revisions = constraint.versions.map(({ revision }) => revision);
  $: violationCount = constraintResponse?.results?.violations?.length;
  $: success = constraintResponse?.success;

  function onEnable(event: Event) {
    const { value: enabled } = getTarget(event);
    dispatch('updateConstraintPlanSpec', {
      ...constraintPlanSpec,
      enabled: enabled as boolean,
    });
  }

  function onUpdateRevision(event: Event) {
    const { value: revision } = getTarget(event);
    dispatch('updateConstraintPlanSpec', {
      ...constraintPlanSpec,
      constraint_revision: revision === '' ? null : parseInt(`${revision}`),
    });
  }
</script>

<div class="constraint-list-item">
  <Collapse title={constraint.name} tooltipContent={constraint.name} defaultExpanded={false}>
    <svelte:fragment slot="left">
      <div class="left-content">
        <input
          type="checkbox"
          checked={constraintPlanSpec.enabled}
          on:change={onEnable}
          on:click|stopPropagation
          use:permissionHandler={{
            hasPermission: hasEditPermission,
            permissionError: readOnly
              ? PlanStatusMessages.READ_ONLY
              : 'You do not have permission to edit plan constraints',
          }}
          use:tooltip={{
            content: `${constraintPlanSpec.enabled ? 'Disable constraint' : 'Enable constraint'} on plan`,
            disabled: !hasEditPermission,
            placement: 'top',
          }}
        />
      </div>
    </svelte:fragment>
    <svelte:fragment slot="right">
      <div class="right-content">
        {#if violationCount}
          <div
            class="st-badge violation-badge"
            use:tooltip={{ content: `${violationCount} Violation${pluralize(violationCount)}`, placement: 'top' }}
          >
            {#if totalViolationCount !== violationCount}
              <FilterIcon /> {violationCount} of {totalViolationCount}
            {:else}
              {violationCount}
            {/if}
          </div>
        {:else if constraintResponse && !success}
          <div class="violations-error" use:tooltip={{ content: 'Compile Errors', placement: 'top' }}>
            <WarningIcon />
          </div>
        {:else if constraintResponse && success}
          <div class="no-violations" use:tooltip={{ content: 'No Violations', placement: 'top' }}>
            <CheckmarkIcon />
          </div>
        {:else}
          <span class="unchecked">
            <StatusBadge status={Status.Unchecked} />
          </span>
        {/if}
        <button
          use:tooltip={{ content: visible ? 'Hide' : 'Show', placement: 'top' }}
          class="st-button icon"
          on:click|stopPropagation={() => dispatch('toggleVisibility', { id: constraint.id, visible: !visible })}
        >
          {#if visible}
            <VisibleShowIcon />
          {:else}
            <VisibleHideIcon />
          {/if}
        </button>
        <select
          class="st-select"
          value={constraintPlanSpec.constraint_revision}
          on:change={onUpdateRevision}
          on:click|stopPropagation
          use:permissionHandler={{
            hasPermission: hasEditPermission,
            permissionError: readOnly
              ? PlanStatusMessages.READ_ONLY
              : 'You do not have permission to edit plan constraints',
          }}
        >
          <option value={null}>Always use latest</option>
          {#each revisions as revision, index}
            <option value={revision}>{revision}{index === 0 ? ' (Latest)' : ''}</option>
          {/each}
        </select>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="contextMenuContent">
      <ContextMenuItem
        on:click={() =>
          window.open(
            `${base}/constraints/edit/${constraint.id}${
              constraintPlanSpec.constraint_revision !== null
                ? `?${SearchParameters.REVISION}=${constraintPlanSpec.constraint_revision}&${SearchParameters.MODEL_ID}=${modelId}`
                : ''
            }`,
            '_blank',
          )}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasReadPermission,
              permissionError: 'You do not have permission to edit this constraint',
            },
          ],
        ]}
      >
        View Constraint
      </ContextMenuItem>
    </svelte:fragment>

    <Collapse title="Description" defaultExpanded={false}>
      <div class="st-typography-label">
        {#if constraint.description}
          {constraint.description}
        {:else}
          No description
        {/if}
      </div>
    </Collapse>

    <Collapse title="Violations" defaultExpanded={false}>
      {#if constraintResponse?.results?.violations?.length}
        <div class="violations">
          {#each constraintResponse?.results?.violations as violation}
            {#each violation.windows as window}
              <ConstraintViolationButton {window} />
            {/each}
          {/each}
        </div>
      {:else}
        <div class="st-typography-label">No Violations</div>
      {/if}
    </Collapse>

    {#if !success && constraintResponse?.errors}
      <Collapse title="Errors" defaultExpanded={false}>
        <div class="errors">
          {#each constraintResponse?.errors as error}
            <div class="st-typography-body">{error.message}</div>
          {/each}
        </div>
      </Collapse>
    {/if}
  </Collapse>
</div>

<style>
  .right-content {
    align-items: center;
    display: flex;
    flex-direction: row;
    gap: 4px;
  }

  .constraint-list-item .st-badge {
    align-items: center;
    background: #fbb7ac;
    border-radius: 4px;
    gap: 4px;
    height: 20px;
    padding: 0px 6px;
  }

  .violations,
  .errors {
    display: flex;
    flex-direction: column;
  }

  .errors {
    gap: 8px;
  }

  .no-violations {
    align-items: center;
    color: var(--st-success-green);
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    width: 20px;
  }

  .violations-error {
    align-items: center;
    color: var(--st-error-red);
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    width: 20px;
  }

  .unchecked {
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    width: 20px;
  }
</style>
