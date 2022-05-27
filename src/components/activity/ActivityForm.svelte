<svelte:options immutable={true} />

<script lang="ts">
  import ActivityDecomposition from './ActivityDecomposition.svelte';
  import Field from '../form/Field.svelte';
  import Input from '../form/Input.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import type Modal from '../modals/Modal.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Panel from '../ui/Panel.svelte';
  import { activityActions, selectedActivity } from '../../stores/activities';
  import { field } from '../../stores/form';
  import { activityTypesMap, plan } from '../../stores/plan';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import req from '../../utilities/requests';
  import { tooltip } from '../../utilities/tooltip';
  import { required, timestamp } from '../../utilities/validators';

  export let gridId: number;

  // Activity vars.
  let argumentsMap: ArgumentsMap | null = null;
  let children: number[] | null = null;
  let duration: number | null = null;
  let id: number | null = null;
  let parent: number | null = null;
  let startTime: string | null = null;
  let type: string | null = null;

  // Other vars.
  let model: Model;
  let confirmDeleteActivityModal: Modal;
  let formParameters: FormParameter[] = [];
  let hasChildren: boolean;
  let isChild: boolean;
  let parameterError: string | null = null;
  let parentId: number | string | null = null;
  let startTimeField: FieldStore<string>;

  $: if ($selectedActivity) {
    argumentsMap = $selectedActivity.arguments;
    children = $selectedActivity.children;
    duration = $selectedActivity.duration;
    id = $selectedActivity.id;
    parent = $selectedActivity.parent;
    startTime = $selectedActivity.startTime;
    type = $selectedActivity.type;
  } else {
    argumentsMap = null;
    children = null;
    duration = null;
    id = null;
    parent = null;
    startTime = null;
    type = null;
  }

  $: model = $plan.model;
  $: activityType = $activityTypesMap[type] || null;
  $: hasChildren = children ? children.length > 0 : false;
  $: isChild = parent !== null;
  $: parentId = isChild ? parent : 'None (Root Activity)';
  $: startTimeField = field<string>(startTime, [required, timestamp]);

  $: if (activityType && argumentsMap) {
    req
      .getEffectiveActivityArguments(model.id, activityType.name, argumentsMap)
      .then(({ arguments: defaultArgumentsMap }) => {
        formParameters = getFormParameters(activityType.parameters, argumentsMap, defaultArgumentsMap);
      });
  }
  $: validateArguments(argumentsMap);

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    const newArguments = getArguments(argumentsMap, formParameter);
    activityActions.updateActivity(id, { arguments: newArguments });
  }

  function onUpdateStartTime() {
    if ($startTimeField.valid && startTime !== $startTimeField.value) {
      activityActions.updateActivity(id, { startTime: $startTimeField.value });
    }
  }

  async function validateArguments(newArguments: ArgumentsMap | null): Promise<void> {
    if (newArguments) {
      const { errors, success } = await req.validateActivityArguments(type, model.id, newArguments);

      // TODO: Update to account for errors returned for individual arguments.
      if (!success) {
        console.log(errors);
        parameterError = 'one or more invalid - see console';
      } else {
        parameterError = null;
      }
    }
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Selected Activity" />
    <button
      class="st-button icon"
      disabled={isChild || !$selectedActivity}
      on:click|stopPropagation={() => confirmDeleteActivityModal.show()}
      use:tooltip={{ content: 'Delete Activity', placement: 'left' }}
    >
      <i class="bi bi-trash" />
    </button>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $selectedActivity}
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
          <input bind:value={type} class="st-input w-100" disabled name="activity-type" />
          <i class="bi bi-lock-fill" slot="right" />
        </Input>
      </fieldset>

      <fieldset>
        <label for="parent-id">Parent ID</label>
        <Input>
          <input bind:value={parentId} class="st-input w-100" disabled name="parent-id" />
          <i class="bi bi-lock-fill" slot="right" />
        </Input>
      </fieldset>

      <fieldset>
        <label for="duration">Duration</label>
        <Input>
          <input bind:value={duration} class="st-input w-100" disabled name="duration" />
          <i class="bi bi-lock-fill" slot="right" />
        </Input>
      </fieldset>

      <Field field={startTimeField} on:valid={onUpdateStartTime}>
        <label for="start-time" slot="label">Start Time</label>
        <input autocomplete="off" class="st-input w-100" disabled={isChild} name="start-time" />
      </Field>

      <fieldset>
        <details open style:cursor="pointer">
          <summary>
            <span class:error={parameterError !== null}>
              Parameters
              {#if parameterError !== null}
                ({parameterError})
              {/if}
            </span>
          </summary>
          <div class="mt-2">
            <Parameters disabled={isChild} {formParameters} on:change={onChangeFormParameters} />
          </div>
        </details>
      </fieldset>

      <fieldset>
        <details open={hasChildren} style:cursor="pointer">
          <summary>Decomposition</summary>
          <div class="mt-2">
            {#if hasChildren}
              <ActivityDecomposition {children} {type} />
            {:else}
              <div class="p-1">This activity has no children</div>
            {/if}
          </div>
        </details>
      </fieldset>
    {:else}
      <div class="p-2">No Activity Selected</div>
    {/if}
  </svelte:fragment>
</Panel>

<ConfirmModal
  bind:modal={confirmDeleteActivityModal}
  confirmText="Delete"
  message="Are you sure you want to delete this activity?"
  title="Delete Activity"
  on:confirm={() => activityActions.deleteActivity(id)}
/>
