<svelte:options immutable={true} />

<script lang="ts">
  import SequenceForm from '../../../components/sequencing/SequenceForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<SequenceForm mode="create" user={data.user} />
