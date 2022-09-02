<svelte:options immutable={true} />

<script lang="ts">
  import ArrowClockwiseIcon from 'bootstrap-icons/icons/arrow-clockwise.svg?component';
  import { maxTimeRange, viewTimeRange } from '../../stores/plan';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import Timeline from './Timeline.svelte';
  import TimelineLockControl from './TimelineLockControl.svelte';

  export let gridId: number;
  export let timelineId: number;

  function onResetViewTimeRange() {
    $viewTimeRange = $maxTimeRange;
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Timeline" />
    <PanelHeaderActions>
      <div class="header-actions">
        <button
          class="st-button icon"
          on:click={onResetViewTimeRange}
          use:tooltip={{ content: 'Reset Visible Time Range', placement: 'left' }}
        >
          <ArrowClockwiseIcon />
        </button>
        <TimelineLockControl />
      </div>
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <Timeline {gridId} {timelineId} />
  </svelte:fragment>
</Panel>

<style>
  .header-actions {
    align-items: center;
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .st-button {
    border: 1px solid var(--st-gray-30);
    color: var(--st-gray-70);
  }
</style>
