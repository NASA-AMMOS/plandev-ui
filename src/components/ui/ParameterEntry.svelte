<svelte:options immutable={true} />

<script lang="ts">
  import MinusIcon from '@nasa-jpl/stellar/icons/minus.svg?component';
  import { createEventDispatcher } from "svelte";
  import type { ParameterName } from "../../types/parameter";
  import type { ValueSchema } from '../../types/schema';
  import { getTarget } from "../../utilities/generic";
  import { tooltip } from "../../utilities/tooltip";

  export let id: number;
  export let value: {isRequired: boolean | null, name: ParameterName | null, type: ValueSchema | null};
  export let disabled: boolean = false;

  export let newParameterNamePlaceholder: string = "New Parameter Name";

  const dispatch = createEventDispatcher<{
    delete: number,
    input: {
      id: number,
      isRequired?: boolean,
      name?: ParameterName,
      type?: string
    }
  }>();

  function handleNameChanged(event: Event) {
    const { value } = getTarget(event);
    if (value) {
      dispatch('input', {
        id: id,
        name: value as string
      });
    }
  }

  function handleTypeChanged(event: Event) {
    const { value } = getTarget(event);
    if (value) {
      dispatch('input', {
        id: id,
        type: value as string
      })
    }
  }

  function handleIsRequiredChanged(event: Event) {
    const { value } = getTarget(event);
    if (value) {
      dispatch('input', {
        id: id,
        isRequired: value as boolean
      })
    }
  }
</script>

<div class="parameter-container">
  <button
    {disabled}
    style:display="grid"
    class="st-button icon delete"
    on:click|stopPropagation={() => {dispatch('delete', id)}}
  >
    <MinusIcon/>
  </button>
  <input
    {disabled}
    on:change={handleNameChanged}
    autocomplete="off"
    class="st-input w-100"
    name="parameterName"
    placeholder={newParameterNamePlaceholder}
    value={value.name}
  />
  <select
    {disabled}
    on:change={handleTypeChanged}
    class="st-select"
    name="parameterType"
    value={value.type}
  >
    <option value="int">int</option>
    <option value="string">string</option>
    <option value="boolean">boolean</option>
  </select>
  <input
    {disabled}
    on:change={handleIsRequiredChanged}
    name="parameterIsRequired"
    type="checkbox"
    value={value.isRequired}
    use:tooltip={{
      content: "Required?",
      placement: 'top',
    }}
  />
</div>

<style>
  .parameter-container {
    display: flex;
    gap: 4px;
  }

  .delete {
    align-self: center;
    height: 100%;
  }
</style>
