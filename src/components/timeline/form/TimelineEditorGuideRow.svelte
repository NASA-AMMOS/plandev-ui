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
    <!-- The swatch is both the indicator and the control, so the row shows which line on the canvas it
         is and changes it in one place. It was a read-only dot with the picker buried in the
         expansion, which meant opening a row just to recolor it. Sized to the caret beside it. -->
    <ColorPresetsPicker
      placement="bottom-start"
      presetColors={ViewLineLayerColorPresets}
      size={16}
      tooltipText="Guide Color"
      type="input"
      value={guide.label.color ?? ''}
      on:input={({ detail }) => dispatch('input', { name: 'labelColor', value: detail.value })}
    />
    <input
      autocomplete="off"
      class="guide-label-input"
      name="text"
      placeholder="Label"
      spellcheck="false"
      value={guide.label.text}
      on:input={onLabelInput}
    />
    <span class="guide-summary-value">{summary}</span>
    <button
      class="guide-remove"
      aria-label="Delete Guide"
      use:tooltip={{ content: 'Delete Guide', placement: 'top' }}
      on:click={() => dispatch('delete')}
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
      {/if}
    </div>
  {/if}
</div>

<style>
  .guide-row {
    border-bottom: 1px solid var(--st-gray-15);
  }

  /* Only the small inset the panel border needs. The section's own 16px is escaped by .guides so a row
     spans the full width, which is where the fields below get the room to be legible. */
  .guide-summary {
    align-items: center;
    display: flex;
    gap: 6px;
    height: 30px;
    padding: 0 6px;
  }

  /* Points right when closed and down when open, the one thing it is there to say. Sized past the
     glyph so the hit target is not the 9px arrow itself. */
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
    padding: 0 6px 8px 26px;
  }

  /* Its own line above the values, so the fields below read as belonging to the chosen mode rather
     than competing with it for the wrapping line. The cap goes on the control inside rather than on
     this wrapper: capping a `flex: 0 0 100%` item frees the rest of its line, and a date field
     promptly moved up onto it. */
  .guide-editor-mode {
    flex: 0 0 100%;
  }

  .guide-editor-mode :global(.radio-buttons) {
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

  /* Basis chosen so a range's two dates share one line: at the row's full width they land at 140px
     each, and a DOY timestamp needs 131px of that. The UTC hint that used to sit on this line was what
     made them wrap -- the fields themselves were never the problem. */
  .guide-editor-date {
    flex: 1 1 128px;
    min-width: 0;
  }
</style>
