<svelte:options immutable={true} />

<script lang="ts">
  // eslint-disable-next-line
  interface $$Events extends ComponentEvents<SvelteComponent> {
    resetCategory: CustomEvent<ActivityErrorCategories>;
    selectCategory: CustomEvent<ActivityErrorCategories>;
  }

  import IncompleteIcon from '@nasa-jpl/stellar/icons/incomplete.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import WarningExtraIcon from '@nasa-jpl/stellar/icons/warning_extra.svg?component';
  import WarningMissingIcon from '@nasa-jpl/stellar/icons/warning_missing.svg?component';
  import WarningUnknownIcon from '@nasa-jpl/stellar/icons/warning_unknown.svg?component';
  import { SvelteComponent, createEventDispatcher, type ComponentEvents } from 'svelte';
  import OutsideBoundsIcon from '../../assets/out-of-bounds.svg?component';
  import type { ActivityErrorCategories, ActivityErrorCounts } from '../../types/errors';
  import { isMacOs } from '../../utilities/generic';
  import { isMetaOrCtrlPressed } from '../../utilities/keyboardEvents';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { pluralize } from '../../utilities/text';
  import { tooltip } from '../../utilities/tooltip';

  type Mode = 'full' | 'compact' | 'minimal' | 'iconsOnly';

  export let counts: ActivityErrorCounts | undefined = undefined;
  export let hasPermission: boolean = true;
  export let mode: Mode = 'full';
  export let permissionError: string | undefined = undefined;
  export let selectable: boolean = false;
  export let showTotalCount: boolean = false;

  const dispatch = createEventDispatcher();

  function generateCountText(mode: Mode, count: number, category: string, itemName?: string) {
    switch (mode) {
      case 'full':
        return `${count} ${category}${itemName ? ` ${itemName}${pluralize(count)}` : ''}`;
      case 'compact':
        return `${count} ${category}`;
      case 'minimal':
        return `${count}`;
      case 'iconsOnly':
      default:
        return '';
    }
  }

  function getResetActionName(category: string) {
    switch (category) {
      case 'extraneous':
        return 'Remove';
      default:
        return 'Reset';
    }
  }

  function generateTooltip(
    mode: Mode,
    count: number,
    category: string,
    itemName: string,
    isResettable: boolean = false,
  ) {
    if (mode === 'minimal' || mode === 'iconsOnly') {
      if (mode === 'minimal' && isResettable) {
        return {
          content: `${getResetActionName(category)} ${count} ${category}${
            itemName ? ` ${itemName}${pluralize(count)}` : ''
          }${category !== 'extraneous' ? ' to mission model' : ''}`,
          shortcut: `${isMacOs() ? '⌘' : 'CTRL'} Click`,
        };
      } else {
        return {
          content: generateCountText('full', count, category, itemName),
          shortcut: '',
        };
      }
    }
    return {
      content: '',
      shortcut: '',
    };
  }

  function onSelectCategory(event: MouseEvent) {
    const { currentTarget } = event;
    if (currentTarget) {
      const { value } = currentTarget as HTMLButtonElement;

      if (selectable) {
        selectedCategory = value as ActivityErrorCategories;
      }

      if (mode === 'minimal' && isMetaOrCtrlPressed(event)) {
        dispatch('resetCategory', value);
      } else {
        dispatch('selectCategory', value);
      }
    }
  }

  let errorCounts: ActivityErrorCounts = {
    all: 0,
    extra: 0,
    invalidAnchor: 0,
    invalidParameter: 0,
    missing: 0,
    outOfBounds: 0,
    pending: 0,
    wrongType: 0,
  };
  let selectedCategory: ActivityErrorCategories | null = null;

  $: errorCounts = counts ?? {
    all: 0,
    extra: 0,
    invalidAnchor: 0,
    invalidParameter: 0,
    missing: 0,
    outOfBounds: 0,
    pending: 0,
    wrongType: 0,
  };
  $: selectedCategory = selectable ? 'all' : null;
</script>

<div
  class="counts"
  class:selectable
  class:full={mode === 'full'}
  class:compact={mode === 'compact'}
  class:minimal={mode === 'minimal'}
  class:icons-only={mode === 'iconsOnly'}
