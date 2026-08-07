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
  import { formatBandDuration } from '../../../utilities/timeline';
  import { formatDate, getDoyTime, getUnixEpochTime } from '../../../utilities/time';
  import { tooltip } from '../../../utilities/tooltip';
  import ColorPresetsPicker from '../../form/ColorPresetsPicker.svelte';
  import TimelineEditorOptionButtons from './TimelineEditorOptionButtons.svelte';
  import DatePicker from '../../ui/DatePicker/DatePicker.svelte';

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
  $: glyphColor = guide.label.color || 'currentColor';

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
    // A leading year is dropped where the chosen format has one, since every guide in a plan shares it
    // and it is the one part that never tells two rows apart. Left alone by any format without one.
    const compact = formatDate(new Date(anchorMs), format).replace(/^\d{4}-/, '');
    if (!isRange) {
      return compact;
    }
    return `${compact} · ${formatBandDuration(getUnixEpochTime(timestamp2 as string) - anchorMs)}`;
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

  // Only when the row itself has focus. The label input and the buttons inside it handle their own
  // keys, and swallowing Space there would stop an operator typing a guide name with a space in it.
  function onSummaryKeydown(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open = !open;
    }
  }
</script>

<div class="guide-row" class:open>
  <div
    class="guide-summary"
    role="button"
    tabindex="0"
    aria-expanded={open}
    on:click={() => (open = !open)}
    on:keydown={onSummaryKeydown}
  >
    <!-- A caret says the row opens and nothing else, which is the whole job. Making the type indicator
         double as the type switch put a control that changes the guide in the one place a click was
         already reserved for expanding it. -->
    <span class="guide-caret" class:open>
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.7">
        <path d="M1 3l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
    <span class="guide-dot" style:background-color={glyphColor} />
    <input
      autocomplete="off"
      class="guide-label-input"
      name="text"
      placeholder="Label"
      spellcheck="false"
      value={guide.label.text}
      on:click|stopPropagation
      on:input={onLabelInput}
    />
    <span class="guide-summary-value">{summary}</span>
    <button
      class="guide-remove"
      aria-label="Delete Guide"
      use:tooltip={{ content: 'Delete Guide', placement: 'top' }}
      on:click|stopPropagation={() => dispatch('delete')}
    >
      <CloseIcon />
    </button>
  </div>

  {#if open}
    <!-- One wrapping line rather than a stacked panel of captioned fields. At ten guides the stacked
         version cost more vertical space per open guide than the whole collapsed list. -->
    <div class="guide-editor">
      <!-- Says outright what the two modes are and which one is on. A band is still just a guide
           carrying a second bound, so switching to Line drops that field and switching to Band seeds
           it -- see onSetMode. -->
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
        <span class="guide-editor-hint st-typography-label">{$plugins.time.primary.label}</span>
      {/if}
      <ColorPresetsPicker
        presetColors={ViewLineLayerColorPresets}
        tooltipText="Guide Color"
        type="input"
        value={guide.label.color ?? ''}
        on:input={({ detail }) => dispatch('input', { name: 'labelColor', value: detail.value })}
      />
    </div>
  {/if}
</div>

<style>
  .guide-row {
    border-bottom: 1px solid var(--st-gray-15);
  }

  .guide-summary {
    align-items: center;
    cursor: pointer;
    display: flex;
    gap: 6px;
    height: 30px;
    padding: 0 2px;
  }

  .guide-summary:hover {
    background: var(--st-gray-10);
  }

  /* Points right when closed and down when open, the one thing it is there to say. */
  .guide-caret {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
    flex: 0 0 12px;
    justify-content: center;
    transform: rotate(-90deg);
    transition: transform 0.12s ease;
  }

  .guide-caret.open {
    transform: rotate(0deg);
  }

  /* The guide's color, so a row can be matched to its line without opening it. Not a control -- the
     picker lives in the expansion, where the rest of the guide's settings are. */
  .guide-dot {
    border-radius: 2px;
    flex: 0 0 4px;
    height: 12px;
    width: 4px;
  }

  /* Chromeless until pointed at, so a list of guides reads as names rather than as a stack of inputs */
  .guide-label-input {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    flex: 1;
    min-width: 0;
    padding: 3px 4px;
  }

  .guide-label-input:hover {
    background: var(--st-white);
    border-color: var(--st-gray-20);
  }

  .guide-label-input:focus {
    background: var(--st-white);
    border-color: var(--st-utility-blue);
    outline: none;
  }

  .guide-summary-value {
    color: var(--st-gray-60);
    font-family: 'JetBrains mono', monospace;
    font-size: 10px;
    white-space: nowrap;
  }

  /* Faded rather than hidden on a row nobody is pointing at, so a quiet list stays quiet. Opacity
     specifically, not visibility: a hidden button leaves the accessibility tree, so a screen reader
     would have found no way to delete a guide at all. It also keeps holding its width either way, or
     every row would twitch as the pointer crossed it. */
  .guide-remove {
    align-items: center;
    background: none;
    border: 0;
    border-radius: 4px;
    color: var(--st-gray-50);
    cursor: pointer;
    display: flex;
    flex: 0 0 20px;
    height: 20px;
    justify-content: center;
    opacity: 0;
    padding: 0;
    width: 20px;
  }

  .guide-summary:hover .guide-remove,
  .guide-row.open .guide-remove,
  .guide-remove:focus-visible {
    opacity: 1;
  }

  .guide-remove:hover {
    background: var(--st-red-10, #fbe9e9);
    color: var(--st-red-50, #c0393e);
  }

  .guide-editor {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 2px 8px 22px;
  }

  /* Its own line above the values, so the fields below it are read as belonging to the chosen mode
     rather than competing with it for the wrapping line. */
  .guide-editor-mode {
    flex: 0 0 100%;
    max-width: 132px;
  }

  .guide-editor-value {
    flex: 1 1 64px;
    min-width: 0;
  }

  .guide-editor-axis {
    flex: 1 1 88px;
    min-width: 0;
  }

  .guide-editor-date {
    flex: 1 1 160px;
    min-width: 0;
  }

  .guide-editor-hint {
    color: var(--st-gray-50);
  }
</style>
