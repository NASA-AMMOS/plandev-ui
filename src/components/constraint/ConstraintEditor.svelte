<svelte:options immutable={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import Chip from '../ui/Chip.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';
  import req from '../../utilities/requests';
  import { constraintActions, selectedConstraint } from '../../stores/constraints';

  let constraintType: ConstraintType = 'model';
  let debounce: NodeJS.Timeout;
  let definition: string = '';
  let definitionError: string | null = null;
  let description: string = '';
  let name: string = '';
  let summary: string = '';

  $: valid = definition !== '' && !definitionError && name !== '';

  onMount(() => {
    if ($selectedConstraint) {
      constraintType = $selectedConstraint.model_id ? 'model' : 'plan';
      definition = JSON.stringify(JSON.parse($selectedConstraint.definition), null, 2);
      description = $selectedConstraint.description;
      name = $selectedConstraint.name;
      summary = $selectedConstraint.summary;
    } else {
      constraintType = 'model';
      definition = '';
      description = '';
      name = '';
      summary = '';
    }
  });

  async function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;

    try {
      definition = value;
      definitionError = null;

      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        const { valid } = await req.validateConstraint(value);
        if (!valid) {
          definitionError = 'Input is not a valid constraint';
        }
      }, 200);
    } catch (e) {
      console.log(e);
      definitionError = e.message;
    }
  }

  function saveConstraint() {
    if ($selectedConstraint) {
      constraintActions.updateConstraint(
        constraintType,
        $selectedConstraint.id,
        definition,
        description,
        name,
        summary,
      );
    } else {
      constraintActions.createConstraint(constraintType, definition, description, name, summary);
    }
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Constraint Editor</Chip>
    <button class="st-button secondary ellipsis" disabled={!valid} on:click={() => saveConstraint()}>
      <i class="bi bi-save" style="font-size: 0.8rem" />
      Save Constraint
    </button>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <details open>
      <summary class="p-2">Constraint Metadata</summary>
      <div class="p-1">
        <fieldset>
          <label for="type">Type</label>
          <select bind:value={constraintType} class="st-select w-100" name="type">
            <option value="model">Model</option>
            <option value="plan">Plan</option>
          </select>
        </fieldset>

        <fieldset>
          <label for="name">Name</label>
          <input bind:value={name} autocomplete="off" class="st-input w-100" name="name" required />
        </fieldset>

        <fieldset>
          <label for="description">Description</label>
          <input bind:value={description} autocomplete="off" class="st-input w-100" name="description" />
        </fieldset>

        <fieldset>
          <label for="summary">Summary</label>
          <input bind:value={summary} autocomplete="off" class="st-input w-100" name="summary" />
        </fieldset>
      </div>
    </details>

    <details open class="h-100">
      <summary class="p-2">
        <span class:error={definitionError !== null}>
          Constraint Definition
          {#if definitionError !== null}
            ({definitionError})
          {/if}
        </span>
      </summary>
      <MonacoEditor
        automaticLayout={true}
        language="json"
        lineNumbers="on"
        minimap={{ enabled: false }}
        scrollBeyondLastLine={false}
        value={definition}
        on:didChangeModelContent={onDidChangeModelContent}
      />
    </details>
  </svelte:fragment>
</Panel>
