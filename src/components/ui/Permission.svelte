<svelte:options accessors={true} />

<script lang="ts">
  import { useActions, type ActionArray } from '../../utilities/useActions';

  export let className: string = '';
  export let use: ActionArray = [];
</script>

<div use:useActions={use} class={className}>
  <slot />
</div>
