<svelte:options immutable={true} />

<script lang="ts">
  import type { ValueSource } from '../../types/parameter';
  import { classNames } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';

  export let source: ValueSource;

  $: dotClasses = classNames('value-source-badge-dot st-typography-body', {
    'value-source-badge-dot--mission': source === 'mission',
    'value-source-badge-dot--user': source === 'user',
  });
  $: tooltipContent = source === 'mission' ? 'Default Mission Value' : source === 'user' ? 'User Override' : '';
</script>

{#if source !== 'none'}
  <div class="value-source-badge-dot-root" use:tooltip={{ content: tooltipContent, placement: 'top' }}>
    <div class={dotClasses} />
  </div>
{/if}

<style>
  .value-source-badge-dot-root {
    align-items: center;
    display: flex;
    height: 16px;
    justify-content: center;
    width: 16px;
  }

  .value-source-badge-dot {
    background-color: gray;
    border-radius: 50%;
    height: 6px;
    width: 6px;
  }

  .value-source-badge-dot--user {
    background: orange;
  }

  .value-source-badge-dot--mission {
    background: blue;
  }
</style>
