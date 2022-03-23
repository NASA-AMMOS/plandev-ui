<svelte:options immutable={true} />

<script lang="ts">
  import { session } from '$app/stores';
  import Field from '../form/Field.svelte';
  import Chip from '../ui/Chip.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';
  import { field } from '../../stores/form';
  import { schedulingActions, selectedSpecGoal } from '../../stores/scheduling';
  import { required } from '../../utilities/validators';

  let definitionField = field<string>('', [required]);
  let descriptionField = field<string>('');
  let nameField = field<string>('', [required]);

  $: if ($selectedSpecGoal) {
    definitionField.validate($selectedSpecGoal.goal.definition);
    descriptionField.validate($selectedSpecGoal.goal.description);
    nameField.validate($selectedSpecGoal.goal.name);
  } else {
    $definitionField.value = '';
    $descriptionField.value = '';
    $nameField.value = '';
  }

  $: saveButtonEnabled =
    $definitionField.dirtyAndValid && $nameField.dirtyAndValid;

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    definitionField.validate(value);
  }

  function saveGoal() {
    const definition = $definitionField.value;
    const description = $descriptionField.value;
    const name = $nameField.value;

    if ($selectedSpecGoal) {
      const { goal } = $selectedSpecGoal;
      schedulingActions.updateGoal(goal.id, { definition, description, name });
    } else {
      const { user } = $session;
      schedulingActions.createGoal(definition, description, name, user.id);
    }
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <Chip>Scheduling Goal Editor</Chip>
    <div class="right">
      <button
        class="st-button secondary ellipsis"
        disabled={!saveButtonEnabled}
        on:click={() => saveGoal()}
      >
        <i class="bi bi-save" style="font-size: 0.8rem" />
        Save Goal
      </button>
      <button
        class="st-button icon"
        on:click={() => schedulingActions.closeGoalEditor()}
      >
        <i class="bi bi-x" />
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <Field field={nameField}>
      <label for="name" slot="label">Goal Name</label>
      <input
        autocomplete="off"
        class="st-input w-100"
        name="name"
        placeholder="Enter Goal Name (required)"
        required
      />
    </Field>

    <Field field={descriptionField}>
      <label for="description" slot="label">Goal Description</label>
      <textarea
        autocomplete="off"
        class="st-input w-100"
        name="name"
        placeholder="Enter Goal Description (optional)"
      />
    </Field>

    <fieldset>Goal Definition</fieldset>
    <MonacoEditor
      automaticLayout={true}
      language="typescript"
      lineNumbers="on"
      minimap={{ enabled: true }}
      scrollBeyondLastLine={true}
      value={$definitionField.value}
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
