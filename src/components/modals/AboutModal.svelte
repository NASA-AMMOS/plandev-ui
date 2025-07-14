<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Version } from '../../types/app';
  import effects from '../../utilities/effects';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  let version: Version = {
    branch: 'unknown',
    commit: 'unknown',
    commitUrl: '',
    date: new Date().toLocaleString(),
    name: 'aerie-ui',
  };

  onMount(async () => {
    version = await effects.getVersion();
  });
</script>

<Modal height={220} width={640}>
  <ModalHeader on:close>About</ModalHeader>
  <ModalContent>
    <div class="text-sm leading-relaxed">
      <div>
        Aerie is an open source, extensible software system for planning, scheduling, and commanding space missions.
        Learn more about Aerie by visiting our <a
          href="https://nasa-ammos.github.io/aerie-docs/introduction/"
          target="_blank"
          rel="noreferrer"
          class="text-blue-600 underline hover:text-blue-800"
        >
          documentation site.
        </a>
      </div>
      <div class="mt-3 text-muted-foreground">Copyright 2021, by the California Institute of Technology.</div>
      <div class="text-muted-foreground">
        {version.name} –
        <a
          href={version.commitUrl}
          rel="noopener noreferrer"
          target="_blank"
          class="text-blue-600 underline hover:text-blue-800"
        >
          {version.branch}:{version.commit}
        </a>
        –
        {version.date}
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button" on:click={() => dispatch('close')}> Close </button>
  </ModalFooter>
</Modal>
