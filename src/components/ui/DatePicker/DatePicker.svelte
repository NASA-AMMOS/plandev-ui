<script lang="ts">
  import Calendar from '@nasa-jpl/stellar/icons/svg/calendar.svg?component';
  import ChevronLeft from '@nasa-jpl/stellar/icons/svg/chevron_left.svg?component';
  import ChevronRight from '@nasa-jpl/stellar/icons/svg/chevron_right.svg?component';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { createPopperActions } from 'svelte-popperjs';
  import { getTarget } from '../../../utilities/generic';
  import { getDoyTime, parseDoyOrYmdTime } from '../../../utilities/time';
  import DatePickerDropdown from './DatePickerDropdown.svelte';
  import Month from './Month.svelte';

  const currentDate = new Date();
  currentDate.setUTCHours(0);
  currentDate.setUTCMinutes(0);
  currentDate.setUTCSeconds(0);
  currentDate.setUTCMilliseconds(0);
  const currentYear = currentDate.getUTCFullYear();

  export let dateString: string = '';
  export let hasError: boolean = false;
  export let name: string = '';
  export let maxDate: Date = new Date(Date.UTC(currentYear + 20, 11)); // add 20 years;
  export let minDate: Date = new Date(Date.UTC(currentYear - 20, 0)); // subtract 20 years

  const dispatch = createEventDispatcher();

  const [popperRef, popperContent] = createPopperActions({
    placement: 'bottom',
    strategy: 'absolute',
  });
  const extraOpts = {
    modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
  };

  const monthsOptions: DropdownCustomOption[] = [
    { label: 'January', value: 0 },
    { label: 'February', value: 1 },
    { label: 'March', value: 2 },
    { label: 'April', value: 3 },
    { label: 'May', value: 4 },
    { label: 'June', value: 5 },
    { label: 'July', value: 6 },
    { label: 'August', value: 7 },
    { label: 'September', value: 8 },
    { label: 'October', value: 9 },
    { label: 'November', value: 10 },
    { label: 'December', value: 11 },
  ];

  let datePickerContainer: HTMLElement;
  let isTouched: boolean = false;
  let isMounted: boolean = false;
  let isOpen: boolean = false;
  let isValid: boolean = true;
  let selectedDate: Date | null;
  let viewMonth: number = currentDate.getUTCMonth();
  let viewYear: number = currentYear;
  let yearsRange: number[] = [];

  $: if (isMounted) {
    if (isOpen) {
      // add `click` listener for clicks that don't trigger focus events
      document.addEventListener('click', attemptCloseDatePicker);
      // add `focusin` listener for focus events from tabbing through elements
      // it has to be `focusin` because `focusin` bubbles up, while `focus` does not
      document.addEventListener('focusin', attemptCloseDatePicker);
      document.addEventListener('keydown', onDocumentKeydown);
    } else {
      document.removeEventListener('click', attemptCloseDatePicker);
      document.removeEventListener('focusin', attemptCloseDatePicker);
      document.removeEventListener('keydown', onDocumentKeydown);

      if (selectedDate) {
        updateView(selectedDate);
      }
    }
  }

  $: if (dateString !== '') {
    if (isTouched) {
      isValid = isValidDateTime(dateString);
    }

    const date = getDateFromString(dateString);
    if (date !== null) {
      isValid = minDate.getTime() <= date.getTime() && date.getTime() <= maxDate.getTime();

      if (isValid) {
        selectedDate = date;

        updateView(date);
      }
    }
  } else {
    isValid = true;
    selectedDate = null;
  }

  $: {
    yearsRange = [];
    for (let i = minDate.getFullYear(); i <= maxDate.getFullYear(); i += 1) {
      yearsRange.push(i);
    }
  }

  // this handles when the month is incremented/decremented into the next/previous year
  $: if (viewMonth < 0 || viewMonth > 11) {
    const currentMonthDate = new Date(Date.UTC(viewYear, viewMonth));

    updateView(currentMonthDate);
  }

  onMount(() => (isMounted = true));

  onDestroy(closeDatePicker);

  function attemptCloseDatePicker(event: MouseEvent | FocusEvent) {
    if (event.target instanceof Element && datePickerContainer && !datePickerContainer.contains(event.target)) {
      closeDatePicker();
    }
  }

  function autoCompleteDate(event: Event) {
    const { value } = getTarget(event);

    const parsedDate = getDateFromString(`${value}`);
    if (parsedDate !== null) {
      setDateString(getDoyTime(parsedDate, parsedDate.getUTCMilliseconds() > 0));
    }
  }

  function clearDate() {
    setDateString('');
  }

  function closeDatePicker() {
    isOpen = false;
    isTouched = true;

    dispatch('change', { value: dateString });
  }

  function decrementMonth() {
    viewMonth = viewMonth - 1;
  }

  /**
   * Converts a date string (YYYY-MM-DDTHH:mm:ss) or DOY string (YYYY-DDDDTHH:mm:ss) into a Date object
   */
  function getDateFromString(dateString: string): Date | null {
    const parsedDate = parseDoyOrYmdTime(dateString);
    if (parsedDate !== null) {
      const { hour, min, ms, sec, year } = parsedDate;

      if (isDoy(parsedDate)) {
        return new Date(Date.UTC(year, 0, parsedDate.doy, hour, min, sec, ms));
      }
      return new Date(Date.UTC(year, parsedDate.month - 1, parsedDate.day, hour, min, sec, ms));
    }

    return null;
  }

  function incrementMonth() {
    viewMonth = viewMonth + 1;
  }

  function isDoy(parsedDate: ParsedYmdString | ParsedDoyString): parsedDate is ParsedDoyString {
    return (parsedDate as ParsedDoyString).doy !== undefined;
  }

  /**
   * Determines if a given string is in the correct date string format (YYYY-MM-DDTHH:mm:ss) or DOY string format (YYYY-DDDDTHH:mm:ss)
   */
  function isValidDateTime(dateString: string): boolean {
    return parseDoyOrYmdTime(dateString) !== null;
  }

  function onChangeViewMonth(event: Event) {
    const { valueAsNumber } = getTarget(event);
    viewMonth = valueAsNumber;
  }

  function onChangeViewYear(event: Event) {
    const { valueAsNumber } = getTarget(event);
    viewYear = valueAsNumber;
  }

  function onDocumentKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeDatePicker();
    }
  }

  function onInputKeydown(event: KeyboardEvent) {
    const { key } = event;

    if (key === 'Enter') {
      autoCompleteDate(event);
    }
  }

  function onSelect({ detail }: CustomEvent) {
    setDateString(getDoyTime(detail as Date, false));
  }

  function openDatePicker() {
    isOpen = true;
  }

  function updateView(date: Date) {
    viewMonth = date.getUTCMonth();
    viewYear = date.getUTCFullYear();
  }

  function setDateString(value: string) {
    dateString = value;

    dispatch('change', { value });
  }

  function setToday() {
    setDateString(getDoyTime(currentDate));
  }