>
  {#if showTotalCount}
    <button class="count all" class:selected={selectedCategory === 'all'} value="all" on:click={onSelectCategory}>
      All ({errorCounts.all})
    </button>
  {/if}
  {#if errorCounts.extra}
    <button
      class="count"
      class:selected={selectedCategory === 'extra'}
      class:resettable={mode === 'minimal'}
      value="extra"
      on:click={onSelectCategory}
      use:tooltip={{
        allowHTML: true,
        ...generateTooltip(mode, errorCounts.extra, 'extraneous', 'parameter', true),
        disabled: !hasPermission,
      }}
      use:permissionHandler={{
        hasPermission,
        permissionError,
      }}
    >
      <WarningExtraIcon class="dark-red-icon" />{generateCountText(mode, errorCounts.extra, 'extraneous', 'parameter')}
    </button>
  {/if}
  {#if errorCounts.missing}
    <button
      class="count"
      class:selected={selectedCategory === 'missing'}
      value="missing"
      on:click={onSelectCategory}
      use:tooltip={{
        allowHTML: true,
        ...generateTooltip(mode, errorCounts.missing, 'missing', 'parameter'),
      }}
    >
      <WarningMissingIcon class="dark-red-icon" />{generateCountText(mode, errorCounts.missing, 'missing', 'parameter')}
    </button>
  {/if}
  {#if errorCounts.wrongType}
    <button
      class="count"
      class:selected={selectedCategory === 'wrongType'}
      value="wrongType"
      on:click={onSelectCategory}
      use:tooltip={{
        allowHTML: true,
        ...generateTooltip(mode, errorCounts.wrongType, 'invalid activity type', ''),
      }}
    >
      <WarningUnknownIcon class="dark-red-icon" />
      {generateCountText(mode, errorCounts.wrongType, 'invalid activity type', '')}
    </button>
  {/if}
  {#if errorCounts.invalidParameter}
    <button
      class="count"
      class:selected={selectedCategory === 'invalidParameter'}
      class:resettable={mode === 'minimal'}
      value="invalidParameter"
      on:click={onSelectCategory}
      use:tooltip={{
        allowHTML: true,
        ...generateTooltip(mode, errorCounts.invalidParameter, 'invalid', 'parameter', true),
        disabled: !hasPermission,
      }}
      use:permissionHandler={{
        hasPermission,
        permissionError,
      }}
    >
      <WarningIcon class="red-icon" />
      {generateCountText(mode, errorCounts.invalidParameter, 'invalid', 'parameter')}
    </button>
  {/if}
  {#if errorCounts.invalidAnchor}
    <button
      class="count"
      class:selected={selectedCategory === 'invalidAnchor'}
      value="invalidAnchor"
      on:click={onSelectCategory}
      use:tooltip={{
        allowHTML: true,
        ...generateTooltip(mode, errorCounts.invalidAnchor, 'invalid', 'anchor'),
      }}
    >
      <WarningIcon class="dark-red-icon" />{generateCountText(mode, errorCounts.invalidAnchor, 'invalid', 'anchor')}
    </button>
  {/if}
  {#if errorCounts.pending}
    <button
      class="count"
      class:selected={selectedCategory === 'pending'}
      value="pending"
      on:click={onSelectCategory}
      use:tooltip={{
        allowHTML: true,
        ...generateTooltip(mode, errorCounts.pending, 'not checked', ''),
      }}
    >
      <IncompleteIcon class="yellow-icon" />{generateCountText(mode, errorCounts.pending, 'not checked')}
    </button>
  {/if}
  {#if errorCounts.outOfBounds}
    <button
      class="count"
      class:selected={selectedCategory === 'outOfBounds'}
      value="outOfBounds"
      on:click={onSelectCategory}
      use:tooltip={{
        allowHTML: true,
        ...generateTooltip(mode, errorCounts.outOfBounds, 'outside plan bounds', ''),
      }}
    >
      <OutsideBoundsIcon />{generateCountText(mode, errorCounts.outOfBounds, 'outside plan bounds')}
    </button>
  {/if}
</div>

<style>
  .counts {
    column-gap: 7px;
    display: flex;
    flex-flow: wrap;
  }

  .counts .count.resettable {
    border-radius: 9px;
  }

  .counts.selectable .count {
    cursor: pointer;
    min-height: 32px;
    width: 100%;
  }

  .counts.full .count {
    padding: 0.3rem 0;
  }

  .counts.selectable.full .count {
    padding: 0.3rem 1rem;
  }

  .count.selected {
    background-color: var(--st-gray-15, #f1f2f3);
    color: var(--st-gray-80);
  }

  .counts.minimal,
  .counts.icons-only {
    column-gap: 0;
    flex-wrap: nowrap;
  }

  .counts.minimal .count {
    padding: 0.5px 5px;
  }

  .counts.selectable .count:hover,
  .counts.minimal .count.resettable:hover {
    background-color: var(--st-gray-20, #ebecec);
  }

  .count {
    align-items: center;
    background: none;
    border: 0;
    color: var(--st-gray-60, #545f64);
    column-gap: 2px;
    cursor: inherit;
    display: grid;
    font-weight: 500;
    grid-template-columns: min-content max-content;
    padding: 0;
    text-align: left;
  }

  .count.all {
    grid-template-columns: max-content;
  }

  :global(.activity-error-rollup-error) {
    align-items: center;
    color: var(--st-gray-10);
    display: flex;
    gap: 2rem;
    justify-content: center;
  }

  :global(.activity-error-rollup-error .activity-error-rollup-error-reset) {
    align-items: center;
    display: flex;
    gap: 0.3rem;
  }

  :global(.activity-error-rollup-error .activity-error-rollup-error-reset > div) {
    background-color: var(--st-gray-70);
    border-radius: 3px;
    padding: 0 2px;
  }
</style>
