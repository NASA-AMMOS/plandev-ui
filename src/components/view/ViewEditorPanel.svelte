<script lang="ts">
  import { view, viewDefinitionText } from '../../stores/views';
  import Input from '../form/Input.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';

  export let gridId: number;

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
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="View Editor" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <div class="pb-2">
      <fieldset>
        <Input layout="inline">
          <label for="id">ID</label>
          <input bind:value={$view.id} class="st-input w-100" disabled name="id" required type="text" />
        </Input>
      </fieldset>

      <fieldset>
        <Input layout="inline">
          <label for="owner">Owner</label>
          <input bind:value={$view.owner} class="st-input w-100" disabled name="owner" required type="text" />
        </Input>
      </fieldset>

      <fieldset>
        <Input layout="inline">
          <label for="name">Name</label>
          <input bind:value={$view.name} autocomplete="off" class="st-input w-100" name="name" required type="text" />
        </Input>
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
