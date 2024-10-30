<svelte:options immutable={true} />

<script lang="ts">
  import MinusIcon from '@nasa-jpl/stellar/icons/minus.svg?component';
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import Ajv from 'ajv';
  import { createEventDispatcher } from 'svelte';
  import {
    derivationGroupSchema,
    externalEventTypeSchema,
    externalSourceTypeSchema,
  } from '../../constants/external-event-validation-schemae';
  import {
    createExternalEventTypeError,
    externalEventTypes,
    resetExternalEventStores,
  } from '../../stores/external-event';
  import {
    createDerivationGroupError,
    createExternalSourceTypeError,
    derivationGroups,
    externalSourceTypes,
    resetExternalSourceStores,
  } from '../../stores/external-source';
  import type { User } from '../../types/app';
  import type { ExternalEventTypeInsertInput, ExternalEventTypeJSON } from '../../types/external-event';
  import type {
    DerivationGroupJSON,
    ExternalSourceTypeInsertInput,
    ExternalSourceTypeJSON,
  } from '../../types/external-source';
  import type { ParameterName, ParametersMap } from '../../types/parameter';
  import type { ValueSchema } from '../../types/schema';
  import type { TabId } from '../../types/tabs';
  import effects from '../../utilities/effects';
  import { parseJSONStream } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import AlertError from '../ui/AlertError.svelte';
  import ParameterEntry from '../ui/ParameterEntry.svelte';
  import Tab from '../ui/Tabs/Tab.svelte';
  import TabPanel from '../ui/Tabs/TabPanel.svelte';
  import Tabs from '../ui/Tabs/Tabs.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();
  const derivationGroupTabId: TabId = 'derivationGroup';
  const externalSourceTypeTabId: TabId = 'externalSourceType';
  const externalEventTypeTabId: TabId = 'externalEventType';
  const createDerivationGroupPermissionError: string = 'You do not have permission to create a derivation group.';
  const createExternalSourceTypePermissionError: string =
    'You do not have permission to create an external source type.';
  const createExternalEventTypePermissionError: string = 'You do not have permission to create an external event type.';

  // Derivation group variables
  let hasCreateDerivationGroupPermission: boolean = false;

  let newDerivationGroups: { name: string; sourceType: string; valid: boolean }[] = [
    { name: '', sourceType: '', valid: false },
  ];

  // External source type variables
  let hasCreateExternalSourceTypePermission: boolean = false;
  let newExternalSourceTypes: {
    metadata: {
      isRequired: boolean | null;
      name: ParameterName | null;
      schema: ValueSchema | null;
    }[];
    name: string;
    valid: boolean;
  }[] = [{ metadata: [], name: '', valid: false }];

  // External event type variables
  let hasCreateExternalEventTypePermission: boolean = false;
  let newExternalEventTypes: {
    metadata: {
      isRequired: boolean | null;
      name: ParameterName | null;
      schema: ValueSchema | null;
    }[];
    name: string;
    valid: boolean;
  }[] = [{ metadata: [], name: '', valid: false }];

  let creationError: string | null = null;
  let hasCreationPermissionForCurrentTab: boolean = false;

  let selectedTab: TabId = derivationGroupTabId; // first tab that appears
  let isCreateDisabled: boolean = true;

  let derivationGroupUploadFiles: FileList | undefined;
  let derivationGroupUploadFileMain: File | undefined;
  let derivationGroupJSON: { entries: DerivationGroupJSON[] } | null = null;
  let externalSourceTypeUploadFiles: FileList | undefined;
  let externalSourceTypeUploadFileMain: File | undefined;
  let externalSourceTypeJSON: { entries: ExternalSourceTypeJSON[] } | null = null;
  let externalEventTypeUploadFiles: FileList | undefined;
  let externalEventTypeUploadFileMain: File | undefined;
  let externalEventTypeJSON: { entries: ExternalEventTypeJSON[] } | null = null;
  let uploadFilesError: string | null = null;
  let validationError: string | null = null;

  // for JSON Schema validation validation
  const ajv = new Ajv();

  // Reactively determine deletion permissions
  $: hasCreateDerivationGroupPermission = featurePermissions.derivationGroup.canCreate(user);
  $: hasCreateExternalSourceTypePermission = featurePermissions.externalSourceType.canCreate(user);
  $: hasCreateExternalEventTypePermission = featurePermissions.externalEventType.canCreate(user);

  $: {
    if (selectedTab === derivationGroupTabId) {
      hasCreationPermissionForCurrentTab = hasCreateDerivationGroupPermission;
      isCreateDisabled = !newDerivationGroups.map(entry => entry.valid).reduce((prev, curr) => prev && curr, true);
    } else if (selectedTab === externalSourceTypeTabId) {
      hasCreationPermissionForCurrentTab = hasCreateExternalSourceTypePermission;
      isCreateDisabled = !newExternalSourceTypes.map(entry => entry.valid).reduce((prev, curr) => prev && curr, true);
    } else if (selectedTab === externalEventTypeTabId) {
      hasCreationPermissionForCurrentTab = hasCreateExternalEventTypePermission;
      isCreateDisabled = !newExternalEventTypes.map(entry => entry.valid).reduce((prev, curr) => prev && curr, true);
    }
  }

  // TODO: unify this somehow?
  $: newDerivationGroups = newDerivationGroups.map(entry => {
    return {
      name: entry.name,
      sourceType: entry.sourceType,
      valid:
        validateDerivationGroupName(entry.name) &&
        entry.sourceType.length > 0 &&
        $externalSourceTypes.map(est => est.name).includes(entry.sourceType),
    };
  });

  $: newExternalSourceTypes = newExternalSourceTypes.map(entry => {
    return {
      metadata: entry.metadata,
      name: entry.name,
      valid: validateEST(entry),
    };
  });

  $: newExternalEventTypes = newExternalEventTypes.map(entry => {
    return {
      metadata: entry.metadata,
      name: entry.name,
      valid: validateEET(entry),
    };
  });

  // File parse logic
  // TODO: unify this somehow?
  $: if (derivationGroupUploadFiles !== null && derivationGroupUploadFiles?.length) {
    // Safeguard against infinitely executing parse logic
    if (derivationGroupUploadFileMain !== derivationGroupUploadFiles[0]) {
      uploadFilesError = null;
      validationError = null;

      derivationGroupUploadFileMain = derivationGroupUploadFiles[0];
      // JUST parse it
      parseDG(derivationGroupUploadFileMain.stream());
    }
  }

  async function parseDG(stream: ReadableStream) {
    console.log('parsing');
    try {
      try {
        // remove this stuff
        derivationGroupJSON = await parseJSONStream<{ entries: DerivationGroupJSON[] }>(stream);
        const validate = ajv.compile(derivationGroupSchema);
        const valid = validate(derivationGroupJSON); // TODO: validate the stream, and then convert to JSON after?
        console.log(derivationGroupJSON, stream);
        if (!valid && validate.errors) {
          validationError = `Invalid JSON: ${validate.errors[0].instancePath} has error "${validate.errors[0].message}".`;
          derivationGroupJSON = null;
        }
        console.log('parsed!');
      } catch (e) {
        throw new Error('Derivation Group Definition File is not a valid JSON');
      }
    } catch (e) {
      uploadFilesError = (e as Error).message;
    }
  }

  function uploadDGs() {
    console.log('HERE!', derivationGroupJSON, validationError);
    if (derivationGroupJSON && validationError === null) {
      console.log('HERE!2');
      newDerivationGroups = [
        ...newDerivationGroups.filter(derivationGroup => derivationGroup.name.length > 0),
        ...derivationGroupJSON.entries.map(entry => {
          return {
            name: entry.name,
            sourceType: entry.source_type_name,
            valid:
              validateDerivationGroupName(entry.name) &&
              entry.source_type_name.length > 0 &&
              $externalSourceTypes.map(est => est.name).includes(entry.source_type_name),
          };
        }),
      ];

      // reset files
      derivationGroupUploadFiles = undefined;
      derivationGroupUploadFileMain = undefined;
      derivationGroupJSON = null;
    }
  }

  $: if (externalSourceTypeUploadFiles !== null && externalSourceTypeUploadFiles?.length) {
    // Safeguard against infinitely executing parse logic
    if (externalSourceTypeUploadFileMain !== externalSourceTypeUploadFiles[0]) {
      uploadFilesError = null;
      validationError = null;

      externalSourceTypeUploadFileMain = externalSourceTypeUploadFiles[0];
      // JUST parse it
      parseEST(externalSourceTypeUploadFileMain.stream());
    }
  }

  async function parseEST(stream: ReadableStream) {
    console.log('parsing');
    try {
      try {
        // remove this stuff
        externalSourceTypeJSON = await parseJSONStream<{ entries: ExternalSourceTypeJSON[] }>(stream);
        const validate = ajv.compile(externalSourceTypeSchema);
        const valid = validate(externalSourceTypeJSON); // TODO: validate the stream, and then convert to JSON after?
        console.log(externalSourceTypeJSON, stream);
        if (!valid && validate.errors) {
          validationError = `Invalid JSON: ${validate.errors[0].instancePath} has error "${validate.errors[0].message}".`;
          externalSourceTypeJSON = null;
        }
        console.log('parsed!');
      } catch (e) {
        throw new Error('External Source Type Definition File is not a valid JSON');
      }
    } catch (e) {
      uploadFilesError = (e as Error).message;
    }
  }

  function uploadESTs() {
    if (externalSourceTypeJSON && validationError === null) {
      newExternalSourceTypes = [
        ...newExternalSourceTypes.filter(sourceType => sourceType.name.length > 0),
        ...externalSourceTypeJSON.entries.map(entry => {
          return {
            metadata: entry.metadata,
            name: entry.name,
            valid: validateEST({ metadata: entry.metadata, name: entry.name, valid: false }),
          };
        }),
      ];

      // reset files
      externalSourceTypeUploadFiles = undefined;
      externalSourceTypeUploadFileMain = undefined;
      externalSourceTypeJSON = null;
    }
  }

  $: if (externalEventTypeUploadFiles !== null && externalEventTypeUploadFiles?.length) {
    // Safeguard against infinitely executing parse logic
    if (externalEventTypeUploadFileMain !== externalEventTypeUploadFiles[0]) {
      uploadFilesError = null;
      validationError = null;

      externalEventTypeUploadFileMain = externalEventTypeUploadFiles[0];
      // JUST parse it
      parseEET(externalEventTypeUploadFileMain.stream());
    }
  }

  async function parseEET(stream: ReadableStream) {
    try {
      try {
        // remove this stuff
        externalEventTypeJSON = await parseJSONStream<{ entries: ExternalEventTypeJSON[] }>(stream);
        const validate = ajv.compile(externalEventTypeSchema);
        const valid = validate(externalEventTypeJSON); // TODO: validate the stream, and then convert to JSON after?
        console.log(externalEventTypeJSON, stream);
        if (!valid && validate.errors) {
          validationError = `Invalid JSON: ${validate.errors[0].instancePath} has error "${validate.errors[0].message}".`;
          externalEventTypeJSON = null;
        }
        console.log('parsed!');
      } catch (e) {
        throw new Error('External Source Type Definition File is not a valid JSON');
      }
    } catch (e) {
      uploadFilesError = (e as Error).message;
    }
  }

  function uploadEETs() {
    if (externalEventTypeJSON && validationError === null) {
      newExternalEventTypes = [
        ...newExternalEventTypes.filter(eventType => eventType.name.length > 0),
        ...externalEventTypeJSON.entries.map(entry => {
          return {
            metadata: entry.metadata,
            name: entry.name,
            valid: validateEET({ metadata: entry.metadata, name: entry.name, valid: false }),
          };
        }),
      ];

      // reset files
      externalEventTypeUploadFiles = undefined;
      externalEventTypeUploadFileMain = undefined;
      externalEventTypeJSON = null;
    }
  }

  function onCreateDerivationGroup() {
    if (isCreateDisabled) {
      creationError = 'Please fill out all derivation group names and source types.';
    } else {
      newDerivationGroups.forEach(entry => {
        effects.createDerivationGroup({ name: entry.name, source_type_name: entry.sourceType }, user);
      });
      newDerivationGroups = [{ name: '', sourceType: '', valid: false }];
    }
  }

  // async function parseDerivationGroupInputFileStream(stream: ReadableStream) {
  //   uploadFilesError = null;
  //   validationError = null;
  //   try {
  //     let derivationGroupJSON: { entries: DerivationGroupJSON[] };
  //     try {
  //       // remove this stuff
  //       derivationGroupJSON = await parseJSONStream<{ entries: DerivationGroupJSON[] }>(stream);
  //       const validate = ajv.compile(derivationGroupSchema);
  //       const valid = validate(derivationGroupJSON); // TODO: validate the stream, and then convert to JSON after?
  //       console.log(derivationGroupJSON, stream);
  //       if (!valid && validate.errors) {
  //         validationError = `Invalid JSON: ${validate.errors[0].instancePath} has error "${validate.errors[0].message}".`;
  //       } else {
  //         newDerivationGroups = [
  //           ...newDerivationGroups.filter(derivationGroup => derivationGroup.name.length > 0),
  //           ...derivationGroupJSON.entries.map(entry => {
  //             return {
  //               name: entry.name,
  //               sourceType: entry.source_type_name,
  //               valid:
  //                 validateDerivationGroupName(entry.name) &&
  //                 entry.source_type_name.length > 0 &&
  //                 $externalSourceTypes.map(est => est.name).includes(entry.source_type_name),
  //             };
  //           }),
  //         ];
  //       }
  //     } catch (e) {
  //       throw new Error('Derivation Group Definition File is not a valid JSON');
  //     }
  //   } catch (e) {
  //     uploadFilesError = (e as Error).message;
  //   }
  // }

  // async function parseExternalSourceTypeInputFileStream(stream: ReadableStream) {
  //   uploadFilesError = null;
  //   validationError = null;
  //   try {
  //     let externalSourceTypeJSON: { entries: ExternalSourceTypeJSON[] };
  //     try {
  //       externalSourceTypeJSON = await parseJSONStream<{ entries: ExternalSourceTypeJSON[] }>(stream);
  //       const validate = ajv.compile(externalSourceTypeSchema);
  //       const valid = validate(externalSourceTypeJSON);
  //       if (!valid && validate.errors) {
  //         validationError = `Invalid JSON: ${validate.errors[0].instancePath} has error "${validate.errors[0].message}".`;
  //       } else {
  //         newExternalSourceTypes = [
  //           ...newExternalSourceTypes.filter(sourceType => sourceType.name.length > 0),
  //           ...externalSourceTypeJSON.entries.map(entry => {
  //             return {
  //               metadata: entry.metadata,
  //               name: entry.name,
  //               valid: validateEST({ metadata: entry.metadata, name: entry.name, valid: false }),
  //             };
  //           }),
  //         ];
  //       }
  //     } catch (e) {
  //       throw new Error('External Source Type Definition File is not a valid JSON');
  //     }
  //   } catch (e) {
  //     uploadFilesError = (e as Error).message;
  //   }
  // }

  // async function parseExternalEventTypeInputFileStream(stream: ReadableStream) {
  //   uploadFilesError = null;
  //   validationError = null;
  //   try {
  //     let externalEventTypeJSON: { entries: ExternalEventTypeJSON[] };
  //     try {
  //       externalEventTypeJSON = await parseJSONStream<{ entries: ExternalEventTypeJSON[] }>(stream);
  //       const validate = ajv.compile(externalEventTypeSchema);
  //       const valid = validate(externalEventTypeJSON);
  //       if (!valid && validate.errors) {
  //         validationError = `Invalid JSON: ${validate.errors[0].instancePath} has error "${validate.errors[0].message}".`;
  //       } else {
  //         newExternalEventTypes = [
  //           ...newExternalEventTypes.filter(eventType => eventType.name.length > 0),
  //           ...externalEventTypeJSON.entries.map(entry => {
  //             return {
  //               metadata: entry.metadata,
  //               name: entry.name,
  //               valid: validateEET({ metadata: entry.metadata, name: entry.name, valid: false }),
  //             };
  //           }),
  //         ];
  //       }
  //     } catch (e) {
  //       throw new Error('External Event Type Definition File is not a valid JSON');
  //     }
  //   } catch (e) {
  //     uploadFilesError = (e as Error).message;
  //   }
  // }

  function onCreateExternalSourceType() {
    if (isCreateDisabled) {
      creationError = 'Please ensure every type has a name, and all metadata has a name and type.';
    } else {
      for (let sourceType of newExternalSourceTypes) {
        // TODO: This probably doesn't need to exist - swap input keys?
        const newExternalSourceTypeMetadataParameterMap: ParametersMap = {};
        let requiredMetadata: ParameterName[] = [];
        if (sourceType.metadata.length > 0) {
          sourceType.metadata.forEach(newMetadata => {
            if (newMetadata.name !== null && newMetadata.schema !== null) {
              newExternalSourceTypeMetadataParameterMap[newMetadata.name] = {
                order: 1,
                schema: newMetadata.schema,
              };
              if (newMetadata.isRequired) {
                requiredMetadata.push(newMetadata.name);
              }
            }
          });
        }
        // Generate Hasura mutation input
        const externalSourceTypeInsertInput: ExternalSourceTypeInsertInput = {
          metadata: newExternalSourceTypeMetadataParameterMap,
          name: sourceType.name,
          required_metadata: requiredMetadata,
        };
        effects.createExternalSourceType(externalSourceTypeInsertInput, user);
        newExternalSourceTypes = [{ metadata: [], name: '', valid: false }];
      }
    }
  }

  function onCreateExternalEventType() {
    if (isCreateDisabled) {
      creationError = 'Please ensure every type has a name, and all metadata has a name and type.';
    } else {
      for (let eventType of newExternalEventTypes) {
        // TODO: This probably doesn't need to exist - swap input keys?
        const newExternalEventTypeMetadataParameterMap: ParametersMap = {};
        let requiredMetadata: ParameterName[] = [];
        if (eventType.metadata.length > 0) {
          eventType.metadata.forEach(newMetadata => {
            if (newMetadata.name !== null && newMetadata.schema !== null) {
              newExternalEventTypeMetadataParameterMap[newMetadata.name] = {
                order: 1,
                schema: newMetadata.schema,
              };
              if (newMetadata.isRequired) {
                requiredMetadata.push(newMetadata.name);
              }
            }
          });
        }
        // Generate Hasura mutation input
        const externalEventTypeInsertInput: ExternalEventTypeInsertInput = {
          metadata: newExternalEventTypeMetadataParameterMap,
          name: eventType.name,
          required_metadata: requiredMetadata,
        };
        effects.createExternalEventType(externalEventTypeInsertInput, user);
        newExternalEventTypes = [{ metadata: [], name: '', valid: false }];
      }
    }
  }

  function handleCreation() {
    if (selectedTab === derivationGroupTabId) {
      onCreateDerivationGroup();
    } else if (selectedTab === externalSourceTypeTabId) {
      onCreateExternalSourceType();
    } else if (selectedTab === externalEventTypeTabId) {
      onCreateExternalEventType();
    }
  }

  function handleChange() {
    resetExternalSourceStores();
    resetExternalEventStores();
    creationError = null;
  }

  function handleTabChange(changeEvent: CustomEvent<{ id: TabId; index: number }>) {
    const { id } = changeEvent.detail;
    selectedTab = id;
    handleChange();
  }

  // function onImportFileChanged(event: Event) {
  //   const files = (event.target as HTMLInputElement).files;
  //   if (files !== null && files.length) {
  //     const file = files[0];
  //     if (/\.json$/.test(file.name)) {
  //       if (selectedTab === derivationGroupTabId) {
  //         parseDerivationGroupInputFileStream(file.stream());
  //       } else if (selectedTab === externalSourceTypeTabId) {
  //         parseExternalSourceTypeInputFileStream(file.stream());
  //       } else if (selectedTab === externalEventTypeTabId) {
  //         parseExternalEventTypeInputFileStream(file.stream());
  //       }
  //     } else {
  //       uploadFilesError = 'Plan file is not a .json file';
  //     }
  //   }
  // }

  function handleCreateNewDerivationGroupEntry() {
    newDerivationGroups = [...newDerivationGroups, { name: '', sourceType: '', valid: false }];

    handleChange();
  }

  function validateDerivationGroupName(value: string): boolean {
    if (value.length <= 0 || $derivationGroups.map(dg => dg.name).includes(value)) {
      return false;
    }
    return true;
  }

  function validateEST(sourceType: {
    metadata: {
      isRequired: boolean | null;
      name: ParameterName | null;
      schema: ValueSchema | null;
    }[];
    name: string;
    valid: boolean;
  }) {
    // TODO: check name not elsewhere in the list of source types to be uploaded at the moment
    if (sourceType.name.length <= 0 || $externalSourceTypes.map(est => est.name).includes(sourceType.name)) {
      return false;
    }
    if (sourceType.metadata.length === 0) {
      return true;
    } else {
      // TODO: check metadata name not elsewhere in the list of source types to be uploaded at the moment
      return sourceType.metadata
        .map(metadataItem => {
          console.log(
            metadataItem.name,
            metadataItem.name !== null && metadataItem.name.length >= 1 && metadataItem.schema !== null,
          );
          return metadataItem.name !== null && metadataItem.name.length >= 1 && metadataItem.schema !== null;
        })
        .reduce((prev, curr) => prev && curr, true);
    }
  }

  function validateEET(eventType: {
    metadata: {
      isRequired: boolean | null;
      name: ParameterName | null;
      schema: ValueSchema | null;
    }[];
    name: string;
    valid: boolean;
  }) {
    // TODO: check name not elsewhere in the list of source types to be uploaded at the moment
    if (eventType.name.length <= 0 || $externalEventTypes.map(eet => eet.name).includes(eventType.name)) {
      return false;
    }
    if (eventType.metadata.length === 0) {
      return true;
    } else {
      // TODO: check metadata name not elsewhere in the list of source types to be uploaded at the moment
      return eventType.metadata
        .map(metadataItem => {
          console.log(
            metadataItem.name,
            metadataItem.name !== null && metadataItem.name.length >= 1 && metadataItem.schema !== null,
          );
          return metadataItem.name !== null && metadataItem.name.length >= 1 && metadataItem.schema !== null;
        })
        .reduce((prev, curr) => prev && curr, true);
    }
  }

  function handleDGChange(value: string, i: number) {
    // update element at i in list
    newDerivationGroups[i].name = value;
    newDerivationGroups = [...newDerivationGroups];

    // clear error stores
    handleChange();
  }

  function handleDGStChange(value: string, i: number) {
    // update element at i in list
    newDerivationGroups[i].sourceType = value;
    newDerivationGroups = [...newDerivationGroups];

    // clear error stores
    handleChange();
  }

  function handleESTChange(value: string, i: number) {
    // update element at i in list
    newExternalSourceTypes[i].name = value;
    newExternalSourceTypes = [...newExternalSourceTypes];

    // clear error stores
    handleChange();
  }

  function handleAddESTMetadata(sourceType: {
    metadata: {
      isRequired: boolean | null;
      name: ParameterName | null;
      schema: ValueSchema | null;
    }[];
    name: string;
    valid: boolean;
  }) {
    sourceType.metadata = [...sourceType.metadata, { isRequired: null, name: null, schema: null }];
    newExternalSourceTypes = [...newExternalSourceTypes];

    handleChange();
  }

  function handleUpdateESTMetadata(
    e: CustomEvent,
    sourceType: {
      metadata: {
        isRequired: boolean | null;
        name: ParameterName | null;
        schema: ValueSchema | null;
      }[];
      name: string;
      valid: boolean;
    },
  ) {
    let index = e.detail.id;
    if (e.detail) {
      if (e.detail.name) {
        sourceType.metadata[index].name = e.detail.name;
      } else if (e.detail.type) {
        sourceType.metadata[index].schema = { type: e.detail.type } as ValueSchema;
      } else if (e.detail.isRequired) {
        sourceType.metadata[index].isRequired = e.detail.isRequired;
      }
    }
    newExternalSourceTypes = [...newExternalSourceTypes];

    handleChange();
  }

  function handleEETChange(value: string, i: number) {
    // update element at i in list
    newExternalEventTypes[i].name = value;
    newExternalEventTypes = [...newExternalEventTypes];

    // clear error stores
    handleChange();
  }

  function handleAddEETMetadata(eventType: {
    metadata: {
      isRequired: boolean | null;
      name: ParameterName | null;
      schema: ValueSchema | null;
    }[];
    name: string;
    valid: boolean;
  }) {
    eventType.metadata = [...eventType.metadata, { isRequired: null, name: null, schema: null }];
    newExternalEventTypes = [...newExternalEventTypes];

    handleChange();
  }

  function handleUpdateEETMetadata(
    e: CustomEvent,
    eventType: {
      metadata: {
        isRequired: boolean | null;
        name: ParameterName | null;
        schema: ValueSchema | null;
      }[];
      name: string;
      valid: boolean;
    },
  ) {
    let index = e.detail.id;
    if (e.detail) {
      if (e.detail.name) {
        eventType.metadata[index].name = e.detail.name;
      } else if (e.detail.type) {
        eventType.metadata[index].schema = { type: e.detail.type } as ValueSchema;
      } else if (e.detail.isRequired) {
        eventType.metadata[index].isRequired = e.detail.isRequired;
      }
    }
    newExternalEventTypes = [...newExternalEventTypes];

    handleChange();
  }
