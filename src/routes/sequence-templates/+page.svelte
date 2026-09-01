<svelte:options immutable={true} />

<script lang="ts">
  import { onDestroy } from 'svelte';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import SequenceTemplates from '../../components/sequence-templates/SequenceTemplates.svelte';
  import { resetSequenceTemplateStores } from '../../stores/sequence-template';
  import { getUserStore } from '../../stores/user';

  const user = getUserStore();

  onDestroy(() => {
    resetSequenceTemplateStores();
  });
</script>

<PageTitle title="Sequence Templates" />

<SequenceTemplates user={$user} />
