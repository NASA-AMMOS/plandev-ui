<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { classNames } from '../../../utilities/generic';
  import { getDoy } from '../../../utilities/time';

  export let date: Date;
  export let maxDate: Date;
  export let minDate: Date;
  export let month: number;
  export let selectedDate: Date | null = null;

  const dispatch = createEventDispatcher<{
    select: Date;
  }>();

  let isSelected: boolean = false;
  let isOutsideBounds: boolean = false;
  let isToday: boolean = false;

  $: isToday = isSameDay(date, new Date());
  $: if (selectedDate !== null) {
    isSelected = isSameDay(date, selectedDate);
  }
  $: isOutsideBounds = minDate.getTime() > date.getTime() || date.getTime() > maxDate.getTime();
  $: isOutsideCurrentMonth = month !== date.getUTCMonth();

  function isSameDay(date1: Date, date2: Date) {
    if (date1 && date2) {
      return (
        date1.getUTCDate() === date2.getUTCDate() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCFullYear() === date2.getUTCFullYear()
      );
    }
    return false;
  }

  function onSelect(event: MouseEvent) {
    event.stopPropagation();
    if (!isOutsideBounds) {
      dispatch('select', date);
    }
  }
</script>

<Button
  variant="ghost"
  size="xs"
  class={classNames('date-picker-day ring-inset !ring-offset-0 ', {
    'is-outside-bounds': isOutsideBounds,
    'is-outside-current-month': isOutsideCurrentMonth,
    'is-selected': isSelected,
    'is-today': isToday,
  })}
  role="none"
  on:click={onSelect}
>
  <div class="doy">{getDoy(date)}</div>
  <div class="date">{date.getUTCDate()}</div>
</Button>

<style lang="postcss">
  :global(.date-picker-day) {
    border-radius: 5px;
    cursor: pointer;
    display: block !important;
    font-weight: 400;
    height: 40px !important;
    padding: 2px 0;
    position: relative;
    text-align: center;
    width: 40px !important;
  }

  :global(.date-picker-day .date) {
    font-weight: 500;
    opacity: 0.4;
  }

  :global(.date-picker-day.is-selected) {
    @apply bg-primary;
  }

  :global(.date-picker-day.is-selected .doy) {
    @apply text-primary-foreground;
  }

  :global(.date-picker-day.is-selected .date) {
    @apply text-primary-foreground;
    opacity: 0.6;
  }

  :global(.is-today) {
    @apply bg-secondary;
  }

  :global(.is-outside-current-month) {
    @apply text-muted-foreground;
  }

  :global(.is-outside-bounds) {
    cursor: not-allowed;
    opacity: 0.3;
  }
</style>