</script>

<Modal height={500} width={600}>
  <ModalHeader on:close>Create Derivation Groups or Types</ModalHeader>
  <ModalContent style="overflow: auto;">
    <div class="creation-modal-container">
      <div class="creation-modal-tabs-container">
        <Tabs class="creation-tabs" tabListClassName="creation-tabs-list" on:select-tab={handleTabChange}>
          <svelte:fragment slot="tab-list">
            <Tab tabId={derivationGroupTabId} class="creation-tab">Derivation Group</Tab>
            <Tab tabId={externalSourceTypeTabId} class="creation-tab">External Source Type</Tab>
            <Tab tabId={externalEventTypeTabId} class="creation-tab">External Event Type</Tab>
          </svelte:fragment>
          <div>
            <AlertError class="m-2" error={creationError} />
            <AlertError class="m-2" error={$createExternalSourceTypeError} />
            <AlertError class="m-2" error={$createExternalEventTypeError} />
            <AlertError class="m-2" error={$createDerivationGroupError} />
          </div>
          <TabPanel>
            <div class="directions">
              <p class="st-typography-body">Provide a name and an external source type for the new derivation group.</p>
              <p class="st-typography-body">
                Alternatively, select a Derivation Group Definition File (JSON) to import.
              </p>
              <a
                href="https://github.com/NASA-AMMOS/aerie-docs/blob/7fde649340d51852329f5b426e82b827b7672bbf/docs/planning/external-events-metadata.md"
                style:font-style="italic"
                class="st-typography-label"
                target="_blank"
                rel="noopener noreferrer"
              >
                What is a Derivation Group Definition File?
              </a>
              <p class="st-typography-label">
                The newly created group will be empty, though you can upload sources into it.
              </p>
              <div class="content">
                <form
                  on:submit|preventDefault={uploadDGs}
                  on:reset={() => {
                    uploadFilesError = null;
                    validationError = null;
                    derivationGroupJSON = null;
                  }}
                  use:permissionHandler={{
                    hasPermission: hasCreateDerivationGroupPermission,
                    permissionError: createDerivationGroupPermissionError,
                  }}
                >
                  <div class="file-upload-field">
                    <fieldset style:flex={1}>
                      <label for="file">Source File</label>
                      <input
                        class="w-100"
                        name="file"
                        type="file"
                        accept="application/json"
                        bind:files={derivationGroupUploadFiles}
                      />
                    </fieldset>
                    <fieldset class="file-upload-fieldset">
                      {#if derivationGroupJSON}
                        <div style="padding-top:12px">
                          <button class="st-button secondary w-100" type="reset">Dismiss</button>
                        </div>
                      {/if}
                      <button disabled={!derivationGroupJSON} class="st-button w-100" type="submit">
                        {'Add Derivation Groups'}
                      </button>
                    </fieldset>
                  </div>
                </form>
              </div>
            </div>
            {#if uploadFilesError}
              <AlertError error={uploadFilesError} />
            {/if}
            {#if validationError}
              <AlertError error={validationError} />
            {/if}

            {#each newDerivationGroups as derivationGroup, i}
              <div
                class="card content"
                class:card-background-added={derivationGroup.valid}
                class:card-background-deleted={!derivationGroup.valid}
                style="padding-left:10px; padding-right: 10px; margin-top:10px"
              >
                <button
                  disabled={newDerivationGroups.length <= 1}
                  style:display="grid"
                  class="st-button icon delete"
                  on:click|stopPropagation={() => {
                    newDerivationGroups = newDerivationGroups.filter((_, index) => index !== i);

                    handleChange();
                  }}
                >
                  <MinusIcon />
                </button>
                <input
                  value={derivationGroup.name}
                  on:blur={e => handleDGChange(e.target.value, i)}
                  autocomplete="off"
                  class="st-input w-50"
                  placeholder="New Derivation Group Name"
                />
                <select
                  value={derivationGroup.sourceType}
                  on:change={e => handleDGStChange(e.target.value, i)}
                  class="st-select w-50"
                >
                  {#each $externalSourceTypes as sourceType}
                    <option value={sourceType.name}>{sourceType.name}</option>
                  {/each}
                </select>
              </div>
            {/each}
            <div class="content parameters">
              <button
                style:display="grid"
                class="st-button icon add-button"
                on:click={handleCreateNewDerivationGroupEntry}
              >
                <PlusIcon />
              </button>
            </div>
          </TabPanel>
          <TabPanel>
            <div class="directions">
              <p class="st-typography-body">Provide a name and an external source type for the new derivation group.</p>
              <p class="st-typography-body">
                Alternatively, select an External Source Type Definition File (JSON) to import.
              </p>
              <a
                href="https://github.com/NASA-AMMOS/aerie-docs/blob/7fde649340d51852329f5b426e82b827b7672bbf/docs/planning/external-events-metadata.md"
                style:font-style="italic"
                class="st-typography-label"
                target="_blank"
                rel="noopener noreferrer"
              >
                What is an External Source Type Definition File?
              </a>
              <p class="st-typography-label">
                The newly created external source type will be empty, though you can upload sources using it.
              </p>
              <div class="content">
                <form
                  on:submit|preventDefault={uploadESTs}
                  on:reset={() => {
                    uploadFilesError = null;
                    validationError = null;
                    externalSourceTypeJSON = null;
                  }}
                  use:permissionHandler={{
                    hasPermission: hasCreateExternalSourceTypePermission,
                    permissionError: createExternalSourceTypePermissionError,
                  }}
                >
                  <div class="file-upload-field">
                    <fieldset style:flex={1}>
                      <label for="file">Source File</label>
                      <input
                        class="w-100"
                        name="file"
                        type="file"
                        accept="application/json"
                        bind:files={externalSourceTypeUploadFiles}
                      />
                    </fieldset>
                    <fieldset class="file-upload-fieldset">
                      {#if externalSourceTypeJSON}
                        <div style="padding-top:12px">
                          <button class="st-button secondary w-100" type="reset">Dismiss</button>
                        </div>
                      {/if}
                      <button disabled={!externalSourceTypeJSON} class="st-button w-100" type="submit">
                        {'Add External Source Types'}
                      </button>
                    </fieldset>
                  </div>
                </form>
              </div>
            </div>
            {#if uploadFilesError}
              <div class="error">{uploadFilesError}</div>
            {/if}
            {#if validationError}
              <AlertError error={validationError} />
            {/if}
            {#each newExternalSourceTypes as sourceType, i}
              <div
                class="card content"
                class:card-background-added={sourceType.valid}
                class:card-background-deleted={!sourceType.valid}
                style="padding-left:10px; padding-right: 10px; margin-top:10px; flex-direction: column"
              >
                <div style="display: flex; flex-direction: row">
                  <button
                    disabled={newExternalSourceTypes.length <= 1}
                    style:display="grid"
                    class="st-button icon delete"
                    on:click|stopPropagation={() => {
                      newExternalSourceTypes = newExternalSourceTypes.filter((_, index) => index !== i);

                      handleChange();
                    }}
                  >
                    <MinusIcon />
                  </button>
                  <input
                    value={sourceType.name}
                    on:blur={e => {
                      handleESTChange(e.target.value, i);
                    }}
                    autocomplete="off"
                    class="st-input w-100"
                    placeholder="New External Source Type Name"
                  />
                  <button
                    style:display="grid"
                    class="st-button icon add-metadata-button"
                    on:click={() => handleAddESTMetadata(sourceType)}
                  >
                    <PlusIcon />
                  </button>
                </div>
                <div class="content" style="flex-direction: column; margin-left: 15px">
                  {#each sourceType.metadata as metadata, metadataIndex}
                    <ParameterEntry
                      id={metadataIndex}
                      value={metadata}
                      newParameterNamePlaceholder="New External Source Type Metadata Name"
                      on:input={e => handleUpdateESTMetadata(e, sourceType)}
                      on:delete={e => {
                        let indexToDelete = e.detail;
                        sourceType.metadata = sourceType.metadata.filter((item, index) => {
                          console.log(item, index, indexToDelete);
                          return index !== indexToDelete;
                        });

                        // force svelte update
                        newExternalSourceTypes = [...newExternalSourceTypes];
                        handleChange();
                      }}
                    />
                  {/each}
                </div>
              </div>
            {/each}
            <div style="content parameters">
              <button
                style:display="grid"
                class="st-button icon add-external-source-type-button"
                on:click={e => {
                  console.log('add type', e);
                  // update element at i in list
                  newExternalSourceTypes = [...newExternalSourceTypes, { metadata: [], name: '', valid: false }];

                  // clear error stores
                  handleChange();
                }}
              >
                <PlusIcon />
              </button>
            </div>
          </TabPanel>
          <TabPanel>
            <div class="directions">
              <p class="st-typography-body">Select an External Event Type Definition File (JSON) to import.</p>
              <p class="st-typography-body">
                Alternatively, select an External Event Type Definition File (JSON) to import.
              </p>
              <a href={'../'} style:font-style="italic" class="st-typography-label" rel="noopener noreferrer"
                >What is an External Event Type Definition File?</a
              >
              <p class="st-typography-label">
                The newly created external event type will be empty, though you can upload events using it.
              </p>
              <div class="content">
                <form
                  on:submit|preventDefault={uploadEETs}
                  on:reset={() => {
                    uploadFilesError = null;
                    validationError = null;
                    externalEventTypeJSON = null;
                  }}
                  use:permissionHandler={{
                    hasPermission: hasCreateExternalEventTypePermission,
                    permissionError: createExternalEventTypePermissionError,
                  }}
                >
                  <div class="file-upload-field">
                    <fieldset style:flex={1}>
                      <label for="file">Source File</label>
                      <input
                        class="w-100"
                        name="file"
                        type="file"
                        accept="application/json"
                        bind:files={externalEventTypeUploadFiles}
                      />
                    </fieldset>
                    <fieldset class="file-upload-fieldset">
                      {#if externalEventTypeJSON}
                        <div style="padding-top:12px">
                          <button class="st-button secondary w-100" type="reset">Dismiss</button>
                        </div>
                      {/if}
                      <button disabled={!externalEventTypeJSON} class="st-button w-100" type="submit">
                        {'Add External Event Types'}
                      </button>
                    </fieldset>
                  </div>
                </form>
              </div>
            </div>
            {#if uploadFilesError}
              <div class="error">{uploadFilesError}</div>
            {/if}
            {#if validationError}
              <AlertError error={validationError} />
            {/if}
            {#each newExternalEventTypes as eventType, i}
              <div
                class="card content"
                class:card-background-added={eventType.valid}
                class:card-background-deleted={!eventType.valid}
                style="padding-left:10px; padding-right: 10px; margin-top:10px; flex-direction: column"
              >
                <div style="display: flex; flex-direction: row">
                  <button
                    disabled={newExternalSourceTypes.length <= 1}
                    style:display="grid"
                    class="st-button icon delete"
                    on:click|stopPropagation={() => {
                      newExternalEventTypes = newExternalEventTypes.filter((_, index) => index !== i);

                      handleChange();
                    }}
                  >
                    <MinusIcon />
                  </button>
                  <input
                    value={eventType.name}
                    on:blur={e => {
                      handleEETChange(e.target.value, i);
                    }}
                    autocomplete="off"
                    class="st-input w-100"
                    placeholder="New External Event Type Name"
                  />
                  <button
                    style:display="grid"
                    class="st-button icon add-metadata-button"
                    on:click={() => handleAddEETMetadata(eventType)}
                  >
                    <PlusIcon />
                  </button>
                </div>
                <div class="content" style="flex-direction: column; margin-left: 15px">
                  {#each eventType.metadata as metadata, metadataIndex}
                    <ParameterEntry
                      id={metadataIndex}
                      value={metadata}
                      newParameterNamePlaceholder="New External Event Type Metadata Name"
                      on:input={e => handleUpdateEETMetadata(e, eventType)}
                      on:delete={e => {
                        let indexToDelete = e.detail;
                        eventType.metadata = eventType.metadata.filter((item, index) => {
                          console.log(item, index, indexToDelete);
                          return index !== indexToDelete;
                        });

                        // force svelte update
                        newExternalEventTypes = [...newExternalEventTypes];
                        handleChange();
                      }}
                    />
                  {/each}
                </div>
              </div>
            {/each}
            <div style="content parameters">
              <button
                style:display="grid"
                class="st-button icon add-external-event-type-button"
                on:click={e => {
                  console.log('add type', e);
                  // update element at i in list
                  newExternalEventTypes = [...newExternalEventTypes, { metadata: [], name: '', valid: false }];

                  // clear error stores
                  handleChange();
                }}
              >
                <PlusIcon />
              </button>
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button
      class="st-button primary"
      type="submit"
      disabled={isCreateDisabled}
      on:click|preventDefault={handleCreation}
      use:permissionHandler={{
        hasPermission: hasCreationPermissionForCurrentTab,
      }}
    >
      Create
    </button>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Close </button>
  </ModalFooter>
</Modal>

<style>
  :global(.tab-list.creation-tabs-list) {
    background-color: var(--st-gray-10);
  }

  :global(button.creation-tab) {
    align-items: center;
    gap: 8px;
    text-align: center;
    width: 33%;
  }

  :global(button.creation-tab:last-of-type) {
    flex: 1;
  }
  :global(button.creation-tab:last-of-type.selected) {
    box-shadow: 1px 0px 0px inset var(--st-gray-20);
  }

  :global(button.creation-tab:first-of-type.selected) {
    box-shadow: -1px 0px 0px inset var(--st-gray-20);
  }

  :global(button.creation-tab:not(.selected)) {
    box-shadow: 0px -1px 0px inset var(--st-gray-20);
  }

  :global(button.creation-tab.selected) {
    background-color: var(--st-gray-20);
    box-shadow:
      1px 0px 0px inset var(--st-gray-20),
      -1px 0px 0px inset var(--st-gray-20);
  }

  .add-button {
    background: var(--st-gray-20);
  }

  .creation-modal-container {
    height: 100%;
    width: 100%;
  }

  .creation-modal-tabs-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    height: 100%;
    justify-content: flex-end;
  }

  .directions {
    padding-bottom: 12px;
    padding-top: 12px;
  }

  .parameters {
    flex-direction: column;
    height: 100%;
    justify-content: flex-start;
  }

  .content {
    display: flex;
    gap: 8px;
    padding-bottom: 12px;
    padding-top: 12px;
  }

  .card {
    background: var(--bg-color, rgba(245, 245, 245, 0.35));
    border: 1px solid var(--border-color, rgba(152, 101, 35, 0.5));
    border-radius: 4px;
    color: var(--st-gray-70);
    cursor: pointer;
    display: flex;
    flex-direction: row;
    text-align: left;
  }

  .card-background-added {
    background: rgb(254, 252, 234);
    display: flex;
  }

  .card-background-deleted {
    background: rgb(254, 234, 234);
    display: flex;
  }

  .file-upload-field {
    display: flex;
    flex-direction: row;
    white-space: nowrap;
  }

  .file-upload-fieldset {
    align-items: flex-end;
    flex-direction: row;
    gap: 4px;
  }
</style>
