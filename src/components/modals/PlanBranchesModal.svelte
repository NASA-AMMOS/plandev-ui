<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { createEventDispatcher } from 'svelte';
  import type { Plan } from '../../types/plan';
  import { isMetaOrCtrlPressed } from '../../utilities/keyboardEvents';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 270;
  export let plan: Plan;
  export let width: number = 400;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();
</script>

<Modal {height} {width} on:close>
  <ModalHeader on:close>Branches</ModalHeader>
  <ModalContent style=" overflow: auto;padding: 0">
    <div class="plan-branched-plans">
      {#each plan.child_plans as childPlan}
        <a
          class="branched-plan"
          href={`${base}/plans/${childPlan.id}`}
          on:click={e => {
            if (!isMetaOrCtrlPressed(e)) {
              dispatch('close');
            }
          }}
        >
          {childPlan.name}
        </a>
      {/each}
    </div>
  </ModalContent>
</Modal>

<style>
  a {
    border-bottom: 1px solid var(--st-gray-20);
    color: var(--st-black);
    display: block;
    font-weight: var(--st-typography-medium-font-weight);
    padding: 8px 16px;
    text-decoration: none;
  }

  a:hover {
    background: var(--st-gray-10);
  }
</style>
