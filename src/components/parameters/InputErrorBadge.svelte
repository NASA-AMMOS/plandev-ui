<svelte:options immutable={true} />

<script lang="ts">
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import { tooltip } from '../../utilities/tooltip';

  export let errors: string[] = [];

  $: tooltipContent = errors.join('\n');
</script>

<div class="input-error-badge-root" use:tooltip={{ content: tooltipContent, placement: 'top' }}>
  <WarningIcon />
</div>

<style>
  .input-error-badge-root {
    align-items: center;
    color: var(--st-red);
    display: flex;
    height: 16px;
    justify-content: center;
    width: 16px;
  }
</style>
