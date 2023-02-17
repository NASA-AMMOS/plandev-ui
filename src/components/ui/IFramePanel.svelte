<svelte:options immutable={true} />

<script lang="ts">
  import { view, viewUpdateIFrame } from '../../stores/views';
  import type { ViewGridSection, ViewIFrame } from '../../types/view';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import IFrame from './IFrame.svelte';

  export let gridSection: ViewGridSection;

  let iFrameId: number = 0;
  let iFrame: ViewIFrame;
  let iFrameSrc: string = '';

  $: iFrame = $view?.definition.plan.iFrames.find(frame => frame.id === iFrameId);
  $: iFrameSrc = iFrame?.src ?? '';
  $: viewUpdateIFrame('src', iFrameSrc, iFrameId);
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="External Application" />
    <input bind:value={iFrameSrc} class="st-input w-100" class:error={iFrameSrc === ''} type="text" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <IFrame {iFrameId} />
  </svelte:fragment>
</Panel>
