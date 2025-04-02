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

<div class="mb-[7px] grid gap-y-[7px] leading-[18px]">
  <div class="grid grid-cols-[repeat(7_,38px)] gap-x-[3px] border-b px-3 pb-[7px]">
    <div class="text-center font-medium">Sun</div>
    <div class="text-center font-medium">Mon</div>
    <div class="text-center font-medium">Tue</div>
    <div class="text-center font-medium">Wed</div>
    <div class="text-center font-medium">Thu</div>
    <div class="text-center font-medium">Fri</div>
    <div class="text-center font-medium">Sat</div>
  </div>
  {#each Array(numOfWeeks) as _, i}
    <Week {maxDate} {minDate} {year} {month} week={i} {selectedDate} on:select />
  {/each}
</div>
