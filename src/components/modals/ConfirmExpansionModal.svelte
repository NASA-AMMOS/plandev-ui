<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Status } from '../../enums/status';
  import { checkConstraintsStatus } from '../../stores/constraints';
  import { logMessage } from '../../stores/errors';
  import type {
    ConstraintInvocationMap,
    ConstraintPlanSpecification,
    ConstraintResponse,
  } from '../../types/constraint';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let simulationOutOfDate: boolean;
  export let allConstraintsHaveBeenChecked: boolean;
  export let allConstraintsThatAreCheckedPass: boolean;

  export let constraintPlanSpecsInPlan: ConstraintPlanSpecification[];
  export let constraintToConstraintResponseMap: ConstraintInvocationMap<ConstraintResponse>;
  export let simulationDatasetId: number;

  // TODO: adjust dynamically?
  export let height: number =
    simulationOutOfDate && (!allConstraintsHaveBeenChecked || !allConstraintsThatAreCheckedPass) ? 300 : 200;
  export let width: number = 380;

  let failingConstraints: { name: string; viols: number }[] = constraintPlanSpecsInPlan
    .filter(spec => constraintToConstraintResponseMap[spec.constraint_id])
    .map(spec => {
      return {
        name: spec.constraint_metadata?.name ?? '',
        viols:
          constraintToConstraintResponseMap[spec.constraint_id]?.[spec.invocation_id].results.violations?.length ?? -1,
      };
    })
    .filter(obj => obj.name.length > 0 && obj.viols > 0); // in case metadata is undefined.

  // NOTE: this includes disabled constraints, as running constraints when some are disabled marks them as unchecked.
  //        As such, we consider this an accurate reflection of the constraint status.
  let uncheckedConstraints: string[] = constraintPlanSpecsInPlan
    .filter(spec => !constraintToConstraintResponseMap[spec.constraint_id])
    .map(spec => spec.constraint_metadata?.name ?? '')
    .filter(name => name.length > 0); // in case metadata is undefined.

  let warningMessage = '';

  $: if ($checkConstraintsStatus === Status.Failed) {
    warningMessage = 'Constraint Evaluation Failure';
  } else if (simulationOutOfDate) {
    warningMessage = 'Simulation Outdated';
  } else if (!allConstraintsHaveBeenChecked && allConstraintsThatAreCheckedPass) {
    warningMessage = 'Unchecked Constraints';
  } else {
    warningMessage = 'Violating Constraints';
  }

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: void;
  }>();

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      confirm();
    }
  }

  function confirm() {
    const brief =
      $checkConstraintsStatus === Status.Failed
        ? ' (failed evaluation)'
        : $checkConstraintsStatus === Status.Incomplete
          ? ' (incomplete evaluation)'
          : uncheckedConstraints.length > 0 || failingConstraints.length > 0
            ? ` (${uncheckedConstraints.length > 0} unchecked, ${failingConstraints.length > 0} failed)`
            : ``;
    logMessage(`Constraint violations${brief} bypassed before expanding simulation ${simulationDatasetId}.`);

    dispatch('confirm');
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width} on:close>
  <ModalHeader on:close>{warningMessage}</ModalHeader>
  <ModalContent>
    {#if $checkConstraintsStatus === Status.Failed}
      <p>The most recent constraint evaluation failed.</p>
      <p>
        The status of constraints is therefore undefined, and the plan have violations that the mission planner is not
        aware of.
      </p>
      {#if uncheckedConstraints.length > 0 || failingConstraints.length > 0}
        <br />
        <p><i>For the most recent constraint run, the results were that:</i></p>
      {/if}
    {:else if $checkConstraintsStatus === Status.Incomplete}
      <p>The most recent constraint evaluation is incomplete.</p>
      <p>
        The status of constraints is therefore ill-defined, and the plan have violations that the mission planner is not
        aware of.
      </p>
      {#if uncheckedConstraints.length > 0 || failingConstraints.length > 0}
        <br />
        <p><i>For the most recent constraint run, the results were that:</i></p>
      {/if}
    {:else if simulationOutOfDate}
      <!-- If expansion is disabled for an out of date simulation, this won't show. But if we remove that guard, this shows. -->
      <p>Simulation is out of date. This means the constraint results in the constraints tab are currently invalid.</p>
      {#if uncheckedConstraints.length > 0 || failingConstraints.length > 0}
        <br />
        <p><i>For the most recent constraint run, the results were that:</i></p>
      {/if}
    {/if}
    {#if uncheckedConstraints.length > 0}
      <p>The following constraints were unchecked:</p>
      <div class="constraints-list">
        {#each uncheckedConstraints as unchecked}
          <p>{unchecked}</p>
        {/each}
      </div>
    {/if}
    {#if failingConstraints.length > 0}
      <p>The following constraints were violated:</p>
      <div class="constraints-list">
        {#each failingConstraints as failing}
          <p>{failing.name} <b>({failing.viols} violations)</b></p>
        {/each}
      </div>
    {/if}
    <br />
    <p><i>Proceed with expansion?</i></p>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={() => confirm()}>Expand</button>
  </ModalFooter>
</Modal>

<style>
  .constraints-list {
    margin-left: 10px;
  }
</style>
