<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import UploadIcon from '@nasa-jpl/stellar/icons/upload.svg?component';
  import { CirclePlus } from 'lucide-svelte';
  import { directiveBuilderIsVisible } from '../stores/directiveBuilder';
  import { plan, planModelActivityTypes, subsystemTags } from '../stores/plan';
  import type { ActivityType } from '../types/activity';
  import type { User } from '../types/app';
  import type { TimelineItemType } from '../types/timeline';
  import effects from '../utilities/effects';
  import { permissionHandler } from '../utilities/permissionHandler';
  import { featurePermissions } from '../utilities/permissions';
  import { tooltip } from '../utilities/tooltip';
  import TimelineItemList from './TimelineItemList.svelte';
  import Input from './form/Input.svelte';

  export let user: User | null;

  const uploadPermissionError: string = 'You do not have permission to upload activities.';

  let hasUploadPermission: boolean = false;
  let isUploadVisible: boolean = false;
  let uploadFiles: FileList | undefined;
  let uploadFileInput: HTMLInputElement;

  $: if (user !== null && $plan !== null) {
    hasUploadPermission = featurePermissions.activityDirective.canCreate(user, $plan);
  }

  function getFilterValueFromItem(item: TimelineItemType) {
    return (item as ActivityType).subsystem_tag?.id ?? -1;
  }

  function onShowUpload() {
    isUploadVisible = true;
  }

  function onHideUpload() {
    isUploadVisible = false;
  }

  async function onUpload() {
    if (uploadFiles !== undefined) {
      if ($plan && uploadFiles?.length) {
        await effects.uploadActivities($plan, uploadFiles, user);
      }
      uploadFileInput.value = '';
      uploadFiles = undefined;
      onHideUpload();
    }
  }
</script>

<TimelineItemList
  items={$planModelActivityTypes}
  chartType="activity"
  typeName="activity"
  typeNamePlural="Activities"
  {getFilterValueFromItem}
  filterOptions={$subsystemTags.map(s => ({ color: s.color || '', label: s.name, value: s.id }))}
  filterName="Subsystem"
>
  <div slot="header" class="upload-container" hidden={!isUploadVisible}>
    <button class="close-upload" type="button" on:click={onHideUpload}>
      <CloseIcon />
    </button>
    <Input layout="stacked">
      <label class="st-typography-body" for="file">Activity File</label>
      <input
        class="w-full text-xs"
        name="file"
        type="file"
        accept="application/json,.csv,.txt"
        bind:files={uploadFiles}
        bind:this={uploadFileInput}
        use:permissionHandler={{
          hasPermission: hasUploadPermission,
          permissionError: uploadPermissionError,
        }}
      />
    </Input>
    <div class="upload-button-container">
      <button
        class="st-button secondary"
        disabled={!uploadFiles?.length}
        on:click={onUpload}
        use:permissionHandler={{
          hasPermission: hasUploadPermission,
          permissionError: uploadPermissionError,
        }}
      >
        Upload
      </button>
    </div>
  </div>
  <svelte:fragment slot="button">
    <button
      class="st-button secondary"
      on:click={onShowUpload}
      use:permissionHandler={{
        hasPermission: hasUploadPermission,
        permissionError: uploadPermissionError,
      }}
      use:tooltip={{ content: 'Upload Activities' }}
    >
      <UploadIcon />
    </button>
    <div
      use:permissionHandler={{
        hasPermission: hasUploadPermission,
        permissionError: uploadPermissionError
      }}
    >
      <Button
        variant="outline"
        aria-label="Add Activity"
        disabled={!hasUploadPermission}
        on:click={() => $directiveBuilderIsVisible = true}
      >
        <CirclePlus size={16} />
      </Button>
      </div>
  </svelte:fragment>
</TimelineItemList>

<style>
  .upload-container {
    background: var(--st-gray-15);
    border-radius: 5px;
    margin: 5px;
    padding: 8px 11px 8px;
    position: relative;
  }

  .upload-container[hidden] {
    display: none;
  }

  .upload-container {
    display: grid;
    row-gap: 8px;
  }

  .upload-container :global(.upload-button-container) {
    display: flex;
    flex-flow: row-reverse;
  }

  .upload-container :global(.close-upload) {
    background: none;
    border: 0;
    cursor: pointer;
    height: 1.3rem;
    padding: 0;
    position: absolute;
    right: 3px;
    top: 3px;
  }
</style>
