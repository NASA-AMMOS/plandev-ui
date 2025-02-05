<script lang="ts">
  import { Command } from '@nasa-jpl/stellar-svelte';
  import { Expand, Goal, Scale, SquarePlay } from 'lucide-svelte';
  import { onMount } from 'svelte';

  let open = false;

  onMount(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        open = !open;
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<Command.Dialog bind:open>
  <Command.Input placeholder="Type a command or search..." />
  <Command.List>
    <Command.Empty>No results found.</Command.Empty>
    <Command.Group heading="Suggestions">
      <Command.Item><Expand class="mr-2 h-1 w-1" /> <span>Expansion: Expand Activities</span></Command.Item>
      <Command.Item><Scale class="mr-2 h-1 w-1" /> <span>Constraints: Check Constraints</span></Command.Item>
      <Command.Item><Scale class="mr-2 h-1 w-1" /> <span>Constraints: Manage Constraints</span></Command.Item>
    </Command.Group>
    <Command.Separator />
    <Command.Group heading="Simulation">
      <Command.Item><SquarePlay class="mr-2 h-1 w-1" /> <span>Simulation: Run Simulation</span></Command.Item>
    </Command.Group>
    <Command.Group heading="Scheduling">
      <Command.Item><Goal class="mr-2 h-1 w-1" /> <span>Scheduling: Run Scheduling</span></Command.Item>
      <Command.Item><Goal class="mr-2 h-1 w-1" /> <span>Scheduling: Analyze Goal Satisfaction</span></Command.Item>
    </Command.Group>
    <Command.Group heading="Settings">
      <Command.Item>Logout</Command.Item>
      <Command.Item>Switch Role</Command.Item>
    </Command.Group>
  </Command.List>
</Command.Dialog>
