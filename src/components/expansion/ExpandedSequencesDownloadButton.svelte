<svelte:options immutable={true} />

<script lang="ts">
  import JSZip from 'jszip';
  import type { ExpandedSequence } from '../../types/expansion';

  export let expandedSequences: ExpandedSequence[] = [];
  export let filename: string = 'expanded_sequences';

  async function downloadAllSeqJson() {
    const zip = new JSZip();

    expandedSequences.forEach(sequence => {
      const seqJson = JSON.stringify(sequence.expanded_sequence, null, 2);
      zip.file(`${sequence.seq_id}.json`, seqJson);
    });

    const zippedSeqJson = await zip.generateAsync({ type: 'blob' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(zippedSeqJson);
    a.download = filename;
    a.click();
  }
</script>

<button class="st-button secondary ellipsis" on:click={downloadAllSeqJson}>Download All</button>
