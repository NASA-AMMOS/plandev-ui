<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FolderIcon from '../../assets/folder.svg?component';
  import SelectIcon from '../../assets/select.svg?component';
  import DirectiveAndSpanIcon from '../../assets/timeline-directive-and-span.svg?component';
  import DirectiveIcon from '../../assets/timeline-directive.svg?component';
  import SpanIcon from '../../assets/timeline-span.svg?component';
  import { ViewDefaultActivityOptions } from '../../constants/view';
  import type { ActivityDirective, ActivityDirectiveId } from '../../types/activity';
  import type { Span, SpanId } from '../../types/simulation';
  import type { ActivityOptions, ActivityTree, ActivityTreeNode, MouseDown, MouseOver } from '../../types/timeline';
  import { classNames } from '../../utilities/generic';
  import { pluralize } from '../../utilities/text';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';

  export let activityOptions: ActivityOptions = { ...ViewDefaultActivityOptions };
  export let activityTree: ActivityTree = [];
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let selectedSpanId: SpanId | null = null;

  let rowHeight = 0;

  $: rowHeight = activityOptions.activityHeight + 4; // Add activityRowPadding from LayerActivities

  const dispatch = createEventDispatcher<{
    'activity-tree-node-change': ActivityTreeNode;
    dblClick: MouseOver;
    mouseDown: MouseDown;
  }>();

  function onLeafClick(e: MouseEvent, node: ActivityTreeNode, type: 'dblClick' | 'mouseDown') {
    dispatch(type, { e, ...getDirectivesAndSpansForNode(node) });
  }

  function getDirectivesAndSpansForNode(node: ActivityTreeNode) {
    const activityDirectives: ActivityDirective[] = [];
    const spans: Span[] = [];
    (node.items || []).forEach(({ directive, span }) => {
      if (directive) {
        activityDirectives.push(directive);
      }
      if (span) {
        spans.push(span);
      }
    });
    return { activityDirectives, spans };
  }

  function getNodeComposition(node: ActivityTreeNode) {
    let activityDirectiveCount = 0;
    let spanCount = 0;
    let combinedActivityDirectiveSpanCount = 0;
    (node.items || []).forEach(({ directive, span }) => {
      if (directive && span) {
        combinedActivityDirectiveSpanCount++;
      } else if (directive) {
        activityDirectiveCount++;
      } else if (span) {
        spanCount++;
      }
    });
    return { activityDirectiveCount, combinedActivityDirectiveSpanCount, spanCount };
  }

  function onSelectClick(node: ActivityTreeNode, e: MouseEvent) {
    onLeafClick(e, node, 'mouseDown');
  }
</script>

{#if activityTree.length}
  {#each activityTree as node}
    {#if node.isLeaf}
      {@const directive = node.items[0].directive}
      {@const span = node.items[0].span}
      <button
        style:height={`${rowHeight}px`}
        class="row-header-activity-group leaf st-button tertiary"
        class:selected={directive?.id === selectedActivityDirectiveId || span?.span_id === selectedSpanId}
        on:dblclick={e => onLeafClick(e, node, 'dblClick')}
        on:click={e => onLeafClick(e, node, 'mouseDown')}
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
      {@const { activityDirectiveCount, spanCount, combinedActivityDirectiveSpanCount } = getNodeComposition(node)}
      {@const directive = node.items[0]?.directive}
      {@const span = node.items[0]?.span}
      <Collapse
        headerHeight={rowHeight}
        defaultExpanded={node.expanded}
        className={classNames('row-header-activity-group', {
          selected:
            node.type !== 'aggregation' &&
            (directive?.id === selectedActivityDirectiveId || span?.span_id === selectedSpanId),
        })}
        on:collapse={() => dispatch('activity-tree-node-change', node)}
      >
        <div slot="left" style="align-items: center;display: flex">
          {#if node.type === 'aggregation'}
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
            {#if node.type === 'directive'}
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
          {#if node.type !== 'aggregation'}
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
            activityTree={node.children}
            on:activity-tree-node-change
            on:mouseDown
            on:dblClick
            {selectedActivityDirectiveId}
            {selectedSpanId}
          />
        {/if}
      </Collapse>
    {/if}
  {/each}
{/if}

<style>
  :global(.row-header-activity-group) {
    position: relative;
  }

  :global(.row-header-activity-group.collapse > .collapse-header),
  .row-header-activity-group.leaf {
    border-bottom: 1px solid var(--st-gray-30);
    border-radius: 0px;
    font-size: 10px;
    letter-spacing: 0.1px;
    padding: 0 !important;
    padding-left: 4px !important;
  }

  :global(.row-header-activity-group.collapse:not(.selected) > .collapse-header:hover),
  .row-header-activity-group.leaf:hover:not(.selected) {
    background: var(--st-gray-20) !important;
  }

  :global(.row-header-activity-group.collapse > .content.pad-content) {
    margin-left: 16px !important;
  }

  :global(.row-header-activity-group.collapse > .content) {
    gap: 0px;
  }

  .row-header-activity-group.leaf {
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

  :global(.row-header-activity-group.collapse .collapse-icon svg) {
    color: var(--st-gray-40);
  }

  .selected,
  :global(.collapse.selected > .collapse-header) {
    background-color: #e3effd !important;
  }

  :global(.collapse.selected > .collapse-header *),
  .row-header-activity-group.selected,
  .row-header-activity-group.selected :global(svg) {
    color: var(--st-utility-blue) !important;
  }

  :global(.row-header-activity-group button.select) {
    background: var(--st-gray-20);
    height: 16px;
    min-width: 16px;
    opacity: 0;
    position: absolute;
    right: 0;
    top: 2px;
    width: 16px;
  }

  :global(.row-header-activity-group button.select:hover) {
    background: var(--st-gray-20) !important;
  }

  :global(.row-header-activity-group.collapse:has(> .collapse-header:focus-visible) > button.select),
  :global(.row-header-activity-group.collapse:has(> button.select:focus-visible) > button.select),
  :global(.row-header-activity-group.collapse:has(> .collapse-header:hover) > button.select),
  :global(.row-header-activity-group.collapse:has(> button.select:hover) > button.select) {
    opacity: 1;
  }

  :global(.row-header-activity-group .label) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
