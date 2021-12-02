<svelte:options accessors={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import Modal from './Modal.svelte';

  type Version = {
    branch: string;
    commit: string;
    commitUrl: string;
    date: string;
    name: string;
  };

  export let modal: Modal | null = null;

  let version: Version;

  onMount(async () => {
    try {
      const response = await fetch('/version.json');
      version = await response.json();
    } catch (e) {
      console.log(e);
      version = {
        branch: 'unknown',
        commit: 'unknown',
        commitUrl: '',
        date: new Date().toLocaleString(),
        name: 'aerie-ui',
      };
    }
  });
</script>

<Modal bind:this={modal} height={200}>
  <div class="header">
    <div class="title">About</div>
    <button class="st-button icon fs-6" on:click|stopPropagation={modal.hide}>
      <i class="bi bi-x" />
    </button>
  </div>
  <div class="content">
    <div>Copyright 2021, by the California Institute of Technology.</div>
    <div>ALL RIGHTS RESERVED.</div>
    <div>
      United States Government sponsorship acknowledged. Any commercial use must
      be negotiated with the Office of Technology Transfer at the California
      Institute of Technology.
    </div>
    <div class="mt-3">
      {version.name} -
      <a href={version.commitUrl} rel="noopener noreferrer" target="_blank">
        {version.branch}:{version.commit}
      </a>
      -
      {version.date}
    </div>
  </div>
  <div class="footer">
    <button class="st-button" on:click|stopPropagation={modal.hide}>
      Close
    </button>
  </div>
</Modal>
