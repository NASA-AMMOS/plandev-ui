<svelte:options immutable={true} />

<script lang="ts">
  import CheckmarkIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { ViewDefinition } from '../../types/view';
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number | string = 450;
  export let width: number | string = 550;

  const dispatch = createEventDispatcher();

  let fileInput: HTMLInputElement;
  let errors: string[] = [];
  let files: FileList;
  let valid: boolean = false;
  let viewDefinition: ViewDefinition | null;
  let viewName: string;

  $: valid = !errors.length && !!viewDefinition && !!viewName;

  async function onChange() {
    const { errors: validationErrors, definition: validViewDefinition } = await effects.loadViewFromFile(files);

    errors = validationErrors ?? [];
    viewDefinition = validViewDefinition;
  }

  function onClick() {
    fileInput.value = '';
    errors = [];
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter' && valid) {
      event.preventDefault();
      upload();
    }
  }

  function upload() {
    if (!errors.length) {
      dispatch('upload', { definition: viewDefinition, name: viewName });
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>Upload View JSON</ModalHeader>
  <ModalContent style="overflow: auto; padding: 0">
    <fieldset>
      <label for="name">View Name</label>
      <input bind:value={viewName} autocomplete="off" class="st-input w-100" name="name" required />
    </fieldset>
    <fieldset>
      <label for="file">View JSON File</label>
      <input
        bind:this={fileInput}
        class="w-100 upload"
        class:error={!!errors.length}
        name="file"
        required
        type="file"
        bind:files
        on:click={onClick}
        on:change={onChange}
        use:tooltip={{ content: errors.length ? 'Invalid view' : '', placement: 'bottom' }}
      />
      {#if errors.length}
        <Collapse
          title={`Validation Errors (${errors.length})`}
          defaultExpanded={false}
          className="upload-view-modal-collapse"
          padContent={false}
        >
          {#each errors as error}
            <div>
              <pre>
                {error}
              </pre>
            </div>
          {/each}
        </Collapse>
      {/if}
      {#if fileInput?.value && !errors.length}
        <div class="st-typography-label valid-json">
          <CheckmarkIcon />
          View JSON valid
        </div>
      {/if}
    </fieldset>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={!valid} on:click={upload}> Upload View </button>
  </ModalFooter>
</Modal>

<style>
  .upload {
    margin-bottom: 8px;
  }

  .error {
    background-color: var(--st-input-error-background-color);
    border: 1px solid var(--st-red);
  }

  :global(.upload-view-modal-collapse .collapse-header .title),
  :global(.upload-view-modal-collapse .collapse-icon svg) {
    color: var(--st-red);
  }

  :global(.upload-view-modal-collapse) {
    padding-bottom: 16px;
  }

  pre {
    background: var(--st-gray-10);
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
    height: unset;
    margin: 2px 16px;
    padding: 8px;
    white-space: unset;
    word-break: break-word;
    word-wrap: normal;
  }

  .valid-json {
    color: #0eaf0a;
    display: flex;
    gap: 2px;
  }
</style>
