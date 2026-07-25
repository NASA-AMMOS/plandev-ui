<svelte:options immutable={true} />

<script lang="ts">
  import RefreshIcon from '@nasa-jpl/stellar/icons/refresh.svg?component';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { User } from '../../types/app';
  import type { DiscoveredExternalModel, ExternalBackendCatalog } from '../../types/model';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions, queryPermissions } from '../../utilities/permissions';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import Loading from '../Loading.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let user: User | null;
  export let width: number = 720;
  export let height: number = 620;

  type RegistrationResult = { error: string | null; success: boolean };

  const dispatch = createEventDispatcher<{
    close: void;
  }>();
  const registerPermissionError = 'You do not have permission to register a model';

  let catalog: ExternalBackendCatalog[] = [];
  let hasCreatePermission: boolean = false;
  let hasReadPermission: boolean = false;
  let loading: boolean = true;
  let registering: boolean = false;
  let results: Record<string, RegistrationResult> = {};
  let selected: Record<string, boolean> = {};

  $: hasCreatePermission = featurePermissions.model.canCreate(user);
  $: hasReadPermission = queryPermissions.GET_EXTERNAL_MODEL_CATALOG(user);
  $: selectedCount = Object.values(selected).filter(Boolean).length;

  onMount(loadCatalog);

  function modelKey(backend: string, key: string): string {
    // Composite selection key uniquely identifying a discovered model within a backend.
    return `${backend}::${key}`;
  }

  async function loadCatalog() {
    loading = true;
    results = {};
    selected = {};
    catalog = await effects.getExternalModelCatalog(user);
    loading = false;
  }

  function toggle(backend: string, key: string) {
    const id = modelKey(backend, key);
    selected = { ...selected, [id]: !selected[id] };
  }

  async function onRegister() {
    if (registering) {
      return;
    }
    registering = true;

    const selectedEntries: { backend: string; model: DiscoveredExternalModel }[] = [];
    for (const backendCatalog of catalog) {
      for (const model of backendCatalog.models) {
        if (selected[modelKey(backendCatalog.backend, model.key)]) {
          selectedEntries.push({ backend: backendCatalog.backend, model });
        }
      }
    }

    const nextResults: Record<string, RegistrationResult> = { ...results };
    const nextSelected: Record<string, boolean> = { ...selected };
    for (const { backend, model } of selectedEntries) {
      const id = modelKey(backend, model.key);
      const { error } = await effects.registerExternalModel(backend, model, user);
      nextResults[id] = { error, success: error === null };
      // Clear the checkbox for models that registered successfully.
      if (error === null) {
        nextSelected[id] = false;
      }
    }
    results = nextResults;
    selected = nextSelected;
    registering = false;
  }
</script>

