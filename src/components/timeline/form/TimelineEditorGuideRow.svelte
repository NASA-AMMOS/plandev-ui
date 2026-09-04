<svelte:options immutable={true} />

<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { ViewLineLayerColorPresets } from '../../../constants/view';
  import { maxTimeRange, viewTimeRange } from '../../../stores/plan';
  import { plugins } from '../../../stores/plugins';
  import type { PluginTime } from '../../../types/plugin';
  import type { Axis, ComputedAxis, HorizontalGuide, VerticalGuide } from '../../../types/timeline';
  import { getTarget } from '../../../utilities/generic';
  import { formatDate, getDoyTime, getUnixEpochTime } from '../../../utilities/time';
  import { formatBandDuration } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import ColorPresetsPicker from '../../form/ColorPresetsPicker.svelte';
  import DatePicker from '../../ui/DatePicker/DatePicker.svelte';
  import TimelineEditorOptionButtons from './TimelineEditorOptionButtons.svelte';

  export let guide: HorizontalGuide | VerticalGuide;
  /** Only meaningful for a horizontal guide, which has to be bound to one of the row's axes. */
  export let yAxes: (Axis | ComputedAxis)[] = [];

  /** Fallback band span when there is nothing to derive one from, and the floor for a derived one. */
  const MIN_SEED_DURATION_MS = 3600000;
  const SEED_FRACTION = 0.1;

  let open: boolean = false;

  $: horizontalGuide = guide as HorizontalGuide;
  $: verticalGuide = guide as VerticalGuide;
  $: isHorizontal = 'y' in guide;
  $: isRange = isHorizontal ? horizontalGuide.y2 !== undefined : verticalGuide.timestamp2 !== undefined;
  // The formatter is passed in rather than read inside getSummary, so switching the plugin's primary
  // time format re-renders the rows -- Svelte does not track what a function body reads
  $: summary = getSummary(guide, isHorizontal, isRange, $plugins.time.primary.format);

  const dispatch = createEventDispatcher<{
    delete: void;
    input: { name: string; value: string | number | null };
  }>();

  /**
   * What the collapsed row shows in place of the guide's fields: the anchor value, and for a band the
   * same reading its own canvas cap carries -- a duration for a time region, a low-to-high extent for a
   * value band. Deliberately the same phrasing as the render, so the row and the thing it describes are
   * recognizably about each other.
   *
   * A time is rendered through the plugin's primary format, the same one the guide's own label on the
   * canvas uses. Reading the stored DOY string directly was quietly assuming DOY is what the operator
   * has configured, which would show one instant two different ways on a mission that has not.
   */
  function getSummary(
    guide: HorizontalGuide | VerticalGuide,
    isHorizontal: boolean,
    isRange: boolean,
    format: PluginTime['format'],
  ): string {
    if (isHorizontal) {
      const { y, y2 } = guide as HorizontalGuide;
      if (!isRange) {
        return `${y}`;
      }
      const [low, high] = [y, y2 as number].sort((a, b) => a - b);
      return `${low}–${high}`;
    }
    const { timestamp, timestamp2 } = guide as VerticalGuide;
    const anchorMs = getUnixEpochTime(timestamp);
    // Whatever the formatter returns, in full. An earlier version stripped a leading year to buy width,
    // on the reasoning that every guide in a plan shares it. That reasoning was about telling rows
    // apart, which is not the only thing this line does -- in DOY it left `215T14:30:00`, which does not
    // read as a date. It was also a regex guess at a mission-supplied format, so what it removed varied
    // by plugin. The width it saved is one row's label input giving up a few characters.
    const anchor = formatDate(new Date(anchorMs), format);
    if (!isRange) {
      return anchor;
    }
    return `${anchor} · ${formatBandDuration(getUnixEpochTime(timestamp2 as string) - anchorMs)}`;
  }

  /** Where a band's second bound lands when a line is promoted to one, so it is visible immediately. */
  function seedHorizontalBound(guide: HorizontalGuide, yAxes: (Axis | ComputedAxis)[]): number {
    const domain = (yAxes.find(axis => axis.id === guide.yAxisId) as ComputedAxis | undefined)?.scaleDomain;
    const span = domain && domain.length === 2 ? Math.abs(Number(domain[1]) - Number(domain[0])) : 0;
    return guide.y + (span > 0 ? span * SEED_FRACTION : 1);
  }

  function seedVerticalBound(guide: VerticalGuide): string {
    const span = Math.abs($viewTimeRange.end - $viewTimeRange.start) * SEED_FRACTION;
    const end = getUnixEpochTime(guide.timestamp) + Math.max(MIN_SEED_DURATION_MS, span);
    return getDoyTime(new Date(Math.min(end, $maxTimeRange.end)));
  }

  /**
   * Line to band and back. A band is not a separate kind of guide, only one carrying a second bound, so
   * the switch is that field arriving or being removed -- and removing it is why the panel treats a
   * null as "delete the field". Re-picking the mode already set is a no-op rather than a reseed, so
   * clicking Band twice does not throw away an edited bound.
   */
  function onSetMode(mode: string) {
    const wantRange = mode === 'range';
    if (wantRange === isRange) {
      return;
    }
    if (isHorizontal) {
      dispatch('input', { name: 'y2', value: wantRange ? seedHorizontalBound(horizontalGuide, yAxes) : null });
    } else {
      dispatch('input', { name: 'timestamp2', value: wantRange ? seedVerticalBound(verticalGuide) : null });
    }
  }

  function onInput(event: Event) {
    const { name, value } = getTarget(event);
    // An empty or partially typed number reads as NaN. For a band's second bound that is how an
    // operator clears it back to a line, so it is forwarded rather than dropped.
    if (typeof value === 'number' && !Number.isFinite(value)) {
      dispatch('input', { name, value: null });
      return;
    }
    dispatch('input', { name, value: value as string | number | null });
  }

  function onDateInput(event: CustomEvent, name: string) {
    dispatch('input', { name, value: event.detail.value ?? null });
  }

  function onLabelInput(event: Event) {
    const { value } = getTarget(event);
    dispatch('input', { name: 'labelText', value: value?.toString() ?? '' });
  }
