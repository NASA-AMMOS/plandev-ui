<svelte:options immutable={true} />

<script lang="ts">
  import { CircleQuestionMark } from 'lucide-svelte';
  import type { Placement } from 'tippy.js';
  import { tooltip } from '../../utilities/tooltip';

  export let content: string;
  export let placement: Placement = 'top';
  /** Icon size in px. Defaults to sitting just under a 12px form label. */
  export let size: number = 13;
</script>

<!-- A button rather than a decorated span: only a focusable element advertises itself and is reachable
     by keyboard. It performs no action; tippy triggers on hover and focus, and the tooltip action sets
     aria-label from the content. Muted until pointed at, so a column of these reads as punctuation. -->
<button
  class="inline-flex shrink-0 cursor-help items-center border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground focus-visible:text-foreground"
  type="button"
  use:tooltip={{ content, maxWidth: 350, placement }}
  aria-label={content}
>
  <CircleQuestionMark {size} />
</button>
