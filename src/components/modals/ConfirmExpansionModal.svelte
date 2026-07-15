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
  import { pluralize } from '../../utilities/text';
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

  export let height: number = 400;
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
    warningMessage = 'Constraints Could Not Be Evaluated';
  } else if (simulationOutOfDate) {
    warningMessage = 'Simulation Is Out Of Date';
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
            ? ` (${uncheckedConstraints.length} unchecked, ${failingConstraints.length > 0} failed)`
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
      <p>The most recent constraint evaluation failed, so the current constraint status is unknown.</p>
      {#if uncheckedConstraints.length > 0 || failingConstraints.length > 0}
        <br />
        <p><i>For the most recent constraint run, the results were that:</i></p>
        <br />
      {/if}
    {:else if $checkConstraintsStatus === Status.Incomplete}
      <p>The most recent constraint evaluation didn't finish, so the current constraint status is incomplete.</p>
      {#if uncheckedConstraints.length > 0 || failingConstraints.length > 0}
        <br />
        <p><i>For the most recent constraint run, the results were that:</i></p>
        <br />
      {/if}
    {:else if simulationOutOfDate}
      <!-- If expansion is disabled for an out of date simulation, this won't show. But if we remove that guard, this shows. -->
      <p>
        The plan has changed since the last simulation, so the constraint results in the Constraints panel no longer
        reflect the current plan.
      </p>
      {#if uncheckedConstraints.length > 0 || failingConstraints.length > 0}
        <br />
        <p><i>For the most recent constraint run, the results were that:</i></p>
        <br />
      {/if}
    {/if}
    {#if failingConstraints.length > 0}
      {#if simulationOutOfDate}
        <p>
          The last evaluation found violations in {failingConstraints.length === 1
            ? 'this constraint'
            : 'these constraints'}:
        </p>
      {:else}
        <p>{failingConstraints.length === 1 ? 'This constraint is' : 'These constraints are'} currently violated:</p>
      {/if}
      <ul class="list-disc pl-5">
        {#each failingConstraints as failing}
          <li>{failing.name} <b>({failing.viols} violation{pluralize(failing.viols)})</b></li>
        {/each}
      </ul>
      <br />
    {/if}
    {#if uncheckedConstraints.length > 0}
      {#if simulationOutOfDate}
        <p>
          From the last evaluation, {uncheckedConstraints.length === 1
            ? "this constraint hasn't"
            : "these constraints haven't"} been checked and may be violated:
        </p>
      {:else}
        <p>
          {uncheckedConstraints.length === 1 ? "This constraint hasn't" : "These constraints haven't"} been checked and may
          be violated:
        </p>
      {/if}
      <ul class="list-disc pl-5">
        {#each uncheckedConstraints as unchecked}
          <li>{unchecked}</li>
        {/each}
      </ul>
    {/if}
    <br />
    {#if simulationOutOfDate}
      <p><b>Expansion will run against the previous simulation and may not match the current plan.</b></p>
    {:else}
      <p><b>Expanding now may produce sequences that violate mission constraints.</b></p>
    {/if}
  </ModalContent>
  <div class="final-warning">
    <p><b><i>Do you want to expand anyway?</i></b></p>
  </div>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button
      class="st-button bg-destructive text-destructive-foreground hover:!bg-destructive/90"
      on:click={() => confirm()}>Expand Anyways</button
    >
  </ModalFooter>
</Modal>

<style>
  .final-warning {
    position: relative;
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
  }

  p {
    font-size: 0.75rem;
  }

  li {
    font-size: 0.67rem;
  }
</style>
