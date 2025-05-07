<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import CheckmarkIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import FilterIcon from '@nasa-jpl/stellar/icons/filter.svg?component';
  import VisibleHideIcon from '@nasa-jpl/stellar/icons/visible_hide.svg?component';
  import VisibleShowIcon from '@nasa-jpl/stellar/icons/visible_show.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import CaretDownFillIcon from 'bootstrap-icons/icons/caret-down-fill.svg?component';
  import CaretUpFillIcon from 'bootstrap-icons/icons/caret-up-fill.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { SearchParameters } from '../../enums/searchParameters';
  import { Status } from '../../enums/status';
  import type {
    ConstraintDefinition,
    ConstraintMetadata,
    ConstraintPlanSpecification,
    ConstraintResponse,
  } from '../../types/constraint';
  import type { Argument, FormParameter } from '../../types/parameter';
  import { getTarget } from '../../utilities/generic';
  import { getCleansedStructArguments } from '../../utilities/parameters';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { pluralize } from '../../utilities/text';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import ConstraintViolationButton from './ConstraintViolationButton.svelte';

  export let constraint: ConstraintMetadata;
  export let constraintPlanSpec: ConstraintPlanSpecification;
  export let constraintResponse: ConstraintResponse;
  export let deletePermissionError: string = 'You do not have permission to delete constraints for this plan.';
  export let editPermissionError: string = 'You do not have permission to edit constraints for this plan.';
  export let modelId: number | undefined;
  export let hasDeletePermission: boolean = false;
  export let hasEditPermission: boolean = false;
  export let hasReadPermission: boolean = false;
  export let readPermissionError: string = 'You do not have permission to view this constraint.';
  export let shouldShowUpButton: boolean | undefined = false;
  export let shouldShowDownButton: boolean | undefined = false;
  export let totalViolationCount: number = 0;
  export let visible: boolean = true;

  const dispatch = createEventDispatcher<{
    deleteConstraintInvocation: ConstraintPlanSpecification;
    duplicateConstraintInvocation: ConstraintPlanSpecification;
    toggleVisibility: { constraintId: number; invocationId: number; visible: boolean };
    updateConstraintPlanSpec: ConstraintPlanSpecification;
    updateConstraintPlanSpecOrder: ConstraintPlanSpecification;
  }>();

  let formParameters: FormParameter[] = [];
  let order: number;
  let orderInput: HTMLInputElement;
  let revisions: number[] = [];
  let version: Pick<ConstraintDefinition, 'type' | 'revision' | 'parameter_schema'> | undefined = undefined;

  $: revisions = constraint.versions.map(({ revision }) => revision);
  $: violationCount = constraintResponse?.results?.violations?.length;
  $: success = constraintResponse?.success;
  $: order = constraintPlanSpec.order;

  $: {
    const version = getSpecVersion(constraint, constraintPlanSpec.constraint_revision);

    const schema = version?.parameter_schema;
    if (schema && schema.type === 'struct') {
      formParameters = Object.entries(schema.items).map(([name, subschema], i) => ({
        errors: null,
        name,
        order: i,
        required: true,
        schema: subschema,
        value:
          constraintPlanSpec && constraintPlanSpec.arguments && constraintPlanSpec.arguments[name] != null
            ? constraintPlanSpec.arguments[name]
            : '',
        valueSource: 'none',
      }));
    } else {
      formParameters = [];
    }
  }

  function getSpecVersion(
    constraintMetadata: ConstraintMetadata,
    revision: number | string | null,
  ): Pick<ConstraintDefinition, 'type' | 'revision' | 'parameter_schema'> | undefined {
    if (revision != null && revision !== '') {
      const revisionNumber = parseInt(`${revision}`);
      version = constraintMetadata.versions.find(v => v.revision === revisionNumber);
    } else {
      // if the `goal_revision` is null, that means to use the latest version of the definition
      // the query for this goal returns the versions in descending order, so the first entry in the array should correspond to the latest version
      version = constraintMetadata.versions[0];
    }
    return version;
  }

  function focusInput() {
    if (document.activeElement !== orderInput) {
      orderInput?.focus();
    }

    return true;
  }

  function updateOrder(orderUpdate: number) {
    dispatch('updateConstraintPlanSpecOrder', {
      ...constraintPlanSpec,
      order: orderUpdate,
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'ArrowUp') {
        if (order > 0) {
          updateOrder(order - 1);
        }
      } else {
        updateOrder(order + 1);
      }
    }
  }

  function onDecreaseOrder() {
    if (order !== undefined) {
      focusInput();
      updateOrder(order + 1);
    }
  }

  function onIncreaseOrder() {
    if (order !== undefined) {
      focusInput();
      updateOrder(order - 1);
    }
  }

  function onUpdateOrder() {
    if (order !== undefined) {
      updateOrder(order);
    }
  }

  function onDuplicateConstraintInvocation() {
    dispatch('duplicateConstraintInvocation', {
      ...constraintPlanSpec,
    });
  }
  function onDeleteConstraintInvocation() {
    dispatch('deleteConstraintInvocation', constraintPlanSpec);
  }

  function onEnable(event: Event) {
    const { value: enabled } = getTarget(event);
    dispatch('updateConstraintPlanSpec', {
      ...constraintPlanSpec,
      enabled: enabled as boolean,
    });
  }

  function onUpdateRevision(event: Event) {
    const { value: revision } = getTarget(event);

    const version = getSpecVersion(constraint, revision as string | number | null);
    const schema = version?.parameter_schema;

    let cleansedArguments: Argument = getCleansedStructArguments(constraintPlanSpec.arguments, schema);
    dispatch('updateConstraintPlanSpec', {
      ...constraintPlanSpec,
      arguments: cleansedArguments,
      constraint_revision: revision === '' ? null : parseInt(`${revision}`),
    });
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const {
      detail: { name, value },
    } = event;

    const schema = version?.parameter_schema;
    if (formParameters.length) {
      let cleansedArguments: Argument = getCleansedStructArguments(constraintPlanSpec.arguments, schema);

      dispatch('updateConstraintPlanSpec', {
        ...constraintPlanSpec,
        arguments: { ...cleansedArguments, [name]: value },
      });
    }
  }
