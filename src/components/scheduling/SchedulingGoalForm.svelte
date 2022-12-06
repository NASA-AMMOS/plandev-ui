<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { user as userStore } from '../../stores/app';
  import { schedulingGoalsColumns } from '../../stores/scheduling';
  import effects from '../../utilities/effects';
  import PageTitle from '../app/PageTitle.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SchedulingGoalEditor from './SchedulingGoalEditor.svelte';

  export let initialGoalAuthor: string | null = null;
  export let initialGoalCreatedDate: string | null = null;
  export let initialGoalDefinition: string = 'export default (): Goal => {\n\n}\n';
  export let initialGoalDescription: string = '';
  export let initialGoalId: number | null = null;
  export let initialGoalModelId: number | null = null;
  export let initialGoalModifiedDate: string | null = null;
  export let initialGoalName: string = '';
  export let initialModels: ModelSlim[] = [];
  export let initialSpecId: number | null = null;
  export let mode: 'create' | 'edit' = 'create';

  let goalAuthor: string | null = initialGoalAuthor;
  let goalCreatedDate: string | null = initialGoalCreatedDate;
  let goalDefinition: string = initialGoalDefinition;
  let goalDescription: string = initialGoalDescription;
  let goalId: number | null = initialGoalId;
  let goalModelId: number | null = initialGoalModelId;
  let goalModifiedDate: string | null = initialGoalModifiedDate;
  let goalName: string = initialGoalName;
  let models: ModelSlim[] = initialModels;
  let saveButtonEnabled: boolean = false;
  let specId: number | null = initialSpecId;
  let savedGoal: Partial<SchedulingGoal> = {
    definition: goalDefinition,
    description: goalDescription,
    model_id: goalModelId,
    name: goalName,
  };

  $: saveButtonEnabled = goalDefinition !== '' && goalModelId !== null && goalName !== '';
  $: goalModified = diffGoals(savedGoal, {
    definition: goalDefinition,
    description: goalDescription,
    model_id: goalModelId,
    name: goalName,
  });
  $: saveButtonText = mode === 'edit' && !goalModified ? 'Saved' : 'Save';
  $: saveButtonClass = goalModified && saveButtonEnabled ? 'primary' : 'secondary';
  $: pageTitle = mode === 'edit' ? 'Scheduling Goals' : 'New Scheduling Goal';
  $: pageSubtitle = mode === 'edit' ? savedGoal.name : '';

  function diffGoals(goalA: Partial<SchedulingGoal>, goalB: Partial<SchedulingGoal>) {
    return Object.entries(goalA).some(([key, value]) => {
      return goalB[key] !== value;
    });
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    goalDefinition = value;
  }

  function onKeydown(event: KeyboardEvent): void {
    const { key, ctrlKey, metaKey } = event;
    if ((window.navigator.platform.match(/mac/i) ? metaKey : ctrlKey) && key === 's') {
      event.preventDefault();
      saveGoal();
    }
  }

  async function saveGoal() {
    if (saveButtonEnabled) {
      if (mode === 'create') {
        const newGoal = await effects.createSchedulingGoal(
          goalDefinition,
          goalDescription,
          goalName,
          $userStore?.id,
          goalModelId,
        );

        if (newGoal !== null) {
          const { id: newGoalId } = newGoal;

          if (specId !== null) {
            const specGoalInsertInput: SchedulingSpecGoalInsertInput = {
              enabled: true,
              goal_id: newGoalId,
              specification_id: specId,
            };
            await effects.createSchedulingSpecGoal(specGoalInsertInput);
          }

          goto(`${base}/scheduling/goals/edit/${newGoalId}`);
        }
      } else if (mode === 'edit') {
        const goal: Partial<SchedulingGoal> = {
          definition: goalDefinition,
          description: goalDescription,
          model_id: goalModelId,
          name: goalName,
        };
        const updatedGoal = await effects.updateSchedulingGoal(goalId, goal);
        if (updatedGoal) {
          goalModifiedDate = updatedGoal.modified_date;
          savedGoal = { ...goal };
        }
      }
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<PageTitle subTitle={pageSubtitle} title={pageTitle} />

<CssGrid bind:columns={$schedulingGoalsColumns}>
  <Panel overflowYBody="hidden" padBody={false}>
    <svelte:fragment slot="header">
      <Chip>{mode === 'create' ? 'New Scheduling Goal' : 'Edit Scheduling Goal'}</Chip>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/scheduling/goals`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button class="st-button {saveButtonClass} ellipsis" disabled={!saveButtonEnabled} on:click={saveGoal}>
          {saveButtonText}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if mode === 'edit'}
        <fieldset>
          <label for="goalId">Goal ID</label>
          <input class="st-input w-100" disabled name="goalId" value={goalId} />
        </fieldset>

        <fieldset>
          <label for="createdAt">Created At</label>
          <input class="st-input w-100" disabled name="createdAt" value={goalCreatedDate} />
        </fieldset>

        <fieldset>
          <label for="updatedAt">Updated At</label>
          <input class="st-input w-100" disabled name="updatedAt" value={goalModifiedDate} />
        </fieldset>

        <fieldset>
          <label for="author">Original Author</label>
          <input class="st-input w-100" disabled name="author" value={goalAuthor} />
        </fieldset>
      {/if}

      <fieldset>
        <label for="model">Model</label>
        <select bind:value={goalModelId} class="st-select w-100" name="model">
          <option value={null} />
          {#each models as model}
            <option value={model.id}>
              {model.name} ({model.id})
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="goal-name">Name</label>
        <input
          bind:value={goalName}
          autocomplete="off"
          class="st-input w-100"
          name="goal-name"
          placeholder="Enter Goal Name (required)"
          required
        />
      </fieldset>

      <fieldset>
        <label for="goal-description">Description</label>
        <textarea
          bind:value={goalDescription}
          autocomplete="off"
          class="st-input w-100"
          name="goal-description"
          placeholder="Enter Goal Description (optional)"
        />
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <SchedulingGoalEditor
    {goalDefinition}
    {goalModelId}
    title="{mode === 'create' ? 'New' : 'Edit'} Scheduling Goal - Definition Editor"
    on:didChangeModelContent={onDidChangeModelContent}
  />
</CssGrid>
