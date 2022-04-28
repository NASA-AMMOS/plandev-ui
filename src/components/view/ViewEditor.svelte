<script lang="ts">
  import { session } from '$app/stores';
  import GridMenu from '../menus/GridMenu.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';
  import { view, viewActions, viewText } from '../../stores/views';

  export let gridId: number;

  let name: string = '';

  $: saveViewDisabled = $view?.meta?.owner !== $session?.user?.id;

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>): void {
    const { detail } = event;
    const { value } = detail;

    try {
      const newView = JSON.parse(value);
      $view = newView;
    } catch (e) {
      console.log(e);
    }
  }

  function saveAsView() {
    const newView = { ...$view, name };
    viewActions.createView(newView);
  }

  function saveView() {
    if ($view?.meta?.owner === $session.user.id) {
      viewActions.updateView($view);
    }
  }
</script>

<Panel overflowYBody="hidden" padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="View Editor" />
    <div class="right">
      <button class="st-button secondary ellipsis" disabled={saveViewDisabled} on:click={saveView}>
        <i class="bi bi-save" style="font-size: 0.8rem" />
        Save
      </button>
      <button class="st-button secondary ellipsis" disabled={name === ''} on:click={saveAsView}>
        <i class="bi bi-save-fill" style="font-size: 0.8rem" />
        Save As
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <fieldset>
      <label for="type">View Name</label>
      <input bind:value={name} autocomplete="off" class="st-input w-100" name="name" required type="text" />
    </fieldset>

    <MonacoEditor
      automaticLayout={true}
      language="json"
      lineNumbers="on"
      minimap={{ enabled: false }}
      scrollBeyondLastLine={true}
      value={$viewText}
      on:didChangeModelContent={onDidChangeModelContent}
    />
  </svelte:fragment>
</Panel>

<style>
  .right {
    align-items: center;
    display: inline-flex;
    gap: 5px;
  }
</style>
