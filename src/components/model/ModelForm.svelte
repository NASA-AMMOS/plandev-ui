<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { resetModelStores } from '../../stores/model';
  import type { User, UserId } from '../../types/app';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getShortISOForDate } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import UserInput from '../ui/Tags/UserInput.svelte';

  export let initialModelDescription: string = '';
  export let initialModelName: string = '';
  export let initialModelOwner: UserId | undefined;
  export let initialModelVersion: string | undefined;
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

  let hasUpdateModelPermission: boolean = false;
  let hasDeleteModelPermission: boolean = false;
  let hasCreatePlanPermission: boolean = false;
  let name: string = '';
  let owner: UserId | null = null;
  let version: string = '';
  let description: string = '';

  $: description = initialModelDescription;
  $: name = initialModelName;
  $: owner = initialModelOwner ?? null;
  $: version = initialModelVersion ?? '';

  $: if (user) {
    hasUpdateModelPermission = featurePermissions.model.canUpdate(user);
    hasDeleteModelPermission = featurePermissions.model.canDelete(user);
    hasCreatePlanPermission = featurePermissions.plan.canCreate(user);
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

  onDestroy(() => {
    resetModelStores();
  });
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
</style>
