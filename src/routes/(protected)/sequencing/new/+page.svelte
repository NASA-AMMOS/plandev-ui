<svelte:options immutable={true} />

<script lang="ts">
  import SequenceForm from '../../../../components/sequencing/SequenceForm.svelte';
  import { userStore } from '../../../../lib/stores/auth';
</script>

<SequenceForm mode="create" user={$userStore} />
