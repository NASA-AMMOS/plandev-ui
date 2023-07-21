<svelte:options immutable={true} />

<script lang="ts">
  import { view } from '../../stores/views';
  import type { ViewIFrame } from '../../types/view';

  export let iFrameId: number;

  let iFrame: ViewIFrame | undefined;

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
