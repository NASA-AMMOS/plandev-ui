<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { session as appSession } from '$app/stores';
  import type {
    Activity,
    ActivityType,
    ArgumentsMap,
    FormParameter,
    StringTMap,
  } from '../../types';
  import Field from '../form/Field.svelte';
  import InputText from '../form/InputText.svelte';
  import Label from '../form/Label.svelte';
  import ConfirmModal from '../modals/Confirm.svelte';
  import Decomposition from './Decomposition.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Panel from '../ui/Panel.svelte';
  import { reqValidateActivityArguments } from '../../utilities/requests';
  import Card from '../ui/Card.svelte';
  import FieldInputText from '../form/FieldInputText.svelte';
  import { required, timestamp } from '../../utilities/validators';
  import {
    getFormParameters,
    updateFormParameter,
  } from '../../utilities/parameters';

  const dispatch = createEventDispatcher();

  export let activitiesMap: StringTMap<Activity> = {};
  export let activityTypes: ActivityType[] = [];
  export let argumentsMap: ArgumentsMap = {};
  export let children: string[] | null = null;
  export let duration: number | null;
  export let id: number | undefined;
  export let modelId: number | undefined;
  export let parent: string | null = null;
  export let startTime: string = '';
  export let type: string = '';

  let confirmDeleteActivityModal: ConfirmModal | null = null;

  $: activityType = activityTypes.find(({ name }) => name === type);
  $: formParameters = getFormParameters(activityType.parameters, argumentsMap);
  $: hasChildren = children ? children.length > 0 : false;
  $: isChild = parent !== null;
  $: parentId = isChild ? parent : 'None (Root Activity)';

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

    const { ssoToken: authorization } = $appSession.user;
    const { name, value } = formParameter;
    const { errors, success } = await reqValidateActivityArguments(
      type,
      modelId,
      { [name]: value },
      authorization,
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
</script>

<Panel hideHeader>
  <span slot="body">
    <Field>
      <Label for="id">Activity ID</Label>
      <InputText bind:value={id} disabled name="id">
        <span slot="suffix">
          <i class="bi bi-lock-fill" />
        </span>
      </InputText>
    </Field>

    <Field>
      <Label for="activity-type">Activity Type</Label>
      <InputText bind:value={type} disabled name="activity-type">
        <span slot="suffix">
          <i class="bi bi-lock-fill" />
        </span>
      </InputText>
    </Field>

    <Field>
      <Label for="parent-id">Parent ID</Label>
      <InputText bind:value={parentId} disabled name="parent-id">
        <span slot="suffix">
          <i class="bi bi-lock-fill" />
        </span>
      </InputText>
    </Field>

    {#if duration !== null}
      <Field>
        <Label for="duration">Duration</Label>
        <InputText bind:value={duration} disabled name="duration">
          <span slot="suffix">
            <i class="bi bi-lock-fill" />
          </span>
        </InputText>
      </Field>
    {/if}

    <FieldInputText
      bind:value={startTime}
      disabled={isChild}
      name="start-time"
      validators={[required, timestamp]}
      on:change={() => dispatch('updateStartTime', { id, startTime })}
    >
      Start Time
    </FieldInputText>

    <Field>
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
    </Field>

    <Field>
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
    </Field>
  </span>

  <span slot="footer">
    <button
      class="button secondary"
      disabled={isChild}
      on:click|stopPropagation={() => confirmDeleteActivityModal.modal.show()}
    >
      Delete
    </button>
  </span>
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
