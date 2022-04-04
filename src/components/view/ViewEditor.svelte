<script lang="ts">
  import Chip from '../ui/Chip.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';
  import { view, viewText } from '../../stores/views';

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
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <Chip>Edit View</Chip>
  </svelte:fragment>

  <svelte:fragment slot="body">
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
