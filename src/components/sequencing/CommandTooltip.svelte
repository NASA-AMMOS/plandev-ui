<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommand, HwCommand } from '@nasa-jpl/aerie-ampcs';

  export let command: FswCommand | HwCommand;

  let commandExample: string = '';

  $: commandExample = command.stem;

  $: if (command.type === 'hw_command') {
    commandExample = command.stem;
  } else if (command.type === 'fsw_command') {
    const commandArgs = command.arguments.map(({ arg_type, name }) => `${name}: ${arg_type}`);
    if (commandArgs.length) {
      commandExample = `${command.stem}(${commandArgs.join(', ')})`;
    } else {
      commandExample = command.stem;
    }
  }
</script>

<div class="sequence-tooltip st-typography-body">
  <div class="container command-name">
    {commandExample}
  </div>

  <div class="container">
    {command.description}
  </div>
</div>

<style>
  .command-name {
    border-bottom: 1px solid var(--st-gray-30);
  }

  .container {
    align-items: center;
    display: flex;
    padding: 5px;
  }
</style>
