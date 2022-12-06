<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Sequences from '../../components/sequencing/Sequences.svelte';
</script>

<PageTitle title="Sequencing" />

<Sequences />
