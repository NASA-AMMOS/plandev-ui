<svelte:options immutable={true} />

<script lang="ts">
  import ActivityDecomposition from './ActivityDecomposition.svelte';
  import Field from '../form/Field.svelte';
  import Input from '../form/Input.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import type Modal from '../modals/Modal.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Chip from '../ui/Chip.svelte';
  import Panel from '../ui/Panel.svelte';
  import {
    deleteActivity,
    selectedActivity,
    updateActivity,
  } from '../../stores/activities';
  import { field } from '../../stores/form';
  import { plan } from '../../stores/plan';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import req from '../../utilities/requests';
  import { tooltip } from '../../utilities/tooltip';
  import { required, timestamp } from '../../utilities/validators';

  let activityType: ActivityType;
  let confirmDeleteActivityModal: Modal;
  let formParameters: FormParameter[] = [];
  let hasChildren: boolean;
  let isChild: boolean;
  let parameterError: string | null = null;
  let parentId: string | null = null;
  let startTimeField: FieldStore<string>;

  $: if ($selectedActivity) {
    activityType = $plan.model.activityTypes.find(
      ({ name }) => name === $selectedActivity?.type,
    );
    hasChildren = $selectedActivity.children
      ? $selectedActivity.children.length > 0
      : false;
    isChild = $selectedActivity.parent !== null;
    parentId = isChild ? $selectedActivity.parent : 'None (Root Activity)';
    startTimeField = field<string>($selectedActivity.startTime, [
      required,
      timestamp,
    ]);

    req
      .getEffectiveActivityArguments(
        $plan.model.id,
        activityType.name,
        $selectedActivity.arguments,
      )
      .then(({ arguments: defaultArgumentsMap }) => {
        formParameters = getFormParameters(
          activityType.parameters,
          $selectedActivity.arguments,
          defaultArgumentsMap,
        );
      });

    validateArguments($selectedActivity?.arguments);
  }

  async function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    if ($selectedActivity) {
      const { detail: formParameter } = event;
      const newArguments = getArguments(
        $selectedActivity.arguments,
        formParameter,
      );
      updateActivity(
        { arguments: newArguments, id: $selectedActivity.id },
        $plan.startTime,
      );
    }
  }

  function onDelete() {
    if ($selectedActivity) {
      deleteActivity($selectedActivity.id);
    }
  }

  function onUpdateStartTime() {
    if (
      $selectedActivity &&
      $startTimeField.valid &&
      $selectedActivity.startTime !== $startTimeField.value
    ) {
      updateActivity(
        { id: $selectedActivity.id, startTime: $startTimeField.value },
        $plan.startTime,
      );
    }
  }

  async function validateArguments(newArguments: ArgumentsMap) {
    if ($selectedActivity) {
      const { errors, success } = await req.validateActivityArguments(
        $selectedActivity.type,
        $plan.model.id,
        newArguments,
      );

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

{#if $selectedActivity}
  <Panel padBody={false}>
    <svelte:fragment slot="header">
      <Chip>Selected Activity</Chip>
      <button
        class="st-button icon"
        disabled={isChild}
        on:click|stopPropagation={() => confirmDeleteActivityModal.show()}
        use:tooltip={{ content: 'Delete Activity', placement: 'left' }}
      >
        <i class="bi bi-trash" />
      </button>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <fieldset>
        <label for="id">Activity ID</label>
        <Input>
          <input
            bind:value={$selectedActivity.id}
            class="st-input w-100"
            disabled
            name="id"
          />
          <i class="bi bi-lock-fill" slot="right" />
        </Input>
      </fieldset>

      <fieldset>
        <label for="activity-type">Activity Type</label>
        <Input>
          <input
            bind:value={$selectedActivity.type}
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

      <fieldset>
        <label for="duration">Duration</label>
        <Input>
          <input
            bind:value={$selectedActivity.duration}
            class="st-input w-100"
            disabled
            name="duration"
          />
          <i class="bi bi-lock-fill" slot="right" />
        </Input>
      </fieldset>

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
          <summary>
            <span class:error={parameterError !== null}>
              Parameters
              {#if parameterError !== null}
                ({parameterError})
              {/if}
            </span>
          </summary>
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
              <ActivityDecomposition
                children={$selectedActivity.children}
                type={$selectedActivity.type}
              />
            {:else}
              <div class="p-1">This activity has no children</div>
            {/if}
          </div>
        </details>
      </fieldset>
    </svelte:fragment>
  </Panel>

  <ConfirmModal
    bind:modal={confirmDeleteActivityModal}
    confirmText="Delete"
    message="Are you sure you want to delete this activity?"
    title="Delete Activity"
    on:confirm={onDelete}
  />
{:else}
  <div class="p-1">No Activity Selected</div>
{/if}

<style>
  details {
    cursor: pointer;
  }
</style>
