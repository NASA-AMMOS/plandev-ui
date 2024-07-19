<svelte:options immutable={true} />

<script lang="ts">
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import RefreshIcon from '@nasa-jpl/stellar/icons/refresh.svg?component';
  import TagsIcon from '@nasa-jpl/stellar/icons/tag.svg?component';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { onMount } from 'svelte';
  import Nav from '../../components/app/Nav.svelte';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import ColorPresetsPicker from '../../components/form/ColorPresetsPicker.svelte';
  import Field from '../../components/form/Field.svelte';
  import Input from '../../components/form/Input.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import DataGridActions from '../../components/ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../../components/ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import SectionTitle from '../../components/ui/SectionTitle.svelte';
  import TagChip from '../../components/ui/Tags/Tag.svelte';
  import { field } from '../../stores/form';
  import { createTagError, tags as tagsStore } from '../../stores/tags';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, RowId } from '../../types/data-grid';
  import type { Tag } from '../../types/tags';
  import { generateRandomPastelColor } from '../../utilities/color';
  import effects from '../../utilities/effects';
  import { showConfirmModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getShortISOForDate } from '../../utilities/time';
  import { hex, required } from '../../utilities/validators';
  import type { PageData } from './$types';

  export let data: PageData;

  type CellRendererParams = {
    deleteTag: (tag: Tag) => void;
  };
  type TagsCellRendererParams = ICellRendererParams<Tag> & CellRendererParams;

  const baseColumnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 60,
    },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: TagsCellRendererParams) => {
        if (params && params.data && params.data.name) {
          const tagDiv = document.createElement('div');
          tagDiv.className = 'tags-cell';
          new TagChip({
            props: {
              removable: false,
              tag: params.data,
            },
            target: tagDiv,
          });
          return tagDiv;
        }
      },
      field: 'name',
      headerName: 'Name',
      resizable: true,
      sort: 'asc',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueGetter: (params: ValueGetterParams<Tag>) => {
        // Use valueGetter to ensure that the cell re-renders on both name and color updates
        return `${params.data?.name}_${params.data?.color}`;
      },
      width: 300,
      wrapText: true,
    },
    { field: 'owner', filter: 'text', headerName: 'Owner', minWidth: 80, resizable: true, sortable: true },
    {
      field: 'created_at',
      filter: 'text',
      headerName: 'Date Created',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<Tag>) => {
        if (params.data?.created_at) {
          return getShortISOForDate(new Date(params.data?.created_at));
        }
      },
    },
  ];
  const permissionError: string = 'You do not have permission to create a tag';

  let canCreate: boolean = false;
  let columnDefs: DataGridColumnDef[] = baseColumnDefs;
  let dataGrid: SingleActionDataGrid<Tag> | undefined = undefined;
  let filterText: string = '';
  let tags: Tag[];
  let nameInputField: HTMLInputElement;
  let colorInputField: HTMLInputElement;
  let user: User | null = null;
  let selectedTag: Tag | null = null;
  let selectedTagModified: boolean = false;
  let creatingTag: boolean = false;
  let updatingTag: boolean = false;
  let defaultColor = generateRandomPastelColor();

  $: tags = $tagsStore || data.initialTags; // TODO no way to tell if tags store is still loading since an [] is a valid value so can't make use of initialTags.
  $: nameField = field<string>('', [required]);
  $: colorField = field<string>('', [required, hex]);
  $: {
    user = data.user;
    canCreate = user ? featurePermissions.tags.canCreate(user) : false;
    columnDefs = [
      ...baseColumnDefs,
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: TagsCellRendererParams) => {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions-cell';
          new DataGridActions({
            props: {
              deleteCallback: params.deleteTag,
              deleteTooltip: {
                content: 'Delete Tag',
                placement: 'top',
              },
              hasDeletePermission: params.data && user ? featurePermissions.tags.canDelete(user, params.data) : false,
              rowData: params.data,
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          deleteTag,
        } as CellRendererParams,
        field: 'actions',
        headerName: '',
        resizable: false,
        sortable: false,
        suppressAutoSize: true,
        suppressSizeToFit: true,
        width: 25,
      },
    ];
  }
  $: submitButtonEnabled = $nameField.dirtyAndValid && $colorField.valid;
  $: selectedTagModified = selectedTag
    ? diffTags(selectedTag, {
        color: $colorField.value,
        name: $nameField.value,
      })
    : false;
  $: filteredTags = tags.filter(tag => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${tag.id}`.includes(filterTextLowerCase);
    const includesName = tag.name.toLocaleLowerCase().includes(filterTextLowerCase);
    const includesOwner = (tag.owner ?? '').toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName || includesOwner;
  });

  onMount(() => {
    colorField.validateAndSet(defaultColor);
    if (nameInputField) {
      nameInputField.focus();
    }
  });

  function diffTags(tagA: Partial<Tag>, tagB: Partial<Tag>) {
    return tagA.name !== tagB.name || tagA.color !== tagB.color;
  }

  async function resetTagFields() {
    nameField.reset('');
    await colorField.validateAndSet(generateRandomPastelColor());
  }

  async function createTag() {
    creatingTag = true;
    const tag = {
      color: $colorField.value,
      name: $nameField.value,
    };
    const newTag = await effects.createTag(tag, user);
    resetTagFields();
    if (newTag) {
      tags = tags.concat(newTag);
    }
    creatingTag = false;
  }

  async function updateTag() {
    if (!selectedTag) {
      return;
    }
    updatingTag = true;
    const tag = {
      color: $colorField.value,
      name: $nameField.value,
      owner: selectedTag.owner,
    };
    const updatedTag = await effects.updateTag(selectedTag.id, tag, user);
    if (updatedTag) {
      tags = tags.map(t => {
        if (t.id === updatedTag.id) {
          return updatedTag;
        }
        return t;
      });
      exitEditing();
    }
    updatingTag = false;
  }

  async function onNameFieldKeyup(event: KeyboardEvent) {
    if (event.key !== 'Enter') {
      nameField.validateAndSet($nameField.value);
    }
  }

  async function onColorFieldKeyup(event: KeyboardEvent) {
    if (event.key !== 'Enter') {
      colorField.validateAndSet($colorField.value);
    }
  }

  async function deleteTag(tag: Tag): Promise<void> {
    const { confirm } = await showConfirmModal(
      'Delete',
      `Are you sure you want to delete "${tag.name}"? All occurrences of this tag will be removed from Plans, Activity Directives, Constraints, Scheduling Goals, and Expansion Rules.`,
      'Delete Tag',
    );
    if (confirm) {
      await effects.deleteTag(tag, user);
      // Stop editing if the selected tag is the one being deleted
      if (selectedTag?.id === tag.id) {
        exitEditing(false);
      }
    }
  }

  function deleteTagContext(event: CustomEvent<RowId[]>) {
    const id = event.detail[0] as number;
    const tag = tags.find(t => t.id === id);
    if (tag) {
      deleteTag(tag);
    }
  }

  function exitEditing(deselect: boolean = true) {
    resetTagFields();
    $createTagError = null;
    selectedTag = null;
    if (deselect && dataGrid) {
      dataGrid.selectedItemId = null;
    }
  }

  function onFormSubmit() {
    if (selectedTag) {
      updateTag();
    } else {
      createTag();
    }
  }

  function showTag(tag: Tag) {
    selectedTag = tag;
    nameField.validateAndSet(tag.name);
    colorField.validateAndSet(tag.color ?? '');
  }
</script>

<PageTitle title="Tags" />

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav {user}>
    <span slot="title">Tags</span>
  </Nav>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <SectionTitle>
          {#if selectedTag}
            <PenIcon /> Edit Tag
          {:else}
            <PlusIcon /> New Tag
          {/if}
        </SectionTitle>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={onFormSubmit}>
          <AlertError class="m-2" error={$createTagError} />

          <Field field={nameField}>
            <label for="name" slot="label">Name</label>
            <input
              on:keyup={onNameFieldKeyup}
              bind:this={nameInputField}
              autocomplete="off"
              class="st-input w-100"
              name="name"
              use:permissionHandler={{
                hasPermission: canCreate,
                permissionError,
              }}
            />
          </Field>

          <Field field={colorField}>
            <label for="color" slot="label">Color</label>
            <div class="tags-color-picker">
              <input
                on:keyup={onColorFieldKeyup}
                bind:this={colorInputField}
                autocomplete="off"
                class="st-input w-100"
                name="color"
                use:permissionHandler={{
                  hasPermission: canCreate,
                  permissionError,
                }}
              />
              <!-- TODO add permission handler here -->
              <ColorPresetsPicker
                tooltipText="Select Color"
                presetColors={[
                  '#FAB9C7',
                  '#FBCAC9',
                  '#F7CAB5',
                  '#F0EEB9',
                  '#BAF3C8',
                  '#E0EEE4',
                  '#C1CDEE',
                  '#E2DEF5',
                  '#D4BFF7',
                  '#F0CDF5',
                  '#FAC4F1',
                  '#F1E6E4',
                  '#E7D7BE',
                  '#E3E0CD',
                  '#E8E8E8',
                ]}
                placement="bottom-start"
                value={$colorField.value}
                on:input={event => colorField.validateAndSet(event.detail.value)}
              />
              <button
                type="button"
                class="st-button icon"
                use:permissionHandler={{
                  hasPermission: canCreate,
                  permissionError,
                }}
                on:click={() => colorField.validateAndSet(generateRandomPastelColor())}
              >
                <RefreshIcon />
              </button>
            </div>
          </Field>

          <fieldset>
            <label for="preview">Tag Preview</label>
            <div class="tags-preview">
              <TagChip
                tag={{ color: $colorField.value, id: -1, name: $nameField.value || 'Tag Name' }}
                removable={false}
              />
            </div>
          </fieldset>

          <fieldset>
            <div class="tags-creator st-typography-body">
              Created by <span>@{user?.id}</span>
            </div>
          </fieldset>

          <fieldset>
            {#if !selectedTag}
              <button
                class="st-button w-100"
                disabled={!submitButtonEnabled || creatingTag}
                type="submit"
                use:permissionHandler={{
                  hasPermission: canCreate,
                  permissionError,
                }}
              >
                {creatingTag ? 'Creating...' : 'Create'}
              </button>
            {:else}
              <div class="tags-save-buttons">
                <button
                  on:click={() => exitEditing()}
                  disabled={updatingTag}
                  class="st-button secondary w-100"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  class="st-button w-100"
                  disabled={!submitButtonEnabled || !selectedTagModified || updatingTag}
                  type="submit"
                  use:permissionHandler={{
                    hasPermission: canCreate,
                    permissionError,
                  }}
                >
                  {updatingTag ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            {/if}
          </fieldset>
        </form>
      </svelte:fragment>
    </Panel>

    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>
          <TagsIcon />
          Tags
        </SectionTitle>
        <Input layout="inline">
          <input bind:value={filterText} class="st-input" placeholder="Filter tags" style="width: 300px" />
        </Input>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if filteredTags.length}
          <SingleActionDataGrid
            bind:this={dataGrid}
            {columnDefs}
            hasDeletePermission={featurePermissions.tags.canDelete}
            itemDisplayText="Tag"
            items={filteredTags}
            {user}
            on:deleteItem={deleteTagContext}
            on:rowClicked={({ detail }) => {
              showTag(detail.data);
            }}
          />
        {:else}
          No Tags Found
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>

<style>
  .tags-color-picker {
    display: flex;
    gap: 4px;
  }

  .tags-color-picker :global(.color-preset-picker) {
    flex-shrink: 0;
  }

  .tags-preview {
    margin-top: 2px;
  }

  .tags-preview :global(.st-chip) {
    max-width: 100%;
  }

  .tags-creator {
    display: flex;
    justify-content: space-between;
  }

  .tags-save-buttons {
    display: flex;
    gap: 4px;
  }
</style>
