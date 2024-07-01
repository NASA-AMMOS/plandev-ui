<svelte:options immutable={true} />

<script lang="ts">
  import RefreshIcon from '@nasa-jpl/stellar/icons/refresh.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { User, UserId } from '../../types/app';
  import type { ModelLog, ModelSlim } from '../../types/model';
  import effects from '../../utilities/effects';
  import { getModelStatusRollup } from '../../utilities/model';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getShortISOForDate } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import UserInput from '../ui/Tags/UserInput.svelte';
  import ModelStatusRollup from './ModelStatusRollup.svelte';

  export let initialModelDescription: string = '';
  export let initialModelName: string = '';
  export let initialModelOwner: UserId | undefined;
  export let initialModelVersion: string | undefined;
  export let activityTypeLogs: ModelLog[] | undefined;
  export let modelParameterLogs: ModelLog[] | undefined;
  export let resourceTypeLogs: ModelLog[] | undefined;
  export let modelId: number | undefined;
  export let createdAt: string | undefined;
  export let user: User | null;
  export let users: UserId[] = [];

  const dispatch = createEventDispatcher<{
    createPlan: number;
    deleteModel: void;
    hasModelChanged: {
      description: string;
      name: string;
      owner: UserId;
      version: string;
    };
  }>();

  const updateModelPermissionError: string = 'You do not have permission to update this model';
  const deleteModelPermissionError: string = 'You do not have permission to delete this model';
  const createPlanPermissionError: string = 'You do not have permission to create a plan';
  const extractionPermissionError: string = 'You do not have permission to re-trigger a model extraction';

  let hasUpdateModelPermission: boolean = false;
  let hasDeleteModelPermission: boolean = false;
  let hasCreatePlanPermission: boolean = false;
  let hasExtractionPermission: boolean = false;
  let name: string = '';
  let owner: UserId | null = null;
  let version: string = '';
  let description: string = '';
  let modelLogs:
    | Pick<ModelSlim, 'refresh_activity_type_logs' | 'refresh_model_parameter_logs' | 'refresh_resource_type_logs'>
    | undefined = undefined;
  let modelHasExtractionError: boolean = false;

  $: description = initialModelDescription;
  $: name = initialModelName;
  $: owner = initialModelOwner ?? null;
  $: version = initialModelVersion ?? '';
  $: modelLogs = {
    refresh_activity_type_logs: activityTypeLogs ?? [],
    refresh_model_parameter_logs: modelParameterLogs ?? [],
    refresh_resource_type_logs: resourceTypeLogs ?? [],
  };
  $: {
    const { activityLogStatus, parameterLogStatus, resourceLogStatus } = getModelStatusRollup(modelLogs);

    if (activityLogStatus === 'error' || parameterLogStatus === 'error' || resourceLogStatus === 'error') {
      modelHasExtractionError = true;
    } else {
      modelHasExtractionError = false;
    }
  }

  $: if (user) {
    hasUpdateModelPermission = featurePermissions.model.canUpdate(user);
    hasDeleteModelPermission = featurePermissions.model.canDelete(user);
    hasCreatePlanPermission = featurePermissions.plan.canCreate(user);
    hasExtractionPermission = featurePermissions.model.canUpdate(user);
  }

  $: dispatch('hasModelChanged', {
    description,
    name,
    owner,
    version,
  });

  function onCreatePlanWithModel() {
    if (modelId !== undefined) {
      dispatch('createPlan', modelId);
    }
  }

  function onDeleteModel() {
    dispatch('deleteModel');
  }

  function onSetOwner(event: CustomEvent<UserId[]>) {
    owner = event.detail[0];
  }

  function onClearOwner() {
    owner = null;
  }

  function onRetriggerModelExtraction() {
    const prevLogs = modelLogs;

    modelLogs = {
      refresh_activity_type_logs: [{ error: null, error_message: null, pending: true, success: false }],
      refresh_model_parameter_logs: [{ error: null, error_message: null, pending: true, success: false }],
      refresh_resource_type_logs: [{ error: null, error_message: null, pending: true, success: false }],
    } as Pick<ModelSlim, 'refresh_activity_type_logs' | 'refresh_model_parameter_logs' | 'refresh_resource_type_logs'>;

    // introduce delay to allow users to see a transition in case retriggering is instantaneous
    setTimeout(async () => {
      if (modelId != null) {
        const extractionResponse = await effects.retriggerModelExtraction(modelId, user);
        if (extractionResponse == null) {
          modelLogs = prevLogs;
        }
      }
    }, 200);
  }
