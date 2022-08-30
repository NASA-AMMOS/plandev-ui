<script lang="ts">
  import Week from './Week.svelte';

  export let year: number;
  export let maxDate: Date;
  export let minDate: Date;
  export let month: number;
  export let selectedDate: Date | null = null;

  let numOfWeeks: number;

  $: {
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));

    // get the day in the first week that the month starts in
    // add to the total number of days in the month and divide by 7 to get the number of weeks to display
    const daysInMonthView = firstOfMonth.getUTCDay() + lastOfMonth.getUTCDate();
    numOfWeeks = Math.ceil(daysInMonthView / 7);
  }
</script>

<div class="date-picker-month">
  <div class="week-header">
    <div>Sun</div>
    <div>Mon</div>
    <div>Tue</div>
    <div>Wed</div>
    <div>Thu</div>
    <div>Fri</div>
    <div>Sat</div>
  </div>
  {#each Array(numOfWeeks) as _, i}
    <Week {maxDate} {minDate} {year} {month} week={i} {selectedDate} on:select />
  {/each}
</div>

<style>
  .date-picker-month {
    display: grid;
    line-height: 18px;
    margin-bottom: 7px;
    row-gap: 7px;
  }

  .date-picker-month .week-header {
    border-bottom: 1px solid var(--st-gray-20);
    column-gap: 3px;
    display: grid;
    grid-template-columns: repeat(7, 38px);
    padding: 0 12px 7px;
  }

  .date-picker-month .week-header > div {
    font-weight: 500;
    text-align: center;
  }
</style>
