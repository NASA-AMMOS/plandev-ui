<svelte:options immutable={true} />

<script lang="ts">
  import InclusiveRangeIcon from '../../../assets/inclusive-range.svg?component';
  import RulerIcon from '../../../assets/ruler.svg?component';
  import { tooltip } from '../../../utilities/tooltip';

  export let type: 'string' | 'boolean' | 'number' | 'enum' | 'repeat';
  export let typeDisplay: string | undefined = undefined;
  export let unit: string | undefined = undefined;
  export let unitShortName: string | undefined = undefined;
  export let range: { max: number | string; min: number | string } | undefined = undefined;

  function isValidUnit(unitDisplay: string | undefined, unitShortNameDisplay: string | undefined) {
    const unitToCheck = unitDisplay || unitShortNameDisplay;

    if (unitToCheck) {
      switch (unitToCheck.toLowerCase()) {
        case 'n/a':
        case 'none':
          return false;
        default:
          return true;
      }
    }
  }
</script>

<div class="unit-container">
  {#if typeDisplay}
    <div>
      <div class="type faded"><RulerIcon /></div>
      {typeDisplay}
    </div>
  {/if}
  {#if range}
    {#if type === 'boolean'}
      <div>
        {range.min}<span class="faded">|</span>{range.max}
      </div>
    {:else}
      <div>
        <div class="type faded"><InclusiveRangeIcon /></div>
        {range.min}<span class="faded">-</span>{range.max}
      </div>
    {/if}
  {/if}
  {#if isValidUnit(unit, unitShortName)}
    <div class="unit" use:tooltip={{ content: unit }}>
      <div class="dot faded"></div>
      {unitShortName || unit}
    </div>
  {/if}
</div>

<style>
  .unit-container {
    color: #000;
    column-gap: 4px;
    display: flex;
    flex-flow: row;
  }

  .unit-container > div {
    align-items: center;
    background: var(--st-gray-10);
    border: 1px solid var(--st-gray-15);
    border-radius: 2px;
    display: flex;
    gap: 4px;
    padding: 2px 4px;
  }

  .type {
    align-items: center;
    display: flex;
  }

  .faded {
    opacity: 0.6;
  }

  .unit .dot {
    border-color: var(--st-gray-100);
    border-radius: 50%;
    border-style: solid;
    border-width: 1px;
    height: 6px;
    width: 6px;
  }
</style>
