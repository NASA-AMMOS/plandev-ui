<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getTarget } from '../../utilities/generic';
  import { convertDurationStringToInterval } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';

  const dispatch = createEventDispatcher();

  let direction: 'Left' | 'Right' = 'Left';
  let startOffsetString: string = '0d 0h 0m 0s 0ms 0us';
  let startOffsetError: string | null = '';
  let disabled: boolean = false;

  function setDirection(dir: 'Left' | 'Right') {
    direction = dir;
  }

  function cancel() {
    dispatch('cancel');
  }

  function pack() {
    console.log('Packing activities with offset:', direction, startOffsetString);
    dispatch('pack', { direction, gapOffset: startOffsetString });
  }

  function onUpdateStartOffset(event: Event) {
    const { value } = getTarget(event);
    console.log('Updating start offset:', value);

    try {
      convertDurationStringToInterval(`${value}`);
      console.log('Start offset is valid:', value);
    } catch (error: any) {
      startOffsetError = error.message;
    }
  }
</script>

<div class="dialog">
  <div class="row">
    <div class="label">Direction</div>
    <div class="toggle-group">
      <button class="toggle {direction === 'Left' ? 'active' : ''}" on:click={() => setDirection('Left')}>Left</button>
      <button class="toggle {direction === 'Right' ? 'active' : ''}" on:click={() => setDirection('Right')}
        >Right</button
      >
    </div>
  </div>

  <Input layout="inline">
    <label use:tooltip={{ content: 'The offset duration for the anchor', placement: 'top' }} for="start-offset">
      Offset
    </label>
    <input
      class="st-input w-full"
      class:error={!!startOffsetError}
      {disabled}
      name="start-offset"
      bind:value={startOffsetString}
      on:change={onUpdateStartOffset}
      use:tooltip={{ content: startOffsetError, placement: 'top' }}
    />
  </Input>

  <div class="buttons">
    <button on:click={cancel}>Cancel</button>
    <button on:click={pack}>Pack</button>
  </div>
</div>

<style>
  .dialog {
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    font-family: sans-serif;
    margin: auto;
    max-width: 300px;
    padding: 1rem;
  }

  .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .label {
    flex: 1;
    font-weight: 500;
    margin-right: 1rem;
    padding-top: 0.25rem;
  }

  .toggle-group {
    border: 1px solid #ccc;
    border-radius: 6px;
    display: flex;
    overflow: hidden;
  }

  .toggle {
    background: #f9f9f9;
    border: none;
    cursor: pointer;
    font-weight: 500;
    outline: none;
    padding: 0.5rem 1rem;
  }

  .toggle.active {
    background: #fff;
    font-weight: bold;
  }

  .buttons {
    display: flex;
    justify-content: space-between;
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 500;
    padding: 0.5rem 1rem;
  }
</style>
