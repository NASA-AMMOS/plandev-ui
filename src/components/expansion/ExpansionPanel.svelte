<svelte:options immutable={true} />

<script lang="ts">
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SequencingMode } from '../../enums/sequencing';
  import { planExpansionStatus, selectedExpansionSetId } from '../../stores/expansion';
  import { plan, planReadOnly } from '../../stores/plan';
  import { selectedParcel, selectedSequence, sequenceExpansionMode } from '../../stores/sequencing';
  import { simulationDatasetId, simulationDatasetLatest } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import GridMenu from '../menus/GridMenu.svelte';
  import SequencesTab from '../sequencing/SequencesTab.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import Tab from '../ui/Tabs/Tab.svelte';
  import TabPanel from '../ui/Tabs/TabPanel.svelte';
  import Tabs from '../ui/Tabs/Tabs.svelte';
  import ExpansionTab from './ExpansionTab.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  let hasLegacyExpandPermission: boolean = false;
  let hasTemplatingPermission: boolean = false;

  $: if (user !== null && $plan !== null) {
    hasLegacyExpandPermission =
      featurePermissions.expansionSequences.canExpand(user, $plan, $plan.model) && !$planReadOnly;
    hasTemplatingPermission = featurePermissions.sequenceTemplate.canTemplate(user, $plan, $plan.model);
  }

  async function onHandleExpansion() {
    if ($sequenceExpansionMode === SequencingMode.LEGACY) {
      if ($selectedExpansionSetId != null && $plan) {
        effects.expand($selectedExpansionSetId, $simulationDatasetLatest?.id || -1, $plan, $plan.model, user);
      }
    } else if ($sequenceExpansionMode === SequencingMode.TEMPLATING) {
      if (
        $selectedSequence !== null &&
        $selectedParcel !== null &&
        $plan !== null &&
        $simulationDatasetLatest !== null
      ) {
        // TODO: Support sending multiple sequences
        effects.expandTemplates(
          [$selectedSequence],
          $simulationDatasetLatest.dataset_id,
          $plan.model_id,
          $selectedParcel,
          user,
        );
      }
    }
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Sequencing" />
    <PanelHeaderActions status={$planExpansionStatus} indeterminate>
      <PanelHeaderActionButton
        title="Expand"
        showLabel
        disabled={$sequenceExpansionMode === SequencingMode.LEGACY
          ? $selectedExpansionSetId === null
          : $selectedSequence === null || $selectedParcel === null || $simulationDatasetId === null}
        use={[
          [
            permissionHandler,
            {
              hasPermission:
                $sequenceExpansionMode === SequencingMode.LEGACY ? hasLegacyExpandPermission : hasTemplatingPermission,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to expand sequences',
            },
          ],
        ]}
        on:click={() => onHandleExpansion()}
      />
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <Tabs class="sequencing-items-tabs" tabListClassName="sequencing-items-tabs-list">
      <svelte:fragment slot="tab-list">
        <Tab class="sequencing-items-tab">Sequence Filters</Tab>
        <Tab class="sequencing-items-tab">Template Expansion</Tab>
      </svelte:fragment>
      <TabPanel>
        <SequencesTab {user} />
      </TabPanel>
      <TabPanel>
        <ExpansionTab {user} />
      </TabPanel>
    </Tabs>
  </svelte:fragment>
</Panel>
