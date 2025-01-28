<svelte:options immutable={true} />

<script lang="ts">
  import ExternalEventIcon from '../../assets/external-event-box-with-arrow.svg?component';
  import DirectiveAndSpanIcon from '../../assets/timeline-directive-and-span.svg?component';
  import TimelineLineLayerIcon from '../../assets/timeline-line-layer.svg?component';
  import type { User } from '../../types/app';
  import type { ViewGridSection } from '../../types/view';
  import ActivityList from '../ActivityList.svelte';
  import ExternalEventTypeList from '../ExternalEventTypeList.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import ResourceList from '../ResourceList.svelte';
  import Panel from '../ui/Panel.svelte';
  import Tab from '../ui/Tabs/Tab.svelte';
  import TabPanel from '../ui/Tabs/TabPanel.svelte';
  import Tabs from '../ui/Tabs/Tabs.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Activity, Resource, Event Types" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <Tabs class="timeline-items-tabs" tabListClassName="timeline-items-tabs-list">
      <svelte:fragment slot="tab-list">
        <Tab class="timeline-items-tab"><DirectiveAndSpanIcon /> Activities</Tab>
        <Tab class="timeline-items-tab"><TimelineLineLayerIcon /> Resources</Tab>
        <Tab class="timeline-items-tab"><ExternalEventIcon /> Events</Tab>
      </svelte:fragment>
      <TabPanel>
        <ActivityList />
      </TabPanel>
      <TabPanel>
        <ResourceList {user} />
      </TabPanel>
      <TabPanel>
        <ExternalEventTypeList />
      </TabPanel>
    </Tabs>
  </svelte:fragment>
</Panel>

<style>
  :global(.tab-list.timeline-items-tabs-list) {
    background-color: var(--st-gray-10);
  }

  :global(button.timeline-items-tab) {
    align-items: center;
    display: flex;
    gap: 8px;
    text-align: left;
  }

  :global(button.timeline-items-tab:last-of-type) {
    flex: 1;
  }

  :global(button.timeline-items-tab:last-of-type.selected) {
    box-shadow: 1px 0px 0px inset var(--st-gray-20);
  }

  :global(button.timeline-items-tab:first-of-type.selected) {
    box-shadow: -1px 0px 0px inset var(--st-gray-20);
  }

  :global(button.timeline-items-tab:not(.selected)) {
    box-shadow: 0px -1px 0px inset var(--st-gray-20);
  }

  :global(.timeline-items-tabs .timeline-items-tabs-list button.timeline-items-tab.selected) {
    background-color: white;
    box-shadow:
      1px 0px 0px inset var(--st-gray-20),
      -1px 0px 0px inset var(--st-gray-20);
  }
</style>
