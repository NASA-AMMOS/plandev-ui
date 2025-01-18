<svelte:options immutable={true} />

<script lang="ts">
  import CaretRightIcon from 'bootstrap-icons/icons/caret-right.svg?component';
  import { createEventDispatcher } from 'svelte';
  import FolderIcon from '../../assets/folder.svg?component';
  import SelectIcon from '../../assets/select.svg?component';
  import DirectiveAndSpanIcon from '../../assets/timeline-directive-and-span.svg?component';
  import DirectiveIcon from '../../assets/timeline-directive.svg?component';
  import SpanIcon from '../../assets/timeline-span.svg?component';
  import { ViewDefaultDiscreteOptions } from '../../constants/view';
  import type { ActivityDirective } from '../../types/activity';
  import type { ExternalEvent, ExternalEventId } from '../../types/external-event';
  import type { Span } from '../../types/simulation';
  import type { DiscreteOptions, DiscreteTree, DiscreteTreeNode, MouseDown, MouseOver } from '../../types/timeline';
  import { getExternalEventWholeRowId } from '../../utilities/externalEvents';
  import { classNames } from '../../utilities/generic';
  import { pluralize } from '../../utilities/text';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';

  export let discreteOptions: DiscreteOptions = { ...ViewDefaultDiscreteOptions };
  export let discreteTree: DiscreteTree = [];
  export let selectedActivityDirectiveId: number | null = null;
  export let selectedSpanId: number | null = null;
  export let selectedExternalEventId: ExternalEventId | null = null;

  let rowHeight = 0;

  $: rowHeight = discreteOptions.height + 4; // Add externalEventPadding from LayerDiscrete

  const dispatch = createEventDispatcher<{
    dblClick: MouseOver;
    'discrete-tree-node-change': DiscreteTreeNode;
    mouseDown: MouseDown;
  }>();

  function onMouseDownLeaf(e: MouseEvent, node: DiscreteTreeNode) {
    dispatch('mouseDown', { e, ...getDirectivesExternalEventsAndSpansForNode(node) });
  }

  function onDblClickLeaf(e: MouseEvent): void {
    if (e) {
      dispatch('dblClick', {
        e,
        selectedActivityDirectiveId: selectedActivityDirectiveId ?? undefined,
        selectedExternalEventId: selectedExternalEventId ?? undefined,
        selectedSpanId: selectedSpanId ?? undefined,
      });
    }
  }

  function getDirectivesExternalEventsAndSpansForNode(node: DiscreteTreeNode) {
    const activityDirectives: ActivityDirective[] = [];
    const spans: Span[] = [];
    const externalEvents: ExternalEvent[] = [];
    (node.items || []).forEach(({ directive, span, externalEvent }) => {
      if (directive) {
        activityDirectives.push(directive);
      }
      if (span) {
        spans.push(span);
      }
      if (externalEvent) {
        externalEvents.push(externalEvent);
      }
    });
    return { activityDirectives, externalEvents, spans };
  }

  function getNodeComposition(node: DiscreteTreeNode) {
    let activityDirectiveCount = 0;
    let spanCount = 0;
    let combinedActivityDirectiveSpanCount = 0;
    let externalEventCount = 0;
    (node.items || []).forEach(({ externalEvent, directive, span }) => {
      if (directive && span) {
        combinedActivityDirectiveSpanCount++;
      } else if (directive) {
        activityDirectiveCount++;
      } else if (span) {
        spanCount++;
      } else if (externalEvent) {
        // necessarily mutually exclusive.
        externalEventCount++;
      }
    });
    return { activityDirectiveCount, combinedActivityDirectiveSpanCount, externalEventCount, spanCount };
  }

  function onSelectClick(node: DiscreteTreeNode, e: MouseEvent) {
    onMouseDownLeaf(e, node);
  }
</script>