</script>

<div class="constraint-list-item">
  <Collapse title={constraint.name} tooltipContent={constraint.name} defaultExpanded={false}>
    <svelte:fragment slot="left">
      <div class="left-content">
        <input
          type="checkbox"
          checked={constraintPlanSpec.enabled}
          class="m-1"
          on:change={onEnable}
          on:click|stopPropagation
          use:permissionHandler={{
            hasPermission: hasEditPermission,
            permissionError: editPermissionError,
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
      <div class="right-content" role="none" on:click|stopPropagation>
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
        <div class="order-container">
          <input
            bind:this={orderInput}
            bind:value={order}
            class="st-input"
            min="0"
            style:width="68px"
            type="number"
            on:change={onUpdateOrder}
            on:keydown={onKeyDown}
            use:permissionHandler={{
              hasPermission: hasEditPermission,
              permissionError: editPermissionError,
            }}
          />
          {#if hasEditPermission}
            <div class="order-buttons">
              <button
                use:tooltip={{ content: 'Increase order', placement: 'top' }}
                class="st-button tertiary up-button"
                class:hidden={!shouldShowUpButton}
                tabindex={shouldShowUpButton ? -1 : 0}
                on:click={onIncreaseOrder}
              >
                <CaretUpFillIcon />
              </button>
              <button
                use:tooltip={{ content: 'Decrease order', placement: 'top' }}
                class="st-button tertiary down-button"
                class:hidden={!shouldShowDownButton}
                tabindex={shouldShowDownButton ? -1 : 0}
                on:click={onDecreaseOrder}
              >
                <CaretDownFillIcon />
              </button>
            </div>
          {/if}
          <button
            use:tooltip={{ content: visible ? 'Hide' : 'Show', placement: 'top' }}
            class="st-button icon hide-button"
            on:click|stopPropagation={() =>
              dispatch('toggleVisibility', {
                constraintId: constraintPlanSpec.constraint_id,
                invocationId: constraintPlanSpec.invocation_id,
                visible: !visible,
              })}
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
              permissionError: editPermissionError,
            }}
          >
            <option value={null}>Always use latest</option>
            {#each revisions as revision, index}
              <option value={revision}>{revision}{index === 0 ? ' (Latest)' : ''}</option>
            {/each}
          </select>
        </div>
      </div>
    </svelte:fragment>

    {#if formParameters.length > 0}
      <Collapse title="Parameters" className="constraint-parameters" defaultExpanded={true}>
        <Parameters disabled={false} expanded={true} {formParameters} on:change={onChangeFormParameters} />
      </Collapse>
    {/if}

    <svelte:fragment slot="contextMenuContent">
      <div
        use:permissionHandler={{
          hasPermission: hasReadPermission,
          permissionError: readPermissionError,
        }}
      >
        <ContextMenu.Item
          on:click={() =>
            window.open(
              `${base}/constraints/edit/${constraint.id}${
                constraintPlanSpec.constraint_revision !== null
                  ? `?${SearchParameters.REVISION}=${constraintPlanSpec.constraint_revision}&${SearchParameters.MODEL_ID}=${modelId}`
                  : ''
              }`,
              '_blank',
            )}
          disabled={!hasReadPermission}
        >
          View Constraint
        </ContextMenu.Item>
      </div>
      <div
        use:permissionHandler={{
          hasPermission: hasEditPermission,
          permissionError: editPermissionError,
        }}
      >
        <ContextMenu.Item size="sm" on:click={onDuplicateConstraintInvocation} disabled={!hasEditPermission}>
          Duplicate Invocation
        </ContextMenu.Item>
      </div>
      <div
        use:permissionHandler={{
          hasPermission: hasDeletePermission,
          permissionError: deletePermissionError,
        }}
      >
        <ContextMenu.Item size="sm" on:click={onDeleteConstraintInvocation} disabled={!hasDeletePermission}>
          Delete Invocation
        </ContextMenu.Item>
      </div>
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

  .order-container {
    column-gap: 5px;
    display: flex;
  }

  /* Hide number input "spinners" (up and down arrows) in WebKit browsers ... */
  .order-container input::-webkit-outer-spin-button,
  .order-container input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  /* ... and Firefox */
  .order-container input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
    padding-right: 32px;
  }

  .order-buttons {
    align-items: center;
    display: flex;
    margin-left: -36px;
  }

  .order-buttons :global(button) {
    align-items: center;
    color: var(--st-gray-40);
    cursor: pointer;
    display: flex;
    min-width: 0;
    padding: 0;
    pointer-events: painted;
  }

  .order-buttons :global(button):hover {
    background-color: transparent !important;
    color: var(--st-gray-60);
  }

  .hide-button {
    width: auto;
  }

  .down-button {
    margin-left: -3px;
    margin-right: 2px;
  }

  .hidden {
    opacity: 0;
    pointer-events: none;
  }
</style>
