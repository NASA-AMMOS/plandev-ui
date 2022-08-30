<script lang="ts">
  import { classNames } from '../../../utilities/generic';

  export { className as class };
  export let value: string | number;
  export let options: (DropdownOption | DropdownCustomOption)[] = [];

  let className: string = '';
  let displayValue: string | number = value;

  $: displayValue = getDisplayValue(value, options);

  function getDisplayValue(value: string | number, options: (DropdownOption | DropdownCustomOption)[]) {
    if ((options[0] as DropdownCustomOption).value !== undefined) {
      const option = options.find((option: DropdownCustomOption) => {
        return option.value === value;
      });
      if (option !== undefined) {
        return (option as DropdownCustomOption).label;
      }
    }
    return value;
  }

  function getOptionValue(option: DropdownOption | DropdownCustomOption) {
    if ((option as DropdownCustomOption).value !== undefined) {
      return (option as DropdownCustomOption).value;
    }

    return option;
  }

  function getOptionLabel(option: DropdownOption | DropdownCustomOption) {
    if ((option as DropdownCustomOption).label !== undefined) {
      return (option as DropdownCustomOption).label;
    }

    return option;
  }
</script>

<div
  class={classNames('date-picker-dropdown', {
    [className]: !!className,
  })}
>
  <div class="display-value st-typography-header">
    <span class="value">{displayValue}</span>
    <select class="hidden" data-type="number" {value} tabindex="-1" on:change>
      {#each options as option}
        <option value={getOptionValue(option)}>{getOptionLabel(option)}</option>
      {/each}
    </select>
  </div>
</div>

<style>
  .date-picker-dropdown {
    position: relative;
  }

  .date-picker-dropdown .display-value {
    display: inline-block;
    line-height: 25px;
    min-width: 0;
    position: relative;
  }

  .display-value .value {
    border-radius: 4px;
    font-weight: bold;
    padding: 0.25rem;
  }

  .display-value:hover .value {
    background-color: var(--st-gray-15);
  }

  .date-picker-dropdown select {
    cursor: pointer;
    left: 0;
    opacity: 0;
    position: absolute;
  }
</style>
