<svelte:options immutable={true} />

<script lang="ts">
  import { session } from '$app/stores';
  import Field from '../form/Field.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Panel from '../ui/Panel.svelte';
  import { field } from '../../stores/form';
  import { schedulingActions, schedulingDslTypes, selectedSpecGoal } from '../../stores/scheduling';
  import { required } from '../../utilities/validators';

  export let gridId: number;

  let definitionField = field<string>('', [required]);
  let descriptionField = field<string>('');
  let monaco: Monaco;
  let nameField = field<string>('', [required]);

  $: if ($selectedSpecGoal) {
    definitionField.validateAndSet($selectedSpecGoal.goal.definition);
    descriptionField.validateAndSet($selectedSpecGoal.goal.description);
    nameField.validateAndSet($selectedSpecGoal.goal.name);
  } else {
    definitionField.reset(`export default (): Goal => {\n\n}`);
    descriptionField.reset('');
    nameField.reset('');
  }

  $: saveButtonEnabled = $definitionField.dirtyAndValid && $nameField.dirtyAndValid;

  $: if (monaco !== undefined && $schedulingDslTypes !== undefined) {
    const { languages } = monaco;
    const { typescript } = languages;
    const { typescriptDefaults } = typescript;
    const options = typescriptDefaults.getCompilerOptions();

    typescriptDefaults.setCompilerOptions({ ...options, lib: ['ESNext'], strictNullChecks: true });
    typescriptDefaults.setExtraLibs([{ content: $schedulingDslTypes, filePath: 'aerie-scheduling.d.ts' }]);
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    definitionField.validateAndSet(value);
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

<Panel overflowYBody="hidden" padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Scheduling Editor" />
    <div class="right">
      <button class="st-button secondary ellipsis" disabled={!saveButtonEnabled} on:click={() => saveGoal()}>
        <i class="bi bi-save" style="font-size: 0.8rem" />
        Save
      </button>
      <button
        class="st-button secondary ellipsis"
        disabled={!$selectedSpecGoal}
        on:click={() => schedulingActions.selectGoal()}
      >
        <i class="bi bi-plus-square" style="font-size: 0.8rem" />
        New
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $selectedSpecGoal}
      <fieldset>
        <label for="id">Id</label>
        <input
          class="st-input w-100"
          disabled
          name="id"
          value="{$selectedSpecGoal.specification_id}-{$selectedSpecGoal.goal.id}"
        />
      </fieldset>
    {/if}

    <Field field={nameField}>
      <label for="name" slot="label">Goal Name</label>
      <input autocomplete="off" class="st-input w-100" name="name" placeholder="Enter Goal Name (required)" required />
    </Field>

    <Field field={descriptionField}>
      <label for="description" slot="label">Goal Description</label>
      <textarea autocomplete="off" class="st-input w-100" name="name" placeholder="Enter Goal Description (optional)" />
    </Field>

    <fieldset>Goal Definition</fieldset>

    <MonacoEditor
      bind:monaco
      automaticLayout={true}
      language="typescript"
      lineNumbers="on"
      minimap={{ enabled: false }}
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
