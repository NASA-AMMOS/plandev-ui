<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActivityDirective, ActivityDirectiveId, ActivityDirectivesMap } from '../../types/activity';
  import type { DropdownOptions, SelectedDropdownOptionValue } from '../../types/dropdown';
  import { getTarget } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { convertDurationStringToInterval, convertUsToDurationString, getIntervalInMs } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import Input from '../form/Input.svelte';
  import Highlight from '../ui/Highlight.svelte';
  import SearchableDropdown from '../ui/SearchableDropdown.svelte';

  export let activityDirective: ActivityDirective;
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let anchorId: ActivityDirectiveId | null = null;
  export let disabled: boolean = false;
  export let hasUpdatePermission: boolean = false;
  export let highlightKeysMap: Record<string, boolean> = {};
  export let isAnchoredToStart: boolean = true;
  export let startOffset: string | null = null;

  const dispatch = createEventDispatcher();
  const anchorTextDelimiter = ' - ';
  const updatePermissionError: string = 'You do not have permission to update this anchor';

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
      validationError = (error as Error).message;
    }

    return validationError;
  }

  function getAnchorActivityDirective(inputString: SelectedDropdownOptionValue): ActivityDirective | null {
    if (inputString !== null && !Number.isNaN(inputString)) {
      return activityDirectivesMap[inputString as number];
    }

    return null;
  }

  function updateAnchor(activityDirective: ActivityDirective | null) {
    anchoredActivity = activityDirective;
    if (anchoredActivity === null) {
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
      startOffsetError = (error as Error).message;
    }
  }
</script>

<Collapse
  className="anchor-collapse"
  bind:defaultExpanded={isRelativeOffset}
  title="Anchor"
  tooltipContent="Is Relative To Another Activity Directive"
>
  <div class="anchor-form">
    <Highlight highlight={highlightKeysMap.anchor_id}>
      <Input layout="inline">
        <label use:tooltip={{ content: 'Activity to anchor to', placement: 'top' }} for="anchor_id">
          Relative to
        </label>
        <SearchableDropdown
          {disabled}
          {hasUpdatePermission}
          options={searchableOptions}
          placeholder="To Plan"
          searchPlaceholder="Search Directives"
          settingsIconTooltip="Set Anchor"
          selectedOptionValue={anchorId}
          updatePermissionError="You do not have permission to update this anchor"
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
          <div
            class:st-button={isAnchoredToStart}
            class="secondary anchor-boundary"
            class:selected={isAnchoredToStart}
            class:disabled
            role="none"
            use:permissionHandler={{
              hasPermission: hasUpdatePermission,
              permissionError: updatePermissionError,
            }}
            on:click={onAnchorToStart}
          >
            Start
          </div>
          <div
            class:st-button={!isAnchoredToStart}
            class="secondary anchor-boundary"
            class:selected={!isAnchoredToStart}
            class:disabled
            use:permissionHandler={{
              hasPermission: hasUpdatePermission,
              permissionError: updatePermissionError,
            }}
            on:click={onAnchorToEnd}
            role="none"
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
          use:permissionHandler={{
            hasPermission: hasUpdatePermission,
            permissionError: updatePermissionError,
          }}
          bind:value={startOffsetString}
          on:change={onUpdateStartOffset}
          use:tooltip={{ content: startOffsetError, placement: 'top' }}
        />
      </Input>
    </Highlight>
  </div>
</Collapse>

<style>
  :global(.anchor-collapse) {
    margin-left: 0;
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

  :global(.anchor-collapse.collapse .content) {
    margin-left: 1rem;
  }
</style>
