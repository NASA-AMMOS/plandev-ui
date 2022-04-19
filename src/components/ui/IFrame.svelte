<svelte:options immutable={true} />

<script lang="ts">
  export let src: string = '';
  export let title: string = '';
</script>

<iframe allow="fullscreen" {src} title="iframe-{title}" />

<style>
  iframe {
    border: 0;
    height: 100%;
    width: 100%;
  }
</style>
