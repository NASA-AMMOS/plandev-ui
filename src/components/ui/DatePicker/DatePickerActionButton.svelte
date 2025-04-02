<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';

  export let text: string = '';
</script>

<Button type="button" variant="ghost" class="inline-flex flex-none justify-start gap-2" on:click>
  <div class="action-icon">
    <slot />
  </div>
  {text}
</Button>
