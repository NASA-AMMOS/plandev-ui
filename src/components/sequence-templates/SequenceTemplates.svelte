<svelte:options immutable={true} />

<script lang="ts">
  import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';
  import { sequenceAdaptation, setSequenceLanguages } from '../../stores/sequence-adaptation';
  import { selectedSequenceTemplateId, sequenceTemplates } from '../../stores/sequence-template';
  import {
    channelDictionaries,
    commandDictionaries,
    getParsedChannelDictionary,
    getParsedCommandDictionary,
    getParsedParameterDictionary,
    parameterDictionaries as parameterDictionariesStore,
    parcels,
    parcelToParameterDictionaries,
  } from '../../stores/sequencing';
  import type { User } from '../../types/app';
  import type { SequenceTemplate } from '../../types/sequence-template';
  import type {
    ChannelDictionaryMetadata,
    CommandDictionaryMetadata,
    ParameterDictionaryMetadata,
    Parcel,
  } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { downloadBlob, filterEmpty } from '../../utilities/generic';
  import { showTemplateModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import * as adaptationUtils from '../../utilities/sequence-editor/adaptation-utils';
  import { showFailureToast } from '../../utilities/toast';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import SequenceTemplateEditor from './SequenceTemplateEditor.svelte';
  import SequenceTemplateTable from './SequenceTemplateTable.svelte';

  export let user: User | null;

  let filterText: string = '';
  let selectedTemplate: SequenceTemplate | undefined = undefined;
  let sequenceTemplateColumns: string;
  let sequenceTemplateRows: string;
  let channelDictionary: ChannelDictionary | null = null;
  let commandDictionary: CommandDictionary | null = null;
  let parameterDictionaries: ParameterDictionary[] = [];
  let parcel: Parcel | undefined = undefined;

  $: sequenceTemplateColumns = selectedTemplate !== undefined ? '0.75fr 3px 1.5fr' : '1fr 3px 1fr';
  $: sequenceTemplateRows = selectedTemplate !== undefined ? '1fr 3px 1fr' : 'none';
  $: selectedTemplate = $selectedSequenceTemplateId
    ? $sequenceTemplates.find(sequenceTemplate => sequenceTemplate.id === $selectedSequenceTemplateId)
    : undefined;
  $: parcel = $parcels.find(p => p.id === selectedTemplate?.parcel_id) ?? undefined;

  $: if (parcel) {
    loadSequenceAdaptation(parcel.sequence_adaptation_id);

    const unparsedChannelDictionary = $channelDictionaries.find(
      channelDictionaryMetadata => channelDictionaryMetadata.id === parcel.channel_dictionary_id,
    );
    const unparsedCommandDictionary = $commandDictionaries.find(
      commandDictionaryMetadata => commandDictionaryMetadata.id === parcel.command_dictionary_id,
    );
    const unparsedParameterDictionaries = $parameterDictionariesStore.filter(parameterDictionaryMetadata => {
      const parameterDictionary = $parcelToParameterDictionaries.find(
        parcelToParameterDictionary =>
          parcelToParameterDictionary.parameter_dictionary_id === parameterDictionaryMetadata.id &&
          parcelToParameterDictionary.parcel_id === parcel.id,
      );

      return parameterDictionary != null;
    });

    if (unparsedCommandDictionary) {
      loadCommandDictionary(unparsedCommandDictionary);
    } else {
      commandDictionary = null;
    }
    if (unparsedChannelDictionary) {
      loadChannelDictionary(unparsedChannelDictionary);
    } else {
      channelDictionary = null;
    }
    if (unparsedParameterDictionaries.length > 0) {
      loadParameterDictionaries(unparsedParameterDictionaries);
    } else {
      parameterDictionaries = [];
    }
  }

  async function loadSequenceAdaptation(id: number | null | undefined) {
    // load a user sequencing adaptation from the DB, and execute it in the page's JS context.
    // adaptation is a user-provided JS module w/ functions that hook into editor functionality to provide linting, etc.

    if (!id) {
      // not passing an ID means we want to intentionally reset to the default adaptation
      resetSequenceAdaptation();
      return;
    }

    try {
      const adaptation = await adaptationUtils.loadSequenceAdaptation(id, user);
      setSequenceLanguages(adaptation);
    } catch (e) {
      console.error(e);
      showFailureToast('Invalid sequence adaptation');
    }
  }

  async function loadCommandDictionary(unparsedCommandDictionary: CommandDictionaryMetadata) {
    const parsedDictionary = await getParsedCommandDictionary(unparsedCommandDictionary, user);
    if (parsedDictionary) {
      commandDictionary = parsedDictionary;
    } else {
      commandDictionary = null;
    }
  }

  async function loadChannelDictionary(unparsedChannelDictionary?: ChannelDictionaryMetadata) {
    if (unparsedChannelDictionary) {
      const parsedDictionary = await getParsedChannelDictionary(unparsedChannelDictionary, user);
      if (parsedDictionary) {
        channelDictionary = parsedDictionary;
      }
    } else {
      channelDictionary = null;
    }
  }

  async function loadParameterDictionaries(unparsedParameterDictionaries: ParameterDictionaryMetadata[] = []) {
    parameterDictionaries = (
      await Promise.all(
        unparsedParameterDictionaries.map(unparsedParameterDictionary => {
          return getParsedParameterDictionary(unparsedParameterDictionary, user);
        }),
      )
    ).filter(filterEmpty);
  }

  function resetSequenceAdaptation(): void {
    setSequenceLanguages(undefined);
  }

  function onDownloadTemplate(sequenceTemplate: SequenceTemplate) {
    downloadBlob(
      new Blob([sequenceTemplate.template_definition], { type: 'text/plain' }),
      `${sequenceTemplate.name}_${sequenceTemplate.activity_type}.${sequenceTemplate.language}`,
    );
  }

  function onTemplateSelected(event: CustomEvent<SequenceTemplate>) {
    $selectedSequenceTemplateId = event.detail.id;
  }

  function onTemplateChanged(event: CustomEvent<{ input: string; output: string }>) {
    if (selectedTemplate) {
      selectedTemplate.template_definition = event.detail.input;
    }
  }

  async function createSequenceTemplate(): Promise<void> {
    const { confirm, value } = await showTemplateModal(user);
    if (!confirm || value === undefined) {
      return;
    }

    // Check if importing a file, otherwise create a new template
    if ('sequenceTemplateFile' in value) {
      const sequenceTemplateFile = value.sequenceTemplateFile as File;
      if (sequenceTemplateFile !== undefined) {
        const parsedSequenceTemplateFile: string = await sequenceTemplateFile.text();
        effects.importSequenceTemplate(
          value.activityType,
          value.language,
          value.modelId,
          value.name,
          value.parcelId,
          parsedSequenceTemplateFile,
          user,
        );
      }
    } else {
      effects.createSequenceTemplate(
        value.activityType,
        value.language,
        value.modelId,
        value.name,
        value.parcelId,
        '',
        user,
      );
    }
  }
</script>

<CssGrid bind:columns={sequenceTemplateColumns}>
  <CssGrid rows={sequenceTemplateRows}>
    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>Sequence Templates</SectionTitle>

        <Input>
          <input bind:value={filterText} class="st-input" placeholder="Filter templates" style="width: 100%;" />
        </Input>

        <div class="right">
          <button
            class="st-button secondary ellipsis"
            use:permissionHandler={{
              hasPermission: featurePermissions.sequences.canCreate(user),
              permissionError: 'You do not have permission to create a new sequence',
            }}
            on:click|stopPropagation={createSequenceTemplate}
          >
            New Template
          </button>
        </div>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <SequenceTemplateTable
          {filterText}
          {user}
          on:download={e => onDownloadTemplate(e.detail.template)}
          on:templateSelected={onTemplateSelected}
        />
      </svelte:fragment>
    </Panel>

    {#if selectedTemplate !== undefined}
      <CssGridGutter track={1} type="row" />
      <Panel>
        <svelte:fragment slot="header">
          <slot name="left">
            <SectionTitle>Sequence Template Details</SectionTitle>
          </slot>
          <slot name="right">
            <button
              class="st-button icon fs-6"
              on:click={() => ($selectedSequenceTemplateId = null)}
              use:tooltip={{ content: 'Deselect sequence template', placement: 'top' }}
            >
              <XIcon />
            </button>
          </slot>
        </svelte:fragment>
        <svelte:fragment slot="body">
          <div class="selected-template-details">
            <Input layout="inline">
              Id
              <input class="st-input w-100" disabled={true} name="id" value={selectedTemplate.id} />
            </Input>
            <Input layout="inline">
              Name
              <input class="st-input w-100" disabled={true} name="name" value={selectedTemplate.name} />
            </Input>
            <Input layout="inline">
              Owner
              <input class="st-input w-100" disabled={true} name="owner" value={selectedTemplate.owner} />
            </Input>
            <Input layout="inline">
              Model Id
              <input class="st-input w-100" disabled={true} name="modelId" value={selectedTemplate.model_id} />
            </Input>
            <Input layout="inline">
              Parcel Id
              <input class="st-input w-100" disabled={true} name="parcelId" value={selectedTemplate.parcel_id} />
            </Input>
            <Input layout="inline">
              Language
              <input class="st-input w-100" disabled={true} name="language" value={selectedTemplate.language} />
            </Input>
            <Input layout="inline">
              Activity Type
              <input
                class="st-input w-100"
                disabled={true}
                name="activityType"
                value={selectedTemplate.activity_type}
              />
            </Input>
          </div>
        </svelte:fragment>
      </Panel>
    {/if}
  </CssGrid>

  <CssGridGutter track={1} type="column" />

  {#if selectedTemplate}
    <SequenceTemplateEditor
      {channelDictionary}
      {commandDictionary}
      {parameterDictionaries}
      sequenceAdaptation={$sequenceAdaptation}
      showCommandFormBuilder={true}
      template={selectedTemplate}
      on:templateChanged={onTemplateChanged}
      on:download={e => {
        onDownloadTemplate(e.detail.template);
      }}
      {user}
    />
  {:else}
    <div class="no-templates">No template selected</div>
  {/if}
</CssGrid>

<style>
  .right {
    column-gap: 5px;
    display: flex;
    flex-wrap: nowrap;
  }

  .no-templates {
    margin: 8px;
  }

  .selected-template-details {
    margin-left: 8px;
    margin-right: 8px;
  }
</style>
