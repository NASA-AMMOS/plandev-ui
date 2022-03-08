<svelte:options immutable={true} />

<script lang="ts">
  import { session } from '$app/stores';
  import Field from '../form/Field.svelte';
  import Chip from '../ui/Chip.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';
  import { field } from '../../stores/form';
  import { plan } from '../../stores/plan';
  import req from '../../utilities/requests';
  import { createSchedulingGoal } from '../../stores/scheduling';
  import { required } from '../../utilities/validators';

  let definitionField = field<string>('', [required]);
  let descriptionField = field<string>('');
  let nameField = field<string>('', [required]);

  async function onSaveGoal() {
    createGoal();
  }

  async function createGoal() {
    const goal: SchedulingGoalInsertInput = {
      author: $session.user.id,
      definition: $definitionField.value,
      description: $descriptionField.value,
      last_modified_by: $session.user.id,
      model_id: $plan.model.id,
      name: $nameField.value,
    };
    const newGoal = await createSchedulingGoal(goal);

    const specification_id = $plan.scheduling_specifications[0].id;
    const priorities = await req.getSchedulingSpecGoalPriorities(
      specification_id,
    );
    const priority = priorities.pop() + 1 || 1;

    const specGoal: SchedulingSpecGoalInsertInput = {
      goal_id: newGoal.id,
      priority,
      specification_id: $plan.scheduling_specifications[0].id,
    };
    await req.createSchedulingSpecGoal(specGoal);
  }

  async function onDidChangeModelContent(
    event: CustomEvent<{ value: string }>,
  ) {
    const { detail } = event;
    const { value } = detail;
    $definitionField.value = value;
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <Chip>Scheduling Goal Editor</Chip>
    <button
      class="st-button secondary ellipsis"
      style="gap: 5px"
      on:click={onSaveGoal}
    >
      <i class="bi bi-save" style="font-size: 0.8rem" />
      Save Goal
    </button>
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
