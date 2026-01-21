<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Constraints from '../../components/constraints/Constraints.svelte';
  import { getUserStore } from '../../stores/user';

  const user = getUserStore();
</script>

<PageTitle title="Constraints" />

<Constraints user={$user} />
