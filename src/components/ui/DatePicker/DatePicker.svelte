<script lang="ts">
  import Calendar from '@nasa-jpl/stellar/icons/calendar.svg?component';
  import ChevronLeft from '@nasa-jpl/stellar/icons/chevron_left.svg?component';
  import ChevronRight from '@nasa-jpl/stellar/icons/chevron_right.svg?component';
  import MagicEraser from '@nasa-jpl/stellar/icons/magic_eraser.svg?component';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { createPopperActions } from 'svelte-popperjs';
  import type { DropdownCustomOption } from '../../../types/datepicker';
  import type { ParsedDoyString, ParsedYmdString } from '../../../types/time';
  import { getTarget } from '../../../utilities/generic';
  import { getDoyTime, parseDoyOrYmdTime } from '../../../utilities/time';
  import { useActions, type ActionArray } from '../../../utilities/useActions';
  import DatePickerActionButton from './DatePickerActionButton.svelte';
  import DatePickerDropdown from './DatePickerDropdown.svelte';
  import Month from './Month.svelte';

  const currentDate = new Date();
  currentDate.setUTCHours(0);
  currentDate.setUTCMinutes(0);
  currentDate.setUTCSeconds(0);
  currentDate.setUTCMilliseconds(0);
  const currentYear = currentDate.getUTCFullYear();

  export let dateString: string = '';
  export let disabled: boolean = false;
  export let hasError: boolean = false;
  export let name: string = '';
  export let maxDate: Date = new Date(Date.UTC(currentYear + 20, 11)); // add 20 years;
  export let minDate: Date = new Date(Date.UTC(currentYear - 20, 0)); // subtract 20 years
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher();

  const [popperRef, popperContent] = createPopperActions({
    placement: 'bottom-start',
    strategy: 'fixed',
  });
  const extraOpts = {
    modifiers: [
      {
        enabled: true,
        name: 'flip',
        options: {
          fallbackPlacements: ['auto-end', 'auto-start'],
        },
      },
      { name: 'offset', options: { offset: [0, 8] } },
    ],
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

  function attemptAutoCompleteDate(event: Event) {
    const { value } = getTarget(event);

    const parsedDate = getDateFromString(`${value}`);
    if (parsedDate !== null) {
      setDateString(getDoyTime(parsedDate, parsedDate.getUTCMilliseconds() > 0));
    } else {
      setDateString(`${value}`);
    }
  }

  function clearDate() {
    setDateString('');
  }

  function closeDatePicker() {
    isOpen = false;
    isTouched = true;
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
    if (valueAsNumber != null) {
      viewMonth = valueAsNumber;
    }
  }

  function onChangeViewYear(event: Event) {
    const { valueAsNumber } = getTarget(event);
    if (valueAsNumber != null) {
      viewYear = valueAsNumber;
    }
  }

  function onDocumentKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeDatePicker();
    }
  }

  function onInputKeydown(event: KeyboardEvent) {
    const { key } = event;
    openDatePicker();

    if (key === 'Enter') {
      event.preventDefault();

      attemptAutoCompleteDate(event);
      closeDatePicker();
    }
  }

  function onSelect({ detail }: CustomEvent) {
    setDateString(getDoyTime(detail as Date, false));
    closeDatePicker();
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

    viewMonth = currentDate.getUTCMonth();
    viewYear = currentYear;
  }
</script>

<div class="date-picker" bind:this={datePickerContainer}>
  <input
    autocomplete="off"
    class="st-input w-100"
    class:error={!isValid || hasError}
    {disabled}
    {name}
    bind:value={dateString}
    use:popperRef
    use:useActions={use}
    on:change={attemptAutoCompleteDate}
    on:click={openDatePicker}
    on:focus={openDatePicker}
    on:keydown={onInputKeydown}
  />
  {#if isOpen}
    <div class="date-picker-portal" use:popperContent={extraOpts}>
      <div class="date-picker-inputs">
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-interactive-supports-focus -->
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
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-interactive-supports-focus -->
        <div><div class="chevron-button button" role="button" on:click={incrementMonth}><ChevronRight /></div></div>
      </div>
      <Month {maxDate} {minDate} month={viewMonth} year={viewYear} {selectedDate} on:select={onSelect} />
      <div class="date-picker-actions">
        <DatePickerActionButton on:click={setToday} text="Today">
          <Calendar />
        </DatePickerActionButton>
        <slot />
        <DatePickerActionButton on:click={clearDate} text="Clear">
          <MagicEraser />
        </DatePickerActionButton>
      </div>
    </div>
  {/if}
</div>

<style>
  .date-picker {
    cursor: auto;
    position: inherit;
  }

  .date-picker .date-picker-portal {
    background: #ffffff;
    border: 1px solid var(--st-gray-20);
    border-radius: 10px;
    box-shadow: var(--st-shadow-popover);
    min-height: 100px;
    min-width: 150px;
    user-select: none;
    z-index: 99999;
  }

  .date-picker .date-picker-portal .date-picker-inputs {
    column-gap: 0.25rem;
    display: grid;
    font-size: 1.01rem;
    font-weight: 300;
    grid-template-columns: min-content auto auto min-content;
    padding: 12px 17px 5px;
  }

  .date-picker-inputs .chevron-button {
    border-radius: 3px;
    cursor: pointer;
    display: grid;
    padding: 4px;
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
    border-top: 1px solid var(--st-gray-20);
    display: grid;
    margin-top: 7px;
    padding: 15px 16px;
    row-gap: 7px;
  }
</style>
