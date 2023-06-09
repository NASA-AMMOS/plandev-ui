<svelte:options immutable={true} />

<script lang="ts">
  import ExpansionRuleForm from '../../../../components/expansion/ExpansionRuleForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ExpansionRuleForm mode="create" user={data.user} />
