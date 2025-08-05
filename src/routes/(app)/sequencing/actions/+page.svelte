<svelte:options immutable={true} />

<script lang="ts">
  import Actions from '../../../../components/sequencing/actions/Actions.svelte';
  import { userStore } from '../../../../lib/stores/auth';
</script>

<Actions user={$userStore} />
