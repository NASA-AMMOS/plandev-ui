<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import Constraints from '../../../components/constraints/Constraints.svelte';
  import { userStore } from '../../../lib/stores/auth';
</script>

<PageTitle title="Constraints" />

<Constraints user={$userStore} />
