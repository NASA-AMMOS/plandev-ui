<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActivityDirective, ActivityDirectiveId, ActivityDirectivesMap } from '../../types/activity';
  import type { DropdownOptions, SelectedDropdownOptionValue } from '../../types/dropdown';
  import { getTarget } from '../../utilities/generic';
  import { convertDurationStringToInterval, convertUsToDurationString, getIntervalInMs } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import Highlight from '../ui/Highlight.svelte';
  import SearchableDropdown from '../ui/SearchableDropdown.svelte';

  export let activityDirective: ActivityDirective;
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let anchorId: ActivityDirectiveId | null = null;
  export let disabled: boolean = false;
  export let highlightKeysMap: Record<string, boolean> = {};
  export let isAnchoredToStart: boolean = true;
  export let startOffset: string = null;

  const dispatch = createEventDispatcher();
  const anchorTextDelimiter = ' - ';

  let anchorableActivityDirectives: ActivityDirective[] = [];
  let anchoredActivity: ActivityDirective | null = null;
  let previousActivityDirectiveId: ActivityDirectiveId;
  let isRelativeOffset: boolean = false;
  let startOffsetString: string = '';
  let startOffsetError: string | null = null;
  let searchableOptions: DropdownOptions = [];

  $: anchoredActivity = anchorId !== null ? activityDirectivesMap[anchorId] : null;
  $: anchorableActivityDirectives = Object.values(activityDirectivesMap).filter(
    directive => directive.id !== activityDirective.id,
  );
  $: searchableOptions = anchorableActivityDirectives.map((anchorableActivity: ActivityDirective) => ({
    display: formatActivityDirectiveAnchorText(anchorableActivity),
    value: anchorableActivity.id,
  }));
  $: startOffsetError = validateStartOffset(startOffsetString, activityDirective);

  $: if (startOffset) {
    const offsetString = convertUsToDurationString(getIntervalInMs(startOffset) * 1000, true);
    // remove `y` if 0 to keep the string shorter
    startOffsetString = offsetString.replace(/0y\s?/, '');
  }

  // only set this when the viewed activity is changed
  $: if (activityDirective.id !== previousActivityDirectiveId) {
    previousActivityDirectiveId = activityDirective.id;
    isRelativeOffset =
      activityDirective.anchor_id !== null ||
      (activityDirective.anchor_id === null && !activityDirective.anchored_to_start) ||
      !!startOffsetError;
  }

  function formatActivityDirectiveAnchorText(activityDirective: ActivityDirective) {
    return `${activityDirective.id}${anchorTextDelimiter}${activityDirective.name}`;
  }

  function validateStartOffset(offsetString: string, activityDirective: ActivityDirective) {
    let validationError = activityDirective.anchor_validations?.reason_invalid
      ? activityDirective.anchor_validations.reason_invalid
      : null;

    try {
      convertDurationStringToInterval(`${offsetString}`);
    } catch (error) {
      validationError = error.message;
    }

    return validationError;
  }

  function getAnchorActivityDirective(inputString: SelectedDropdownOptionValue): ActivityDirective | null {
    if (!Number.isNaN(inputString) && inputString) {
      return activityDirectivesMap[inputString];
    }

    return null;
  }

  function updateAnchor(activityDirective: ActivityDirective | null) {
    anchoredActivity = activityDirective;
    if (activityDirective === null) {
      dispatch('updateAnchor', null);
    } else {
      dispatch('updateAnchor', anchoredActivity.id);
    }
  }

  function updateAnchorEdge(isStart: boolean) {
    isAnchoredToStart = isStart;
    dispatch('updateAnchorEdge', isStart);
  }

  function updateStartOffset(offset: string) {
    dispatch('updateStartOffset', offset);
  }

  function onSelectAnchor(event: CustomEvent<SelectedDropdownOptionValue>) {
    const { detail: anchorInputString } = event;
    const activityToAnchorTo = getAnchorActivityDirective(anchorInputString);
    updateAnchor(activityToAnchorTo);
  }

  function onAnchorToStart() {
    if (!disabled) {
      updateAnchorEdge(true);
    }
  }

  function onAnchorToEnd() {
    if (!disabled) {
      updateAnchorEdge(false);
    }
  }

  function onUpdateStartOffset(event: Event) {
    const { value } = getTarget(event);

    startOffsetError = activityDirective.anchor_validations?.reason_invalid
      ? activityDirective.anchor_validations.reason_invalid
      : null;

    try {
      updateStartOffset(convertDurationStringToInterval(`${value}`));
    } catch (error) {
      startOffsetError = error.message;
    }
  }
</script>

<fieldset class="anchor-container">
  <details bind:open={isRelativeOffset}>
    <summary use:tooltip={{ content: 'Is Relative To Another Activity Directive', placement: 'top' }}>Anchor</summary>
    <div class="anchor-form">
      <Highlight highlight={highlightKeysMap.anchor_id}>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Activity to anchor to', placement: 'top' }} for="anchor_id">
            Relative to
          </label>
          <SearchableDropdown
            options={searchableOptions}
            placeholder="To Plan"
            searchPlaceholder="Search Directives"
            settingsIconTooltip="Set Anchor"
            selectedOptionValue={anchorId}
            on:selectOption={onSelectAnchor}
          />
        </Input>
      </Highlight>
      <Highlight highlight={highlightKeysMap.anchored_to_start}>
        <Input layout="inline">
          <label
            use:tooltip={{ content: 'Where to anchor to activity directive', placement: 'top' }}
            for="isAnchoredToStart"
          >
            Anchor
          </label>
          <div class="anchor-boundaries">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class:st-button={isAnchoredToStart}
              class="secondary anchor-boundary"
              class:selected={isAnchoredToStart}
              class:disabled
              on:click={onAnchorToStart}
            >
              Start
            </div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class:st-button={!isAnchoredToStart}
              class="secondary anchor-boundary"
              class:selected={!isAnchoredToStart}
              class:disabled
              on:click={onAnchorToEnd}
            >
              End
            </div>
          </div>
        </Input>
      </Highlight>
      <Highlight highlight={highlightKeysMap.start_offset}>
        <Input layout="inline">
          <label use:tooltip={{ content: 'The offset duration for the anchor', placement: 'top' }} for="start-offset">
            Offset
          </label>
          <input
            class="st-input w-100"
            class:error={!!startOffsetError}
            {disabled}
            name="start-offset"
            bind:value={startOffsetString}
            on:change={onUpdateStartOffset}
            use:tooltip={{ content: startOffsetError, placement: 'top' }}
          />
        </Input>
      </Highlight>
    </div>
  </details>
</fieldset>

<style>
  .anchor-container {
    padding: 0;
  }

  .anchor-form {
    margin-left: 1rem;
  }

  .anchor-boundaries {
    background: var(--st-input-background-color);
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .anchor-boundaries .anchor-boundary {
    align-items: center;
    cursor: pointer;
    display: grid;
    height: var(--st-grid-unit3x);
    text-align: center;
  }

  .anchor-boundaries .anchor-boundary:hover {
    color: var(--st-black);
  }

  .anchor-boundaries .anchor-boundary.selected:hover {
    background-color: var(--st-white);
    color: inherit;
    cursor: default;
  }

  .anchor-boundaries .anchor-boundary.disabled {
    cursor: not-allowed;
  }
</style>
