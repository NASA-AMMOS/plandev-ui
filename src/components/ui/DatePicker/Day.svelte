<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { classNames } from '../../../utilities/generic';
  import { getDoy } from '../../../utilities/time';

  export let date: Date;
  export let maxDate: Date;
  export let minDate: Date;
  export let month: number;
  export let selectedDate: Date | null = null;

  const dispatch = createEventDispatcher();

  let isSelected: boolean = false;
  let isWithinBounds: boolean = true;
  let isToday: boolean = false;

  $: isToday = isSameDay(date, new Date());
  $: isSelected = isSameDay(date, selectedDate);
  $: isWithinBounds = minDate.getTime() <= date.getTime() && date.getTime() <= maxDate.getTime();
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

  function onSelect() {
    if (isWithinBounds) {
      dispatch('select', date);
    }
  }
</script>

<div
  class={classNames('date-picker-day', {
    disabled: !isWithinBounds,
    outside: isOutsideCurrentMonth,
    selected: isSelected,
    today: isToday,
  })}
  on:click|stopPropagation={onSelect}
>
  <div class="doy">{getDoy(date)}</div>
  <div class="date">{date.getUTCDate()}</div>
</div>

<style>
  .date-picker-day {
    position: relative;
    text-align: center;
    cursor: pointer;
    border-radius: 5px;
    font-weight: 400;
    padding: 2px 0;
  }

  .date-picker-day:hover {
    background-color: var(--st-primary-10);
  }

  .date-picker-day .doy {
    color: var(--st-gray-90);
  }

  .date-picker-day .date {
    color: var(--st-gray-50);
    font-weight: 500;
  }

  .date-picker-day.selected {
    background-color: var(--st-primary-50);
  }

  .date-picker-day.selected .doy {
    color: var(--st-gray-10);
  }

  .date-picker-day.selected .date {
    color: var(--st-gray-30);
  }

  .today {
    background-color: var(--st-gray-20);
  }

  .outside {
    opacity: 0.4;
  }

  .disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
