<svelte:options immutable={true} />

<script lang="ts">
  import { activityDirectivesMap } from '../../stores/activities';
  import { plan, planImportRequest, planIsLocked, planMetadata, planReadOnly, planTags } from '../../stores/plan';
  import { simulationDatasetId } from '../../stores/simulation';
  import { gqlSubscribable } from '../../stores/subscribable';
  import { tags } from '../../stores/tags';
  import { initialUsersLoading, users } from '../../stores/user';
  import type { User } from '../../types/app';
  import type { PlanSlim } from '../../types/plan';
  import type { ViewGridSection } from '../../types/view';
  import gql from '../../utilities/gql';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import PlanForm from './PlanForm.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  $: userWritablePlans = gqlSubscribable<PlanSlim[] | null>(gql.SUB_PLANS_USER_WRITABLE, { userId: user?.id }, null);
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Plan Metadata" />
  </svelte:fragment>
  <svelte:fragment slot="body">
    <PlanForm
      isReadOnly={$planReadOnly}
      isLocked={$planIsLocked}
      importInProgress={!!$planImportRequest}
      on:namechange={({ detail: name }) => planMetadata.updateValue(pm => (pm ? { ...pm, name } : null))}
      on:modelchange={() => ($simulationDatasetId = -1)}
      activityDirectivesMap={$activityDirectivesMap}
      plan={$plan}
      planTags={$planTags}
      tags={$tags}
      {user}
      users={$users}
      usersLoading={$initialUsersLoading}
      userWriteablePlans={$userWritablePlans}
    />
  </svelte:fragment>
</Panel>
