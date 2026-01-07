<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Label, Textarea } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../../types/app';
  import effects from '../../../utilities/effects';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let user: User | null;
  export let workspaceId: number;

  let creating: boolean = false;
  let description: string = '';
  let files: FileList | undefined;
  let file: File | undefined;
  let name: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean };
  }>();

  // File parse logic
  $: if (files && files[0]) {
    file = files[0];
  }

  $: createButtonDisabled = !name || !file || creating;

  function handleCancel() {
    open = false;
  }

  async function handleCreate() {
    if (!createButtonDisabled && file) {
      creating = true;
      const success = await effects.createActionDefinition(file, name, description, workspaceId, user);
      creating = false;
      if (success) {
        open = false;
        dispatch('resolve', { confirm: true });
      }
    }
  }

  function onInputKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      handleCreate();
    }
  }
</script>

<StellarDialog bind:open size="sm" title="New Action" on:close>
  <div class="grid gap-4 py-2">
    <div class="grid gap-1">
      <Label size="sm" for="name">Name</Label>
      <Input bind:value={name} id="name" type="text" placeholder="Enter a name" on:keydown={onInputKeydown} />
    </div>
    <div class="grid gap-1">
      <Label size="sm" for="description">Description</Label>
      <Textarea class="text-xs" bind:value={description} id="description" placeholder="Enter a description" />
    </div>
    <div class="grid gap-1">
      <Label size="sm" for="file">Source File</Label>
      <input
        bind:files
        id="file"
        name="file"
        type="file"
        accept=".js"
        class="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmText={creating ? 'Creating...' : 'Create'}
      confirmDisabled={createButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleCreate}
    />
  </svelte:fragment>
</StellarDialog>
