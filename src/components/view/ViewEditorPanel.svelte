<script lang="ts">
  import { session } from '$app/stores';
  import { view, viewDefinitionText } from '../../stores/views';
  import effects from '../../utilities/effects';
  import GridMenu from '../menus/GridMenu.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';

  export let gridId: number;

  let saveAsViewDisabled: boolean = true;
  let saveViewDisabled: boolean = true;

  $: saveAsViewDisabled = $view?.name === '';
  $: saveViewDisabled = $view?.name === '' || $view?.owner !== $session?.user?.id;

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>): void {
    const { detail } = event;
    const { value } = detail;

    try {
      const definition: ViewDefinition = JSON.parse(value);
      $view = { ...$view, definition };
    } catch (e) {
      console.log(e);
    }
  }

  function saveAsView() {
    if ($view && !saveAsViewDisabled) {
      effects.createView($view.name, $session?.user?.id, $view.definition);
    }
  }

  function saveView() {
    if ($view && $view.owner === $session.user.id && !saveViewDisabled) {
      effects.updateView($view.id, { definition: $view.definition, name: $view.name });
    }
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="View Editor" />
    <div class="right">
      <button class="st-button secondary ellipsis" disabled={saveViewDisabled} on:click={saveView}>
        <i class="bi bi-save" style="font-size: 0.8rem" />
        Save
      </button>
      <button class="st-button secondary ellipsis" disabled={saveAsViewDisabled} on:click={saveAsView}>
        <i class="bi bi-save-fill" style="font-size: 0.8rem" />
        Save As
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <div class="pb-2">
      <fieldset>
        <label for="id">ID</label>
        <input bind:value={$view.id} class="st-input w-100" disabled name="id" required type="text" />
      </fieldset>

      <fieldset>
        <label for="owner">Owner</label>
        <input bind:value={$view.owner} class="st-input w-100" disabled name="owner" required type="text" />
      </fieldset>

      <fieldset>
        <label for="name">Name</label>
        <input bind:value={$view.name} autocomplete="off" class="st-input w-100" name="name" required type="text" />
      </fieldset>
    </div>

    <MonacoEditor
      automaticLayout={true}
      language="json"
      lineNumbers="on"
      minimap={{ enabled: false }}
      scrollBeyondLastLine={false}
      tabSize={2}
      value={$viewDefinitionText}
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
