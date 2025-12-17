<svelte:options immutable={true} />

<script lang="ts">
  import { Badge, Button, Command, Popover } from '@nasa-jpl/stellar-svelte';
  import { Clapperboard } from 'lucide-svelte';
  import { createEventDispatcher, tick } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import ActionMenuItem from '../ui/ActionMenuItem.svelte';
  import Tooltip from '../ui/Tooltip.svelte';

  export let actions: { action: ActionDefinition; parameter: string }[] = [];
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    runAction: { action: ActionDefinition; parameter: string };
  }>();

  let open = false;

  // We want to refocus the trigger button when the user selects
  // an item from the list so users can continue navigating the
  // rest of the form with the keyboard.
  function closeAndFocusTrigger(triggerId: string) {
    open = false;
    tick().then(() => {
      document.getElementById(triggerId)?.focus();
    });
  }
</script>

<Tooltip content="Run Action" side="top" align="center">
  <Popover.Root bind:open let:ids>
    <Popover.Trigger asChild let:builder>
      <Button builders={[builder]} variant="outline" role="combobox" aria-expanded={open} {disabled}>
        <Badge variant="secondary" class="h-4 bg-gray-200 px-1 hover:bg-gray-200">{actions.length}</Badge>
        <Clapperboard size={16} class="ml-2 h-4 w-4 shrink-0 " />
      </Button>
    </Popover.Trigger>
    <Popover.Content class="w-[300px] p-0">
      <Command.Root size="xs">
        <Command.Input placeholder="Search actions..." />
        <Command.Empty>No action found.</Command.Empty>
        <Command.Group class="max-h-[300px] overflow-y-auto">
          {#each actions as action}
            <Command.Item
              value={`${action.action.name} ${action.action.description ?? ''}`}
              onSelect={() => {
                dispatch('runAction', { action: action.action, parameter: action.parameter });
                closeAndFocusTrigger(ids.trigger);
              }}
            >
              <ActionMenuItem name={action.action.name} description={action.action.description} className="" />
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
</Tooltip>
