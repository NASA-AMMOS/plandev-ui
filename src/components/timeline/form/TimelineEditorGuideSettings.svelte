<svelte:options immutable={true} />

<script lang="ts">
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { maxTimeRange } from '../../../stores/plan';
  import { plugins } from '../../../stores/plugins';
  import type { Axis, HorizontalGuide, VerticalGuide } from '../../../types/timeline';
  import { getTarget } from '../../../utilities/generic';
  import { tooltip } from '../../../utilities/tooltip';
  import Input from '../../form/Input.svelte';
  import Menu from '../../menus/Menu.svelte';
  import MenuHeader from '../../menus/MenuHeader.svelte';
  import DatePicker from '../../ui/DatePicker/DatePicker.svelte';
  import InfoTip from '../../ui/InfoTip.svelte';

  export let guide: HorizontalGuide | VerticalGuide;
  /** Only meaningful for a horizontal guide, which has to be bound to one of the row's axes. */
  export let yAxes: Axis[] = [];

  let guideMenu: Menu;

  $: horizontalGuide = guide as HorizontalGuide;
  $: verticalGuide = guide as VerticalGuide;
  $: isHorizontal = 'y' in guide;

  const dispatch = createEventDispatcher<{
    delete: void;
    input: { name: string; value: string | number | null };
  }>();

  function onInput(event: Event) {
    const { name, value } = getTarget(event);
    // An empty or partially typed number reads as NaN. For the band's second bound that is how the
    // operator clears it, turning the guide back into a line, so it is forwarded rather than dropped;
    // the panel removes the field when it sees null.
    if (typeof value === 'number' && !Number.isFinite(value)) {
      dispatch('input', { name, value: null });
      return;
    }
    dispatch('input', { name, value: value as string | number | null });
  }

  function onDateInput(event: CustomEvent, name: string) {
    dispatch('input', { name, value: event.detail.value ?? null });
  }
</script>

<div style="position: relative;">
  <button
    class="st-button icon timeline-editor-guide-settings"
    use:tooltip={{ content: 'Guide Settings', placement: 'top' }}
    style="position: relative"
    on:click|stopPropagation={() => {
      guideMenu.toggle();
    }}
  >
    <div class="button-inner"><SettingsIcon /></div>
  </button>
  <Menu allowOverflow bind:this={guideMenu} hideAfterClick={false} placement="bottom-end" width={300}>
    <MenuHeader title={`${isHorizontal ? 'Horizontal' : 'Vertical'} Guide Settings`} />
    <div class="body st-typography-body">
      {#if isHorizontal}
        <Input layout="inline">
          <label for="y">Y Value</label>
          <input class="st-input w-full" id="y" name="y" type="number" value={horizontalGuide.y} on:input={onInput} />
        </Input>
        <Input layout="inline">
          <div class="guide-label">
            <label for="y2">To Y</label>
            <InfoTip
              content="Shades a band between Y Value and this. Leave it empty for a single line. The order of the two does not matter."
            />
          </div>
          <input
            class="st-input w-full"
            id="y2"
            name="y2"
            placeholder="Line"
            type="number"
            value={horizontalGuide.y2 ?? ''}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <label for="yAxisId">Y Axis</label>
          <select class="st-select w-full" data-type="number" id="yAxisId" name="yAxisId" on:input={onInput}>
            {#each yAxes as axis}
              <option value={axis.id} selected={horizontalGuide.yAxisId === axis.id}>
                {axis.label.text}
              </option>
            {/each}
          </select>
        </Input>
      {:else}
        <Input layout="stacked">
          <label for="timestamp">Date ({$plugins.time.primary.label})</label>
          <DatePicker
            name="timestamp"
            minDate={new Date($maxTimeRange.start)}
            maxDate={new Date($maxTimeRange.end)}
            dateString={verticalGuide.timestamp}
            on:change={event => onDateInput(event, 'timestamp')}
            on:keydown={event => onDateInput(event, 'timestamp')}
          />
        </Input>
        <Input layout="stacked">
          <div class="guide-label">
            <label for="timestamp2">To Date</label>
            <InfoTip
              content="Shades a time region across every row, between Date and this. Leave it empty for a single line. The order of the two does not matter."
            />
          </div>
          <DatePicker
            name="timestamp2"
            minDate={new Date($maxTimeRange.start)}
            maxDate={new Date($maxTimeRange.end)}
            dateString={verticalGuide.timestamp2 ?? ''}
            on:change={event => onDateInput(event, 'timestamp2')}
            on:keydown={event => onDateInput(event, 'timestamp2')}
          />
        </Input>
      {/if}
      <Input layout="inline">
        <label for="id">Guide ID</label>
        <input class="st-input w-full" name="id" type="number" value={guide.id} disabled />
      </Input>
      <button class="st-button secondary w-full" style="position: relative" on:click={() => dispatch('delete')}
        >Delete Guide</button
      >
    </div>
  </Menu>
</div>

<style>
  .button-inner {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    position: relative;
    width: 100%;
    z-index: 1;
  }

  .body {
    cursor: auto;
    display: grid;
    gap: 8px;
    /* Scrolls internally rather than growing past the window, matching the layer settings menu */
    max-height: 60vh;
    overflow: auto;
    padding: 8px;
    text-align: left;
  }

  .body :global(.input-inline) {
    padding: 0;
  }

  .guide-label {
    align-items: center;
    display: flex;
    gap: 4px;
    min-width: 0;
  }
</style>
