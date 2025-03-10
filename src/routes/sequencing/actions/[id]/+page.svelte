<svelte:options immutable={true} />

<script lang="ts">
  import type { PageData } from '../$types';
  import ActionEditor from '../../../../components/sequencing/actions/ActionEditor.svelte';
  import { actionDefinitions } from '../../../../stores/actions';

  export let data: PageData;

  // TODO pre-fetch in page.ts
  $: actionDefinition = ($actionDefinitions || []).find(d => d.id === data.actionId) ?? null;
</script>

<ActionEditor {actionDefinition} user={data.user} />
