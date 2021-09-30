<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { session as appSession } from '$app/stores';
  import type {
    Activity,
    ActivityType,
    FormParameter,
    Parameter,
    StringTMap,
  } from '../../types';
  import Field from '../form/Field.svelte';
  import InputText from '../form/InputText.svelte';
  import Label from '../form/Label.svelte';
  import ConfirmModal from '../modals/Confirm.svelte';
  import Decomposition from './Decomposition.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Panel from '../ui/Panel.svelte';
  import { reqValidateParameters } from '../../utilities/requests';
  import Card from '../ui/Card.svelte';
  import FieldInputText from '../form/FieldInputText.svelte';
  import { required, timestamp } from '../../utilities/validators';

  const dispatch = createEventDispatcher();

  export let activitiesMap: StringTMap<Activity> = {};
  export let activityTypes: ActivityType[] = [];
  export let children: string[] | null = null;
  export let duration: number | null;
  export let id: string = '';
  export let modelId: string = '';
  export let parameters: Parameter[] = [];
  export let parent: string | null = null;
  export let startTimestamp: string = '';
  export let type: string = '';

  let confirmDeleteActivityModal: ConfirmModal | null = null;

  $: activityType = activityTypes.find(({ name }) => name === type);
  $: formParameters = getFormParameters(activityType, parameters);
  $: hasChildren = children ? children.length > 0 : false;
  $: isChild = parent !== null;
  $: parentId = isChild ? parent : 'None (Root Activity)';

  function getFormParameters(
    activityType: ActivityType,
    parameters: Parameter[],
  ): FormParameter[] {
    return activityType.parameters.map(activityTypeParameter => {
      let value = activityTypeParameter.default;

      const activityParameter = parameters.find(
        parameter => parameter.name === activityTypeParameter.name,
      );
      if (activityParameter) {
        const paramValue = activityParameter.value;
        if (paramValue !== null && paramValue !== undefined) {
          value = paramValue;
        }
      }

      const formParameter: FormParameter = {
        error: null,
        loading: false,
        name: activityTypeParameter.name,
        schema: activityTypeParameter.schema,
        validate: true,
        value,
      };

      return formParameter;
    });
  }

  function getParameters(formParameter: FormParameter): Parameter[] {
    const newParameters = [...parameters];
    const newParameter = {
      name: formParameter.name,
      value: formParameter.value,
    };
    const index = newParameters.findIndex(
      ({ name }) => name === formParameter.name,
    );

    if (index > -1) {
      newParameters[index] = newParameter;
      return newParameters;
    } else {
      return [...newParameters, newParameter];
    }
  }

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;

    updateFormParemter({ ...formParameter, loading: true });
    const { ssoToken: authorization } = $appSession.user;
    const { name, value } = formParameter;
    const { errors, success } = await reqValidateParameters(
      type,
      modelId,
      [{ name, value }],
      authorization,
    );

    if (success) {
      updateFormParemter({ ...formParameter, error: null, loading: false });
      const parameters = getParameters(formParameter);
      dispatch('updateParameter', { id, parameters });
    } else {
      updateFormParemter({
        ...formParameter,
        error: errors[0],
        loading: false,
      });
    }
  }

  function onDelete() {
    confirmDeleteActivityModal.modal.hide();
    dispatch('delete', { id });
  }

  function updateFormParemter(newParameter: FormParameter) {
    formParameters = formParameters.map(parameter => {
      if (newParameter.name === parameter.name) {
        return newParameter;
      }
      return parameter;
    });
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
      bind:value={startTimestamp}
      disabled={isChild}
      name="start-timestamp"
      validators={[required, timestamp]}
      on:change={() => dispatch('updateStartTimestamp', { id, startTimestamp })}
    >
      Start Timestamp
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
