<svelte:options immutable={true} />

<script lang="ts">
  import { modalBodyClickListener, modalBodyKeyListener } from '../utilities/modal';
</script>

<svelte:body on:click={modalBodyClickListener} on:keydown={modalBodyKeyListener} />

<slot />

<div id="svelte-modal" />
