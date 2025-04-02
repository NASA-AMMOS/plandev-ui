<script lang="ts">
  import type { DateDropdownOption, DropdownCustomOption } from '../../../types/datepicker';
  import { classNames } from '../../../utilities/generic';

  export { className as class };
  export let value: string | number;
  export let options: (DateDropdownOption | DropdownCustomOption)[] = [];

  let className: string = '';
  let displayValue: string | number = value;

  $: displayValue = getDisplayValue(value, options);

  function isCustomOption(options: (DateDropdownOption | DropdownCustomOption)[]): options is DropdownCustomOption[] {
    return (options[0] as DropdownCustomOption).value != null;
  }

  function getDisplayValue(value: string | number, options: (DateDropdownOption | DropdownCustomOption)[]) {
    if (isCustomOption(options)) {
      const option = options.find((option: DropdownCustomOption) => {
        return option.value === value;
      });
      if (option !== undefined) {
        return (option as DropdownCustomOption).label;
      }
    }
    return value;
  }

  function getOptionValue(option: DateDropdownOption | DropdownCustomOption) {
    if ((option as DropdownCustomOption).value !== undefined) {
      return (option as DropdownCustomOption).value;
    }

    return option;
  }

  function getOptionLabel(option: DateDropdownOption | DropdownCustomOption) {
    if ((option as DropdownCustomOption).label !== undefined) {
      return (option as DropdownCustomOption).label;
    }

    return option;
  }
</script>

<div
  class={classNames('relative', {
    [className]: !!className,
  })}
>
  <div class="relative inline-block min-w-0 text-base leading-6 [&>span]:hover:bg-accent">
    <span class="rounded p-1 font-bold">{displayValue}</span>
    <select data-type="number" {value} tabindex="-1" on:change class="pointer absolute left-0 opacity-0">
      {#each options as option}
        <option value={getOptionValue(option)}>{getOptionLabel(option)}</option>
      {/each}
    </select>
  </div>
</div>
