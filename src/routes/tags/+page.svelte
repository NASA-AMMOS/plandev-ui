<svelte:options immutable={true} />

<script lang="ts">
  import { Button, Input, Input as InputType, Label } from '@nasa-jpl/stellar-svelte';
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
      cellRenderer: (params: TagsCellRendererParams): HTMLDivElement | void => {
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
      valueGetter: (params: ValueGetterParams<Tag>): string | void => {
        if (params.data?.created_at) {
          return getShortISOForDate(new Date(params.data?.created_at));
        }
      },
    },
  ];
  const defaultColor = generateRandomPastelColor();
  const permissionError: string = 'You do not have permission to create a tag';

  let canCreate: boolean = false;
  let columnDefs: DataGridColumnDef[] = baseColumnDefs;
  let dataGrid: SingleActionDataGrid<Tag> | undefined = undefined;
  let filterText: string = '';
  let tags: Tag[];
  let nameInputField: InputType;
  let user: User | null = null;
  let selectedTag: Tag | null = null;
  let selectedTagModified: boolean = false;
  let creatingTag: boolean = false;
  let updatingTag: boolean = false;

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
          <svelte:fragment slot="icon">
            {#if selectedTag}
              <PenIcon slot="icon" />
            {:else}
              <PlusIcon slot="icon" />
            {/if}
          </svelte:fragment>
          {#if selectedTag}
            Edit Tag
          {:else}
            New Tag
          {/if}
        </SectionTitle>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={onFormSubmit} class="flex flex-col gap-1.5">
          <AlertError class="m-2" error={$createTagError} />

          <Field field={nameField}>
            <Label for="name" slot="label" class="pb-0.5 text-xs font-normal">Name</Label>
            <div
              use:permissionHandler={{
                hasPermission: canCreate,
                permissionError,
              }}
            >
              <Input
                on:keyup={onNameFieldKeyup}
                bind:this={nameInputField}
                autocomplete="off"
                sizeVariant="xs"
                name="name"
                id="name"
                placeholder="Enter tag name"
              />
            </div>
          </Field>

          <Field field={colorField}>
            <Label for="color" slot="label" class="pb-0.5 text-xs font-normal">Color</Label>
            <div class="flex w-full gap-2">
              <div
                use:permissionHandler={{
                  hasPermission: canCreate,
                  permissionError,
                }}
                class="w-full"
              >
                <Input on:keyup={onColorFieldKeyup} autocomplete="off" name="color" id="color" sizeVariant="xs" />
              </div>
              <!-- TODO add permission handler here -->
              <div class="size-6">
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
              </div>
              <div
                use:permissionHandler={{
                  hasPermission: canCreate,
                  permissionError,
                }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  on:click={() => colorField.validateAndSet(generateRandomPastelColor())}
                >
                  <RefreshIcon />
                </Button>
              </div>
            </div>
          </Field>

          <fieldset>
            <Label for="preview" class="pb-0.5 text-xs font-normal">Tag Preview</Label>

            <!-- tag preview container -->
            <div class="flex w-full justify-between rounded-md border p-1">
              <TagChip
                tag={{ color: $colorField.value, id: -1, name: $nameField.value || 'Tag Name' }}
                removable={false}
              />
            </div>
          </fieldset>

          <fieldset class="my-4">
            {#if !selectedTag}
              <div
                use:permissionHandler={{
                  hasPermission: canCreate,
                  permissionError,
                }}
              >
                <Button class="w-full" disabled={!submitButtonEnabled || creatingTag} type="submit">
                  {creatingTag ? 'Creating...' : 'Create'}
                </Button>
              </div>
            {:else}
              <div
                class="flex gap-2"
                use:permissionHandler={{
                  hasPermission: canCreate,
                  permissionError,
                }}
              >
                <Button
                  on:click={() => exitEditing()}
                  disabled={updatingTag}
                  variant="outline"
                  type="button"
                  class="w-full"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!submitButtonEnabled || !selectedTagModified || updatingTag}
                  type="submit"
                  class="w-full"
                >
                  {updatingTag ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            {/if}
          </fieldset>
        </form>
      </svelte:fragment>
    </Panel>

    <Panel>
      <svelte:fragment slot="header">
        <div class="flex w-full max-w-sm items-center gap-1">
          <SectionTitle>
            <TagsIcon slot="icon" />
            Tags
          </SectionTitle>
          <Input bind:value={filterText} placeholder="Filter tags" aria-label="Filter tags" sizeVariant="xs" />
        </div>
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
          <div class="flex h-full w-full items-center justify-center">
            <span class="text-sm">No Tags Found</span>
          </div>
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>
