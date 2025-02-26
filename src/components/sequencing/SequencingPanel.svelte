<svelte:options immutable={true} />

<script lang="ts">
  import type { User } from '../../types/app';
  import type { ViewGridSection } from '../../types/view';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import TabPanel from '../ui/Tabs/TabPanel.svelte';
  import Tabs from '../ui/Tabs/Tabs.svelte';
  import Tab from '../ui/Tabs/Tab.svelte';
  import SequenceFiltersTab from './SequenceFiltersTab.svelte';
  import TemplateExpansionTab from './TemplateExpansionTab.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Sequencing" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <Tabs class="sequencing-items-tabs" tabListClassName="sequencing-items-tabs-list">
      <svelte:fragment slot="tab-list">
        <Tab class="sequencing-items-tab">Sequence Filters</Tab>
        <Tab class="sequencing-items-tab">Template Expansion</Tab>
      </svelte:fragment>
      <TabPanel>
        <SequenceFiltersTab {user} />
      </TabPanel>
      <TabPanel>
        <TemplateExpansionTab {user} />
      </TabPanel>
    </Tabs>
  </svelte:fragment>
</Panel>
