<svelte:options immutable={true} />

<script lang="ts">
  import { plan, planTags } from '../../stores/plan';
  import { tags } from '../../stores/tags';
  import type { User } from '../../types/app';
  import type { ViewGridSection } from '../../types/view';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import PlanForm from './PlanForm.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Plan Management" />
  </svelte:fragment>
  <svelte:fragment slot="body">
    <PlanForm plan={$plan} planTags={$planTags} tags={$tags} {user} />
  </svelte:fragment>
</Panel>
