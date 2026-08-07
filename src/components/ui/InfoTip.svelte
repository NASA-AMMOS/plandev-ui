<svelte:options immutable={true} />

<script lang="ts">
  import { CircleQuestionMark } from 'lucide-svelte';
  import type { Placement } from 'tippy.js';
  import { tooltip } from '../../utilities/tooltip';

  export let content: string;
  export let placement: Placement = 'top';
  /** Icon size in px. Defaults to sitting just under a 12px form label without crowding it. */
  export let size: number = 13;
</script>

<!--
  A button rather than a decorated span: the point of this component is that a bare label gives no hint
  a tooltip exists, and only a focusable, interactive element advertises itself and is reachable by
  keyboard. It performs no action -- tippy triggers on hover and focus, and handles tap on touch. The
  tooltip action sets aria-label from the content, so screen readers get the same text.
-->
<button class="info-tip" type="button" use:tooltip={{ content, maxWidth: 350, placement }} aria-label={content}>
  <CircleQuestionMark {size} />
</button>

<style>
  /* Muted until pointed at, so a column of these reads as punctuation rather than as a row of controls */
  .info-tip {
    align-items: center;
    background: none;
    border: 0;
    color: var(--st-gray-40);
    cursor: help;
    display: inline-flex;
    flex-shrink: 0;
    padding: 0;
  }

  .info-tip:hover,
  .info-tip:focus-visible {
    color: var(--st-gray-70);
  }
</style>
