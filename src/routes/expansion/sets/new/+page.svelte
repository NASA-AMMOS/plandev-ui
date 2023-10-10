<svelte:options immutable={true} />

<script lang="ts">
  import ExpansionSetForm from '../../../../components/expansion/ExpansionSetForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ExpansionSetForm mode="create" user={data.user} plans={data.initialPlans} />