{#if discreteTree.length}
  {#each discreteTree as node}
    {#if node.isLeaf}
      {#if node.type === 'Activity'}
        {@const directive = node.items[0].directive}
        {@const span = node.items[0].span}
        <button
          style:height={`${rowHeight}px`}
          class="row-header-discrete-group leaf st-button tertiary"
          class:selected={directive?.id === selectedActivityDirectiveId || span?.span_id === selectedSpanId}
          on:dblclick={event => onDblClickLeaf(event)}
          on:click={event => onMouseDownLeaf(event, node)}
        >
          <div style=" align-items: center;color: var(--st-button-tertiary-color);display: flex; gap: 4px;">
            {#if directive && span}
              <div title="Combined Activity Directive and Simulated Activity" class="icon-group">
                <DirectiveAndSpanIcon />
              </div>
            {:else if directive}
              <div title="Activity Directive" class="icon-group">
                <DirectiveIcon />
              </div>
            {:else if span}
              <div title="Simulated Activity" class="icon-group">
                <SpanIcon />
              </div>
            {/if}
          </div>
          {node.label}
        </button>
      {:else}
        {@const externalEvent = node.items[0].externalEvent}
        <button
          style:height={`${rowHeight}px`}
          style:white-space="nowrap"
          style:overflow="hidden"
          style:text-overflow="ellipsis ellipsis"
          class="row-header-discrete-group leaf st-button tertiary"
          class:selected={externalEvent ? getExternalEventWholeRowId(externalEvent) === selectedExternalEventId : false}
          on:dblclick={event => onDblClickLeaf(event)}
          on:click={event => onMouseDownLeaf(event, node)}
        >
          <div style=" align-items: center;color: var(--st-button-tertiary-color);display: flex; gap: 4px;">
            <div title="External Event" class="icon-group">
              <CaretRightIcon style="width:13px" />
            </div>
          </div>
          {node.label}
        </button>
      {/if}
    {:else if node.type === 'Activity'}
      {@const { activityDirectiveCount, spanCount, combinedActivityDirectiveSpanCount } = getNodeComposition(node)}
      <Collapse
        headerHeight={rowHeight}
        defaultExpanded={node.expanded}
        className={classNames('row-header-discrete-group')}
        on:collapse={() => dispatch('discrete-tree-node-change', node)}
      >
        <div slot="left" style="align-items: center;display: flex">
          {#if node.activity_type === 'aggregation'}
            <div title="Type Group" class="icon-group">
              <FolderIcon />
            </div>
          {:else if combinedActivityDirectiveSpanCount > 0}
            <div title="Combined Activity Directive and Simulated Activity" class="icon-group">
              <DirectiveAndSpanIcon />
            </div>
          {:else if activityDirectiveCount > 0}
            <div title="Activity Directive" class="icon-group">
              <DirectiveIcon />
            </div>
          {:else if spanCount > 0}
            <div title="Simulated Activity" class="icon-group">
              <SpanIcon />
            </div>
          {/if}
        </div>
        <div slot="title" style="align-items: center;display: flex; gap: 8px;">
          <div class="label">
            {node.label}
          </div>
          <div class="title-metadata">
            {#if node.activity_type === 'directive'}
              <!--NOTE: Doesn't appear to run under any setting for directive/span visibility-->
              <div
                title={`${node.children.length} child type group${pluralize(node.children.length)}`}
                class="icon-group"
              >
                <FolderIcon />
                <span>{node.children.length}</span>
              </div>
            {:else}
              {activityDirectiveCount + spanCount + combinedActivityDirectiveSpanCount}
            {/if}
          </div>
        </div>
        <svelte:fragment slot="action-row">
          {#if node.activity_type !== 'aggregation'}
            <button
              use:tooltip={{ content: 'Select' }}
              class="st-button icon select"
              on:click={onSelectClick.bind(null, node)}
            >
              <SelectIcon />
            </button>
          {/if}
        </svelte:fragment>
        {#if node.expanded}
          <svelte:self
            {discreteOptions}
            discreteTree={node.children}
            {selectedActivityDirectiveId}
            {selectedSpanId}
            {selectedExternalEventId}
            on:discrete-tree-node-change
            on:mouseDown
            on:dblClick
          />
        {/if}
      </Collapse>
    {:else}
      {@const { externalEventCount } = getNodeComposition(node)}
      <Collapse
        headerHeight={rowHeight}
        defaultExpanded={node.expanded}
        className="row-header-discrete-group"
        on:collapse={() => dispatch('discrete-tree-node-change', node)}
      >
        <div slot="left" style="align-items: center;display: flex">
          <div title="External Event" class="icon-group">
            <FolderIcon />
          </div>
        </div>
        <div slot="title" style="align-items: center;display: flex; gap: 8px;">
          <div class="label" style:white-space="nowrap" style:overflow="hidden" style:text-overflow="ellipsis ellipsis">
            {node.label}
          </div>
          <div class="title-metadata">
            <div
              title={`${node.children.length} child type group${pluralize(node.children.length)}`}
              class="icon-group"
            >
              <span>{externalEventCount}</span>
            </div>
          </div>
        </div>
        <svelte:fragment slot="action-row">
          <button
            use:tooltip={{ content: 'Select' }}
            class="st-button icon select"
            on:click={onSelectClick.bind(null, node)}
          >
            <SelectIcon />
          </button>
        </svelte:fragment>
        {#if node.expanded}
          <svelte:self
            {discreteOptions}
            discreteTree={node.children}
            {selectedActivityDirectiveId}
            {selectedSpanId}
            {selectedExternalEventId}
            on:discrete-tree-node-change
            on:mouseDown
            on:dblClick
          />
        {/if}
      </Collapse>
    {/if}
  {/each}
{/if}

<style>
  :global(.row-header-discrete-group) {
    position: relative;
  }

  :global(.row-header-discrete-group.collapse > .collapse-header),
  .row-header-discrete-group.leaf {
    border-bottom: 1px solid var(--st-gray-30);
    border-radius: 0px;
    font-size: 10px;
    letter-spacing: 0.1px;
    padding: 0 !important;
    padding-left: 4px !important;
  }

  :global(.row-header-discrete-group.collapse:not(.selected) > .collapse-header:hover),
  .row-header-discrete-group.leaf:hover:not(.selected) {
    background: var(--st-gray-20) !important;
  }

  :global(.row-header-discrete-group.collapse > .content.pad-content) {
    margin-left: 16px !important;
  }

  :global(.row-header-discrete-group.collapse > .content) {
    gap: 0px;
  }

  .row-header-discrete-group.leaf {
    gap: 3px;
    height: 32px;
    justify-content: flex-start;
    outline: none;
    padding: 8px 0px 8px 0px;
  }

  .icon-group {
    display: flex;
    gap: 4px;
  }

  .title-metadata {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
    gap: 4px;
  }

  :global(.row-header-discrete-group.collapse .collapse-icon svg) {
    color: var(--st-gray-40);
  }

  .selected,
  :global(.collapse.selected > .collapse-header) {
    background-color: #e3effd !important;
  }

  :global(.collapse.selected > .collapse-header *),
  .row-header-discrete-group.selected,
  .row-header-discrete-group.selected :global(svg) {
    color: var(--st-utility-blue) !important;
  }

  :global(.row-header-discrete-group button.select) {
    background: var(--st-gray-20);
    height: 16px;
    min-width: 16px;
    opacity: 0;
    position: absolute;
    right: 0;
    top: 2px;
    width: 16px;
  }

  :global(.row-header-discrete-group button.select:hover) {
    background: var(--st-gray-20) !important;
  }

  :global(.row-header-discrete-group.collapse:has(> .collapse-header:focus-visible) > button.select),
  :global(.row-header-discrete-group.collapse:has(> button.select:focus-visible) > button.select),
  :global(.row-header-discrete-group.collapse:has(> .collapse-header:hover) > button.select),
  :global(.row-header-discrete-group.collapse:has(> button.select:hover) > button.select) {
    opacity: 1;
  }

  :global(.row-header-discrete-group .label) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon-group {
    display: flex;
    gap: 4px;
  }

  .title-metadata {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
    gap: 4px;
  }

  .selected,
  :global(.collapse.selected > .collapse-header) {
    background-color: #e3effd !important;
  }
</style>
