<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type {
    ActivitiesMap,
    ActivityType,
    ArgumentsMap,
    FormParameter,
  } from '../../types';
  import Field from '../form/Field.svelte';
  import Input from '../form/Input.svelte';
  import ConfirmModal from '../modals/Confirm.svelte';
  import Decomposition from './Decomposition.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Chip from '../stellar/Chip.svelte';
  import Panel from '../ui/Panel.svelte';
  import { reqValidateActivityArguments } from '../../utilities/requests';
  import Card from '../ui/Card.svelte';
  import { required, timestamp } from '../../utilities/validators';
  import {
    getFormParameters,
    updateFormParameter,
  } from '../../utilities/parameters';
  import { tooltip } from '../../utilities/tooltip';
  import { field } from '../../stores/form';

  const dispatch = createEventDispatcher();

  export let activitiesMap: ActivitiesMap = {};
  export let activityTypes: ActivityType[] = [];
  export let argumentsMap: ArgumentsMap = {};
  export let children: string[] | null = null;
  export let duration: number | null;
  export let id: number;
  export let modelId: number | undefined;
  export let parent: string | null = null;
  export let startTime: string = '';
  export let type: string = '';

  let confirmDeleteActivityModal: ConfirmModal | null = null;
  let currentId: number = id;
  let startTimeField = field<string>(startTime, [required, timestamp]);

  $: activityType = activityTypes.find(({ name }) => name === type);
  $: formParameters = getFormParameters(activityType.parameters, argumentsMap);
  $: hasChildren = children ? children.length > 0 : false;
  $: isChild = parent !== null;
  $: parentId = isChild ? parent : 'None (Root Activity)';
  $: $startTimeField.value = startTime;

  $: if (id !== currentId) {
    // Keep track if the activity changes so we can update the fields appropriately.
    currentId = id;
    startTimeField = field<string>(startTime, [required, timestamp]);
  }

  function getArguments(formParameter: FormParameter): ArgumentsMap {
    const { name, value } = formParameter;
    const newArgument = { [name]: value };
    return { ...argumentsMap, ...newArgument };
  }

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;

    formParameters = updateFormParameter(formParameters, formParameter, {
      loading: true,
    });

    const { name, value } = formParameter;
    const { errors, success } = await reqValidateActivityArguments(
      type,
      modelId,
      { [name]: value },
    );

    if (success) {
      formParameters = updateFormParameter(formParameters, formParameter, {
        error: null,
        loading: false,
      });
      const newArguments = getArguments(formParameter);
      dispatch('updateArguments', { arguments: newArguments, id });
    } else {
      formParameters = updateFormParameter(formParameters, formParameter, {
        error: errors[0],
        loading: false,
      });
    }
  }

  function onDelete() {
    dispatch('delete', id);
  }

  function onUpdateStartTime() {
    if ($startTimeField.valid && startTime !== $startTimeField.value) {
      dispatch('updateStartTime', { id, startTime: $startTimeField.value });
    }
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <Chip>Selected Activity</Chip>
    <button
      class="st-button icon"
      disabled={isChild}
      on:click|stopPropagation={() => confirmDeleteActivityModal.modal.show()}
      use:tooltip={{ content: 'Delete Activity', placement: 'left' }}
    >
      <i class="bi bi-trash" />
    </button>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <fieldset>
      <label for="id">Activity ID</label>
      <Input>
        <input bind:value={id} class="st-input w-100" disabled name="id" />
        <i class="bi bi-lock-fill" slot="right" />
      </Input>
    </fieldset>

    <fieldset>
      <label for="activity-type">Activity Type</label>
      <Input>
        <input
          bind:value={type}
          class="st-input w-100"
          disabled
          name="activity-type"
        />
        <i class="bi bi-lock-fill" slot="right" />
      </Input>
    </fieldset>

    <fieldset>
      <label for="parent-id">Parent ID</label>
      <Input>
        <input
          bind:value={parentId}
          class="st-input w-100"
          disabled
          name="parent-id"
        />
        <i class="bi bi-lock-fill" slot="right" />
      </Input>
    </fieldset>

    {#if duration !== null}
      <fieldset>
        <label for="duration">Duration</label>
        <Input>
          <input
            bind:value={duration}
            class="st-input w-100"
            disabled
            name="duration"
          />
          <i class="bi bi-lock-fill" slot="right" />
        </Input>
      </fieldset>
    {/if}

    <Field field={startTimeField} on:valid={onUpdateStartTime}>
      <label for="start-time" slot="label">Start Time</label>
      <input
        autocomplete="off"
        class="st-input w-100"
        disabled={isChild}
        name="start-time"
      />
    </Field>

    <fieldset>
      <details open>
        <summary>Parameters</summary>
        <div class="mt-2">
          <Parameters
            disabled={isChild}
            {formParameters}
            on:change={onChangeFormParameters}
          />
        </div>
      </details>
    </fieldset>

    <fieldset>
      <details open={hasChildren}>
        <summary>Decomposition</summary>
        <div class="mt-2">
          {#if hasChildren}
            <Decomposition {activitiesMap} {children} {type} />
          {:else}
            <Card class="p-1">This activity has no children</Card>
          {/if}
        </div>
      </details>
    </fieldset>
  </svelte:fragment>
</Panel>

<ConfirmModal
  bind:this={confirmDeleteActivityModal}
  confirmText="Delete"
  message="Are you sure you want to delete this activity?"
  title="Delete Activity"
  on:confirm={onDelete}
/>

<style>
  details {
    cursor: pointer;
  }
</style>
