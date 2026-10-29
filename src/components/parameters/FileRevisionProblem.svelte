<svelte:options immutable={true} />

<script lang="ts">
  import { getUserStore } from '../../stores/user';
  import type { FileRef } from '../../types/actions';
  import { getFileRefRevisionLabel, getRevisionProblem } from '../../utilities/actions';
  import { getFileRevisionHistory } from '../../utilities/fileRevisionHistory';

  /** Says why a file's selected revision can't be run, once its revisions have loaded, and lets the user check again. */
  export let fileRef: FileRef;

  const history = getFileRevisionHistory();
  const user = getUserStore();

  $: problem = getRevisionProblem(fileRef, $history);
</script>

{#if problem && problem !== 'loading'}
  <p class="basis-full text-xs text-destructive" role="alert">
    {#if problem === 'empty'}
      No revisions available. Create a revision before running.
    {:else if problem === 'missing'}
      {getFileRefRevisionLabel(fileRef)} not found.
    {:else}
      Couldn't load revisions.
    {/if}
    <button class="underline" on:click={() => history.load(fileRef.path, $user, true)}>
      {problem === 'error' ? 'Retry' : 'Refresh'}
    </button>
  </p>
{/if}
