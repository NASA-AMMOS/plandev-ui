<svelte:options immutable={true} />

<script lang="ts">
  import { activityDirectivesMap } from '../../stores/activities';
  import { plan, planTags } from '../../stores/plan';
  import { gqlSubscribable } from '../../stores/subscribable';
  import { tags } from '../../stores/tags';
  import { users } from '../../stores/user';
  import type { User } from '../../types/app';
  import type { PlanSlim } from '../../types/plan';
  import type { ViewGridSection } from '../../types/view';
  import gql from '../../utilities/gql';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import PlanForm from './PlanForm.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  $: userWritablePlans = gqlSubscribable<PlanSlim[] | null>(
    gql.SUB_PLANS_USER_WRITABLE,
    { userId: user?.id },
    null,
    null,
  );
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Plan Metadata" />
  </svelte:fragment>
  <svelte:fragment slot="body">
    <PlanForm
      activityDirectivesMap={$activityDirectivesMap}
      plan={$plan}
      planTags={$planTags}
      tags={$tags}
      {user}
      users={$users}
      userWriteablePlans={$userWritablePlans}
    />
  </svelte:fragment>
</Panel>
