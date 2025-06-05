<svelte:options immutable={true} />

<script lang="ts">
  import { page } from '$app/stores';
  import SequenceEditor from '../../../components/sequencing/SequenceEditor.svelte';
  // Keep these imports for the commented grid layout reference
  // import WorkspaceTreeView from '../../../components/workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import AppSidebar from '../../../components/AppSidebar.svelte';
  import * as Sidebar from '../../../components/sidebar-evaluation/index.js';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { parcel, workspaceId } from '../../../stores/workspaces';
  import effects from '../../../utilities/effects';
  import type { PageData } from './$types';

  export let data: PageData;

  const { initialWorkspace, user } = data;

  let selectedSequenceDefinition: string = '';
  let selectedSequenceId: string | null = null;
  // let workspaceTree: WorkspaceTreeNode | null = null;

  $: if (initialWorkspace) {
    $workspaceId = initialWorkspace.id;
    selectedSequenceId = $page.url.searchParams.get(SearchParameters.SEQUENCE_ID);
    // getWorkspaceContents(initialWorkspace);
  }

  $: getSelectedSequenceDefinition(selectedSequenceId);

  // async function getWorkspaceContents(workspace: Workspace | undefined) {
  //   if (workspace) {
  //     const workspaceContents = await effects.getWorkspaceContents(workspace.id, user);
  //     if (workspaceContents) {
  //       workspaceTree = {
  //         contents: workspaceContents,
  //         name: workspace.name,
  //         type: WorkspaceContentType.Workspace,
  //       };
  //     }
  //   }
  // }

  async function getSelectedSequenceDefinition(sequenceId: string | null) {
    if (sequenceId !== null && user) {
      selectedSequenceDefinition = (await effects.getSequenceDefinition(sequenceId, user)) ?? '';
    } else {
      selectedSequenceDefinition = '';
    }
  }

  async function onNewFolder() {
    if ($workspaceId != null && user) {
      await effects.newWorkspaceFolder($workspaceId, user);
      // refreshWorkspaceContents();
    }
  }

  async function onNewSequence() {
    if ($workspaceId != null && user) {
      await effects.newWorkspaceSequence($workspaceId, user);
      // refreshWorkspaceContents();
    }
  }

  // function refreshWorkspaceContents() {
  //   getWorkspaceContents(initialWorkspace);
  // }

  // Placeholder refresh function for the new sidebar
  function refreshWorkspaceContents() {
    console.log('Refresh workspace contents - to be implemented with new sidebar');
  }
</script>

<Sidebar.Provider>
  <AppSidebar {onNewFolder} {onNewSequence} {refreshWorkspaceContents} />
  <Sidebar.Inset>
    <div class="grid h-full grid-cols-1 grid-rows-1">
      <SequenceEditor
        parcel={$parcel}
        showCommandFormBuilder={true}
        sequenceDefinition={selectedSequenceDefinition}
        title="Sequence - Definition Editor"
        {user}
        readOnly={false}
        workspaceId={$workspaceId}
        on:sequence
        on:didChangeModelContent
      />
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>

<!-- Original grid layout commented out for reference -->
<!--
<CssGrid bind:columns={$workspaceColumns}>
  <Panel borderRight padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>Workspace</SectionTitle>
      <div>
        <Button variant="outline" class="gap-1">
          <Clapperboard size={16} />
          Actions
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild let:builder>
            <Button builders={[builder]} variant="outline" class="gap-1">
              <PlusIcon size={16} />
              New
              <ChevronDown size={16} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class="w-56">
            <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onNewSequence}>
              <FilePlus size={16} />New Sequence
            </DropdownMenu.Item>
            <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onNewFolder}>
              <FolderPlus size={16} />New Folder
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item class="cursor-pointer gap-1"><ArrowUpFromLine size={16} />Import File</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <Button variant="outline">
          <FolderTree size={16} />
        </Button>
        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Button builders={[builder]} variant="outline" on:click={refreshWorkspaceContents}>
              <RefreshCcw size={16} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <div>Refresh Workspace Contents</div>
          </Tooltip.Content>
        </Tooltip.Root>
        <Button variant="outline">
          <SettingsIcon size={16} />
        </Button>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="body">
      <div class="h-max p-2">
        <div>Workspace tree view placeholder</div>
      </div>
    </svelte:fragment>
  </Panel>
  <CssGridGutter track={1} type="column" />

  <SequenceEditor
    parcel={$parcel}
    showCommandFormBuilder={true}
    sequenceDefinition={selectedSequenceDefinition}
    title="Sequence - Definition Editor"
    {user}
    readOnly={false}
    workspaceId={$workspaceId}
    on:sequence
    on:didChangeModelContent
  />
</CssGrid>
-->

<style>
</style>
