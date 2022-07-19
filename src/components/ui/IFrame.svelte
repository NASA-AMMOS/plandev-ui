<svelte:options immutable={true} />

<script lang="ts">
  import { view } from '../../stores/views';

  export let iFrameId: number;

  let iFrame: ViewIFrame;

  $: iFrame = $view?.definition.plan.iFrames.find(iFrame => iFrame.id === iFrameId);
</script>

<iframe allow="fullscreen" src={iFrame?.src} title="iframe-{iFrame?.title}" />

<style>
  iframe {
    border: 0;
    height: 100%;
    width: 100%;
  }
</style>
