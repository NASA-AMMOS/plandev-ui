<svelte:options immutable={true} />

<script lang="ts">
  import DownloadIcon from 'bootstrap-icons/icons/download.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { SEQUENCE_EXPANSION_MODE } from '../../../constants/command-expansion';
  import { SequencingMode } from '../../../enums/sequencing';
  import { expandedTemplates } from '../../../stores/sequence-template';
  import type { User } from '../../../types/app';
  import type { ExpansionSequence } from '../../../types/expansion';
  import effects from '../../../utilities/effects';
  import { downloadBlob, downloadJSON } from '../../../utilities/generic';
  import MonacoEditor from '../../ui/MonacoEditor.svelte';
  import StellarDialog from './StellarDialog.svelte';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  export let open: boolean = true;
  export let expansionSequence: ExpansionSequence;
  export let user: User | null;

  let outputStr: string | null = null;
  let language: string = 'plaintext';

  $: if (SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING) {
    const expandedTemplate = $expandedTemplates.find(
      expandedTemplate => expandedTemplate.seq_id === expansionSequence.seq_id,
    );
    outputStr = expandedTemplate?.expanded_template ?? `No output found for sequence "${expansionSequence.seq_id}"'`;
  } else {
    effects
      .getExpansionSequenceSeqJson(expansionSequence.seq_id, expansionSequence.simulation_dataset_id, user)
      .then((result: string | null) => (outputStr = result));
    language = 'json';
  }

  function onDownload() {
    if (SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING) {
      downloadBlob(
        new Blob([outputStr ?? `No output found for sequence "${expansionSequence.seq_id}"'`], { type: 'text/pain' }),
        `${expansionSequence.seq_id}_${expansionSequence.simulation_dataset_id}.txt`,
      );
    } else {
      downloadJSON(
        JSON.parse(outputStr ?? `No output found for sequence "${expansionSequence.seq_id}"'`),
        `${expansionSequence.seq_id}_${expansionSequence.simulation_dataset_id}.json`,
      );
    }
  }

  function handleClose() {
    open = false;
  }
</script>

<StellarDialog bind:open size="auto" className="w-[600px] h-[400px]" title="Sequence ID: {expansionSequence.seq_id}" on:close>
  <div class="h-full py-2" style:height="300px">
    <MonacoEditor
      automaticLayout={true}
      {language}
      lineNumbers="on"
      minimap={{ enabled: false }}
      readOnly={true}
      scrollBeyondLastLine={false}
      tabSize={2}
      value={outputStr}
    />
  </div>
  <svelte:fragment slot="footer">
    <div class="flex w-full justify-end gap-2">
      <button class="st-button secondary download-btn" on:click={onDownload}><DownloadIcon /> Download</button>
      <button class="st-button" on:click={handleClose}>Close</button>
    </div>
  </svelte:fragment>
</StellarDialog>

<style>
  .download-btn {
    gap: 4px;
  }
</style>