</script>

<div class="date-picker" bind:this={datePickerContainer}>
  <input
    class="st-input w-100"
    class:error={!isValid || hasError}
    {name}
    autocomplete="off"
    bind:value={dateString}
    use:popperRef
    on:change={autoCompleteDate}
    on:click={openDatePicker}
    on:focus={openDatePicker}
    on:keydown={onInputKeydown}
  />
  {#if isOpen}
    <div class="date-picker-portal" use:popperContent={extraOpts}>
      <div class="date-picker-inputs">
        <div><div class="chevron-button button" role="button" on:click={decrementMonth}><ChevronLeft /></div></div>
        <DatePickerDropdown
          class="date-picker-month-input"
          options={monthsOptions}
          value={viewMonth}
          on:change={onChangeViewMonth}
        />
        <DatePickerDropdown
          class="date-picker-years-input"
          options={yearsRange}
          value={viewYear}
          on:change={onChangeViewYear}
        />
        <div><div class="chevron-button button" role="button" on:click={incrementMonth}><ChevronRight /></div></div>
      </div>
      <Month {maxDate} {minDate} month={viewMonth} year={viewYear} {selectedDate} on:select={onSelect} />
      <div class="date-picker-actions">
        <div>
          <div class="action button" on:click={setToday}>
            <div class="action-icon"><Calendar /></div>
            <div class="action-label">Today</div>
          </div>
        </div>
        <div>
          <div class="action button" on:click={clearDate}>
            <div class="action-icon"><i class="bi bi-magic" /></div>
            <div class="action-label">Clear</div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .date-picker {
    position: inherit;
  }

  .date-picker .date-picker-portal {
    background: #ffffff;
    border: 1px solid var(--st-gray-20);
    border-radius: 10px;
    min-width: 150px;
    min-height: 100px;
    z-index: 99999;
    user-select: none;
  }

  .date-picker .date-picker-portal .date-picker-inputs {
    display: grid;
    grid-template-columns: min-content auto auto min-content;
    column-gap: 0.5rem;
    padding: 12px 17px 5px;
    font-weight: 300;
    font-size: 1.01rem;
  }

  .date-picker-inputs .chevron-button {
    display: grid;
    cursor: pointer;
    padding: 4px;
    border-radius: 3px;
  }

  .button:hover {
    background-color: var(--st-gray-20);
  }

  .button:active {
    background-color: var(--st-gray-30);
  }

  .date-picker-inputs :global(.date-picker-month-input) {
    text-align: right;
  }

  .date-picker-actions {
    display: grid;
    row-gap: 7px;
    border-top: 1px solid var(--st-gray-20);
    margin-top: 7px;
    padding: 15px 16px;
  }

  .date-picker-actions .action {
    display: inline-flex;
    color: var(--st-gray-70);
    cursor: pointer;
    border-radius: 4px;
    padding: 4px;
  }

  .date-picker-actions .action .action-icon {
    display: inline-block;
    text-align: right;
    width: 16px;
    margin-right: 7px;
  }

  .date-picker-actions .action .action-label {
    display: inline-block;
    font-weight: 400;
    line-height: 1.1rem;
  }
</style>