</script>

<div class="guide-row" class:open>
  <div class="guide-summary">
    <!--
      The caret is the toggle, rather than the whole row being one. The row is not an empty header: it
      holds a text input and a delete button, so a click-anywhere row leaves only a thin strip that
      actually toggles, and its hover highlight fought with the label input's own. It was also a
      role="button" wrapping a textbox and two buttons, which is not a thing a screen reader can make
      sense of.
    -->
    <button
      class="guide-caret"
      class:open
      aria-expanded={open}
      aria-label={open ? 'Collapse guide' : 'Expand guide'}
      on:click={() => (open = !open)}
    >
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.7">
        <path d="M1 3l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <ColorPresetsPicker
      placement="bottom-start"
      presetColors={ViewLineLayerColorPresets}
      tooltipText="Guide Color"
      type="input"
      value={guide.label.color ?? ''}
      on:input={({ detail }) => dispatch('input', { name: 'labelColor', value: detail.value })}
    />
    <input
      autocomplete="off"
      class="st-input guide-label-input"
      name="text"
      placeholder="Label"
      spellcheck="false"
      title={guide.label.text}
      value={guide.label.text}
      on:input={onLabelInput}
    />
    <span class="guide-summary-value">{summary}</span>
    <button
      class="st-button icon guide-remove"
      aria-label="Delete Guide"
      use:tooltip={{ content: 'Delete Guide', placement: 'top' }}
      on:click={() => dispatch('delete')}
    >
      <CloseIcon />
    </button>
  </div>

  {#if open}
    <div class="guide-editor">
      <div class="guide-editor-mode">
        <TimelineEditorOptionButtons
          options={[
            { id: 'line', label: 'Line' },
            { id: 'range', label: isHorizontal ? 'Band' : 'Range' },
          ]}
          selectedId={isRange ? 'range' : 'line'}
          on:change={({ detail }) => onSetMode(detail.id)}
        />
      </div>
      {#if isHorizontal}
        <input
          aria-label="Y Value"
          class="st-input guide-editor-value"
          name="y"
          type="number"
          value={horizontalGuide.y}
          on:input={onInput}
        />
        {#if isRange}
          <input
            aria-label="To Y"
            class="st-input guide-editor-value"
            name="y2"
            type="number"
            value={horizontalGuide.y2}
            on:input={onInput}
          />
        {/if}
        {#if yAxes.length > 1}
          <!-- Only worth the width when there is a choice to make; with one axis the guide is already
               on it. -->
          <select
            aria-label="Y Axis"
            class="st-select guide-editor-axis"
            data-type="number"
            name="yAxisId"
            on:input={onInput}
          >
            {#each yAxes as axis}
              <option value={axis.id} selected={horizontalGuide.yAxisId === axis.id}>{axis.label.text}</option>
            {/each}
          </select>
        {/if}
      {:else}
        <div class="guide-editor-date">
          <DatePicker
            name="timestamp"
            dateString={verticalGuide.timestamp}
            maxDate={new Date($maxTimeRange.end)}
            minDate={new Date($maxTimeRange.start)}
            on:change={event => onDateInput(event, 'timestamp')}
            on:keydown={event => onDateInput(event, 'timestamp')}
          />
        </div>
        {#if isRange}
          <div class="guide-editor-date">
            <DatePicker
              name="timestamp2"
              dateString={verticalGuide.timestamp2 ?? ''}
              maxDate={new Date($maxTimeRange.end)}
              minDate={new Date($maxTimeRange.start)}
              on:change={event => onDateInput(event, 'timestamp2')}
              on:keydown={event => onDateInput(event, 'timestamp2')}
            />
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .guide-row {
    border-bottom: 1px solid var(--st-gray-15);
  }

  .guide-summary {
    align-items: center;
    display: flex;
    gap: 6px;
    height: 30px;
    margin: 2px 0px;
    padding: 0 6px;
  }

  .guide-caret {
    align-items: center;
    background: none;
    border: 0;
    border-radius: 3px;
    color: var(--st-gray-50);
    cursor: pointer;
    display: flex;
    flex: 0 0 18px;
    height: 20px;
    justify-content: center;
    padding: 0;
    width: 18px;
  }

  .guide-caret:hover {
    background: var(--st-gray-20);
    color: var(--st-gray-70);
  }

  .guide-caret svg {
    transform: rotate(-90deg);
    transition: transform 0.12s ease;
  }

  .guide-caret.open svg {
    transform: rotate(0deg);
  }

  /* Layout only -- st-input carries the appearance, so a guide's name field is the same control as
     every other text field in the panel. It was chromeless until hovered, which read as quieter but
     made it the one input here that did not look like one. */
  .guide-label-input {
    flex: 1;
    min-width: 0;
  }

  /* Inter at 11px, not the 10px monospace this started as. Measured against the same summary the two
     come out the same width -- 157px to 156px -- so the monospace was costing a point of size for
     nothing. It was not buying alignment either: the summaries do not form a column, since each one
     starts wherever its row's label input happens to end. It was also the only monospace in the app.
     `tabular-nums` keeps the one thing it did give, digits of even width, so a duration ticking over
     while a guide is dragged does not resize the row under the pointer. */
  .guide-summary-value {
    color: var(--st-gray-60);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .guide-remove {
    color: var(--st-gray-50);
  }

  .guide-editor {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 6px 8px 26px;
  }

  .guide-editor-mode {
    flex: 0 0 100%;
  }

  .guide-editor-value {
    flex: 1 1 64px;
    min-width: 0;
  }

  .guide-editor-axis {
    flex: 1 1 88px;
    min-width: 0;
  }

  /* Basis chosen so a range's two dates share one line: at the row's full width they land at 140px
     each, and a DOY timestamp needs 131px of that. The UTC hint that used to sit on this line was what
     made them wrap -- the fields themselves were never the problem. */
  .guide-editor-date {
    flex: 1 1 128px;
    min-width: 0;
  }
</style>
