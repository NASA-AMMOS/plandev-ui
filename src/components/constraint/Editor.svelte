<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import Field from '../form/Field.svelte';
  import Label from '../form/Label.svelte';
  import Card from '../ui/Card.svelte';
  import CodeMirrorJsonEditor from '../ui/CodeMirrorJsonEditor.svelte';
  import AlertError from '../ui/AlertError.svelte';
  import Panel from '../ui/Panel.svelte';
  import type { Constraint, CreateConstraint } from '../../types';
  import { reqValidateConstraint } from '../../utilities/requests';

  const dispatch = createEventDispatcher();

  export let constraint: Constraint | null = null;
  export let modelId: number;
  export let planId: number;

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

  async function onTextChanged(event: CustomEvent<string>) {
    const { detail: json } = event;
    try {
      definition = json;
      definitionError = null;

      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        const { valid } = await reqValidateConstraint(json);
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
  <span slot="header"> Constraint Editor </span>
  <span slot="body">
    <details open>
      <summary class="p-2">Constraint Metadata</summary>
      <Card class="m-2">
        <Field>
          <Label for="type">Type</Label>
          <select bind:value={type} class="st-select w-100" name="type">
            <option value="model">Model</option>
            <option value="plan">Plan</option>
          </select>
        </Field>

        <Field>
          <Label for="name">Name</Label>
          <input
            bind:value={name}
            autocomplete="off"
            class="st-input w-100"
            name="name"
            required
          />
        </Field>

        <Field>
          <Label for="description">Description</Label>
          <input
            bind:value={description}
            autocomplete="off"
            class="st-input w-100"
            name="description"
          />
        </Field>

        <Field>
          <Label for="summary">Summary</Label>
          <input
            bind:value={summary}
            autocomplete="off"
            class="st-input w-100"
            name="summary"
          />
        </Field>
      </Card>
    </details>

    <details open class="h-100">
      <summary class="p-2">Constraint Definition</summary>
      <AlertError
        class="mb-3 ms-2 me-2"
        message={definitionError}
        visible={definitionError !== null}
      />
      <CodeMirrorJsonEditor text={definition} on:textChanged={onTextChanged} />
    </details>
  </span>

  <span slot="footer">
    <button class="st-button" disabled={!valid} on:click={save}>Save</button>
  </span>
</Panel>
