<script lang="ts">
  import Day from './Day.svelte';

  export let maxDate: Date;
  export let minDate: Date;
  export let month: number;
  export let selectedDate: Date | null = null;
  export let week: number;
  export let year: number;

  let weekDateArray: Date[] = [];

  $: {
    const weekStartDate = new Date(Date.UTC(year, month, week * 7 + 1));
    const weekStartDay = weekStartDate.getUTCDay();
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() - weekStartDay);

    weekDateArray = [...Array(7)].map((_, i) => {
      const date = new Date(weekStartDate.getTime());
      date.setUTCDate(date.getUTCDate() + i);
      return date;
    });
  }
</script>

<div class="date-picker-week">
  {#each weekDateArray as day}
    <Day {maxDate} {minDate} {month} date={day} {selectedDate} on:select />
  {/each}
</div>

<style>
  .date-picker-week {
    column-gap: 3px;
    display: grid;
    grid-template-columns: repeat(7, 38px);
    padding: 0 12px;
  }
</style>