<Modal {height} {width} on:close closeOnEscape={!registering} closeOnOutsideClick={false}>
  <ModalHeader on:close>External Model Backends</ModalHeader>
  <ModalContent style="padding:0">
    <div class="register-external-models">
      <div class="register-external-models-toolbar">
        <span class="st-typography-body">
          Register mission models hosted by operator-configured external backends. Registered models are introspected
          asynchronously and appear in the model list once processed.
        </span>
        <button
          class="st-button icon"
          disabled={loading || registering}
          on:click={loadCatalog}
          use:tooltip={{ content: 'Refresh catalog', placement: 'top' }}
        >
          <RefreshIcon />
        </button>
      </div>

      <div class="register-external-models-body">
        {#if loading}
          <Loading>Loading external model catalog...</Loading>
        {:else if !hasReadPermission}
          <div class="register-external-models-empty st-typography-body">
            You do not have permission to view the external model catalog.
          </div>
        {:else if catalog.length === 0}
          <div class="register-external-models-empty st-typography-body">No external backends are configured.</div>
        {:else}
          {#each catalog as backendCatalog (backendCatalog.backend)}
            <div class="backend-section">
              <Collapse
                title={backendCatalog.backend}
                tooltipContent={backendCatalog.backend}
                error={!backendCatalog.reachable}
                defaultExpanded={backendCatalog.reachable}
              >
                <svelte:fragment slot="right">
                  <span
                    class="reachability-badge"
                    class:reachable={backendCatalog.reachable}
                    class:unreachable={!backendCatalog.reachable}
                  >
                    {backendCatalog.reachable ? 'Reachable' : 'Unreachable'}
                  </span>
                </svelte:fragment>

                {#if !backendCatalog.reachable}
                  <div class="backend-error st-typography-body">
                    {backendCatalog.error ?? 'Backend is unreachable.'}
                  </div>
                {:else if backendCatalog.models.length === 0}
                  <div class="backend-empty st-typography-body">No models hosted on this backend.</div>
                {:else}
                  <ul class="model-list">
                    {#each backendCatalog.models as model (model.key)}
                      {@const id = modelKey(backendCatalog.backend, model.key)}
                      {@const result = results[id]}
                      <li class="model-list-item">
                        <label class="model-checkbox">
                          <input
                            type="checkbox"
                            checked={!!selected[id]}
                            disabled={registering}
                            on:change={() => toggle(backendCatalog.backend, model.key)}
                            use:permissionHandler={{
                              hasPermission: hasCreatePermission,
                              permissionError: registerPermissionError,
                            }}
                          />
                          <span class="model-info">
                            <span class="model-name st-typography-medium">{model.name}</span>
                            <span class="model-version st-typography-body">v{model.version}</span>
                            <span class="model-hash" use:tooltip={{ content: model.identityHash, placement: 'top' }}>
                              {model.identityHash}
                            </span>
                          </span>
                        </label>
                        {#if result}
                          {#if result.success}
                            <span class="model-result success">Registered</span>
                          {:else}
                            <span class="model-result failure" use:tooltip={{ content: result.error ?? '' }}>
                              Failed
                            </span>
                          {/if}
                        {/if}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </Collapse>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Close </button>
    <button
      class="st-button"
      disabled={selectedCount === 0 || registering}
      on:click={onRegister}
      use:permissionHandler={{
        hasPermission: hasCreatePermission,
        permissionError: registerPermissionError,
      }}
    >
      {registering ? 'Registering...' : `Register selected (${selectedCount})`}
    </button>
  </ModalFooter>
</Modal>

<style>
  .register-external-models {
    display: grid;
    grid-template-rows: min-content auto;
    height: 100%;
  }

  .register-external-models-toolbar {
    align-items: center;
    column-gap: 0.5rem;
    display: grid;
    grid-template-columns: auto min-content;
    padding: 0.75rem 1rem;
  }

  .register-external-models-body {
    height: 100%;
    overflow: auto;
    padding: 0 1rem 0.5rem;
  }

  .register-external-models-empty {
    color: var(--st-gray-60);
    padding: 1rem 0;
  }

  .backend-section {
    margin-bottom: 0.5rem;
  }

  .reachability-badge {
    border-radius: 4px;
    font-size: 11px;
    margin-right: 0.5rem;
    padding: 2px 8px;
  }

  .reachability-badge.reachable {
    background-color: var(--st-success-green, #0eaf68);
    color: var(--st-white, #fff);
  }

  .reachability-badge.unreachable {
    background-color: var(--st-red, #db5139);
    color: var(--st-white, #fff);
  }

  .backend-error {
    color: var(--st-red, #db5139);
    padding: 0.25rem 0;
  }

  .backend-empty {
    color: var(--st-gray-60);
    padding: 0.25rem 0;
  }

  .model-list {
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
    row-gap: 0.25rem;
  }

  .model-list-item {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .model-checkbox {
    align-items: center;
    column-gap: 0.5rem;
    cursor: pointer;
    display: flex;
  }

  .model-info {
    align-items: baseline;
    column-gap: 0.5rem;
    display: flex;
    min-width: 0;
  }

  .model-version {
    color: var(--st-gray-60);
  }

  .model-hash {
    color: var(--st-gray-50);
    font-family: var(--st-font-mono, monospace);
    font-size: 11px;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .model-result {
    font-size: 11px;
    padding-left: 0.5rem;
    white-space: nowrap;
  }

  .model-result.success {
    color: var(--st-success-green, #0eaf68);
  }

  .model-result.failure {
    color: var(--st-red, #db5139);
    cursor: help;
  }
</style>
