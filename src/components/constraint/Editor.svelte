<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import MonacoEditor from '../monaco/MonacoEditor.svelte';
  import Chip from '../stellar/Chip.svelte';
  import Card from '../ui/Card.svelte';
  import Panel from '../ui/Panel.svelte';
  import req from '../../utilities/requests';
  import { tooltip } from '../../utilities/tooltip';

  export let constraint: Constraint | null = null;
  export let modelId: number;
  export let planId: number;

  const dispatch = createEventDispatcher();

  let debounce: NodeJS.Timeout;
  let definition: string = '';
  let definitionError: string | null = null;
  let description: string = '';
  let name: string = '';
  let summary: string = '';
  let type: string = 'model';

  $: valid = definition !== '' && !definitionError && name !== '';

  onMount(async () => {
    if (constraint) {
      definition = JSON.stringify(JSON.parse(constraint.definition), null, 2);
      description = constraint.description;
      name = constraint.name;
      summary = constraint.summary;
      type = constraint.modelId ? 'model' : 'plan';
    } else {
      definition = '';
      description = '';
      name = '';
      summary = '';
      type = 'model';
    }
  });

  async function onTextChanged(event: CustomEvent<{ value: string }>) {
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

  function save() {
    const useModelId = type === 'model' ? modelId : null;
    const usePlanId = type === 'plan' ? planId : null;

    if (constraint) {
      const updatedConstraint: Constraint = {
        definition,
        description,
        id: constraint.id,
        modelId: useModelId,
        name,
        planId: usePlanId,
        summary,
      };
      dispatch('update', updatedConstraint);
    } else {
      const newConstraint: CreateConstraint = {
        definition,
        description,
        modelId: useModelId,
        name,
        planId: usePlanId,
        summary,
      };
      dispatch('create', newConstraint);
    }
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Constraint Editor</Chip>
    <button
      class="st-button icon"
      disabled={!valid}
      on:click|stopPropagation={save}
      use:tooltip={{ content: 'Save Constraint', placement: 'left' }}
    >
      <i class="bi bi-save" />
    </button>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <details open>
      <summary class="p-2">Constraint Metadata</summary>
      <Card class="p-1">
        <fieldset>
          <label for="type">Type</label>
          <select bind:value={type} class="st-select w-100" name="type">
            <option value="model">Model</option>
            <option value="plan">Plan</option>
          </select>
        </fieldset>

        <fieldset>
          <label for="name">Name</label>
          <input
            bind:value={name}
            autocomplete="off"
            class="st-input w-100"
            name="name"
            required
          />
        </fieldset>

        <fieldset>
          <label for="description">Description</label>
          <input
            bind:value={description}
            autocomplete="off"
            class="st-input w-100"
            name="description"
          />
        </fieldset>

        <fieldset>
          <label for="summary">Summary</label>
          <input
            bind:value={summary}
            autocomplete="off"
            class="st-input w-100"
            name="summary"
          />
        </fieldset>
      </Card>
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
        on:didChangeModelContent={onTextChanged}
      />
    </details>
  </svelte:fragment>
</Panel>
