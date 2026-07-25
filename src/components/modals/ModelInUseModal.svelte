<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ModelSlim } from '../../types/model';
  import { pluralize } from '../../utilities/text';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let width: number = 460;
  export let height: number = 340;
  export let model: ModelSlim;
  export let plans: { id: number; name: string }[] = [];

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter' || key === 'Escape') {
      event.preventDefault();
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width} on:close>
  <ModalHeader on:close>Model Cannot Be Deleted</ModalHeader>
  <div class="modal-body">
    <ModalContent>
      <span class="st-typography-body">
        "{model.name}" (ID: {model.id}) cannot be deleted because it is referenced by
        {plans.length} plan{pluralize(plans.length)}. Delete or migrate the following plan{pluralize(plans.length)} to another
        model first:
      </span>
      <ul class="model-in-use-list">
        {#each plans as plan}
          <li class="st-typography-body">{plan.name} (ID: {plan.id})</li>
        {/each}
      </ul>
    </ModalContent>
  </div>
  <ModalFooter>
    <button class="st-button" on:click={() => dispatch('close')}> Close </button>
  </ModalFooter>
</Modal>

<style>
  .modal-body {
    height: 100%;
    overflow: auto;
  }

  .model-in-use-list {
    list-style: disc;
    margin: 0.5rem 0 0;
    padding-left: 1.5rem;
  }

  .model-in-use-list > li {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