</script>

<div class="model-form-container">
  <div class="inputs">
    <Input layout="inline">
      <label for="name">Model name</label>
      <input
        class="st-input w-100"
        name="name"
        autocomplete="off"
        bind:value={name}
        use:permissionHandler={{
          hasPermission: hasUpdateModelPermission,
          permissionError: updateModelPermissionError,
        }}
      />
    </Input>
    <Input layout="inline">
      <label for="id">Model id</label>
      <input class="st-input w-100" disabled name="id" value={modelId ?? ''} />
    </Input>
    <Input layout="inline">
      <label for="description">Model description</label>
      <textarea
        class="st-input w-100"
        name="description"
        bind:value={description}
        use:permissionHandler={{
          hasPermission: hasUpdateModelPermission,
          permissionError: updateModelPermissionError,
        }}
      />
    </Input>
    <Input layout="inline">
      <label for="version">Model version</label>
      <input
        class="st-input w-100"
        name="version"
        placeholder="0.0.0"
        bind:value={version}
        use:permissionHandler={{
          hasPermission: hasUpdateModelPermission,
          permissionError: updateModelPermissionError,
        }}
      />
    </Input>
    <Input layout="inline">
      <label for="owner">Owner</label>
      <UserInput
        allowMultiple={false}
        {users}
        {user}
        selectedUsers={owner ? [owner] : []}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasUpdateModelPermission,
              permissionError: updateModelPermissionError,
            },
          ],
        ]}
        on:create={onSetOwner}
        on:delete={onClearOwner}
      />
    </Input>
    {#if createdAt}
      <Input layout="inline">
        <label use:tooltip={{ content: 'Date Created', placement: 'top' }} for="createdAt">Date Created</label>
        <input class="st-input w-100" disabled name="createdAt" value={getShortISOForDate(new Date(createdAt))} />
      </Input>
    {/if}
    {#if modelId}
      <Input layout="inline">
        <div class="model-jar-label">
          <label class="model-metadata-item-label" for="status">Jar file status</label>
          {#if modelHasExtractionError}
            <button
              class="icon-button"
              on:click={onRetriggerModelExtraction}
              use:permissionHandler={{
                hasPermission: hasExtractionPermission,
                permissionError: extractionPermissionError,
              }}
              use:tooltip={{
                content: 'Re-run extraction',
                disabled: !hasExtractionPermission,
              }}
            >
              <RefreshIcon />
            </button>
          {/if}
        </div>
        <ModelStatusRollup mode="rollup" model={modelLogs} />
      </Input>
      <div class="model-status-full">
        <ModelStatusRollup mode="full" model={modelLogs} />
      </div>
    {/if}
  </div>
  <div class="buttons">
    <button
      class="st-button secondary w-100"
      on:click={onCreatePlanWithModel}
      use:permissionHandler={{
        hasPermission: hasCreatePlanPermission,
        permissionError: createPlanPermissionError,
      }}
    >
      New plan with model
    </button>
    <button
      class="st-button danger w-100"
      on:click|stopPropagation={onDeleteModel}
      use:permissionHandler={{
        hasPermission: hasDeleteModelPermission,
        permissionError: deleteModelPermissionError,
      }}
    >
      Delete model
    </button>
  </div>
</div>

<style>
  .model-form-container .inputs {
    padding: 0 8px;
  }

  .model-form-container .buttons {
    display: grid;
    padding: 8px;
    row-gap: 8px;
  }

  .model-jar-label {
    display: grid;
    grid-template-columns: auto min-content;
  }

  .model-status-full {
    margin: 8px 0;
  }

  button.icon-button {
    align-items: center;
    background: none;
    border: none;
    color: var(--st-primary-70);
    cursor: pointer;
    display: flex;
  }

  button.icon-button:hover {
    color: var(--st-primary-100);
  }
</style>
