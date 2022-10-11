<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getDoy } from '../../../utilities/time';

  export let date: Date;
  export let maxDate: Date;
  export let minDate: Date;
  export let month: number;
  export let selectedDate: Date | null = null;

  const dispatch = createEventDispatcher();

  let isSelected: boolean = false;
  let isOutsideBounds: boolean = false;
  let isToday: boolean = false;

  $: isToday = isSameDay(date, new Date());
  $: isSelected = isSameDay(date, selectedDate);
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

  function onSelect() {
    if (!isOutsideBounds) {
      dispatch('select', date);
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="date-picker-day"
  class:isOutsideBounds
  class:isOutsideCurrentMonth
  class:isSelected
  class:isToday
  on:click|stopPropagation={onSelect}
>
  <div class="doy">{getDoy(date)}</div>
  <div class="date">{date.getUTCDate()}</div>
</div>

<style>
  .date-picker-day {
    border-radius: 5px;
    cursor: pointer;
    font-weight: 400;
    padding: 2px 0;
    position: relative;
    text-align: center;
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

  .date-picker-day.isSelected {
    background-color: var(--st-primary-50);
  }

  .date-picker-day.isSelected .doy {
    color: var(--st-gray-10);
  }

  .date-picker-day.isSelected .date {
    color: var(--st-gray-30);
  }

  .isToday {
    background-color: var(--st-gray-20);
  }

  .isOutsideCurrentMonth {
    opacity: 0.4;
  }

  .isOutsideBounds {
    cursor: not-allowed;
    opacity: 0.3;
  }
</style>
