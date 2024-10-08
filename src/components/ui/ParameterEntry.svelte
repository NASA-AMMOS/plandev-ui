<svelte:options immutable={true} />

<script lang="ts">
  import type { ParameterName } from "../../types/parameter";
  import type { ValueSchema } from "../../types/schema";
  import { tooltip } from "../../utilities/tooltip";

  export let newParameterNamePlaceholder: string = "New Parameter Name";

  let newParameterName: ParameterName;
  let newParameterType: ValueSchema
  let newParameterIsRequired: boolean = false;

  export function getParameterEntry() {
    return {
      isRequired: newParameterIsRequired,
      name: newParameterName,
      type: newParameterType,
    }
  }
</script>

<div class="parameter-container">
  <input
    bind:value={newParameterName}
    on:change={() => {}}
    autocomplete="off"
    class="st-input w-100"
    name="parameterName"
    placeholder={newParameterNamePlaceholder}
  />
  <select
    bind:value={newParameterType}
    on:change={() => {}}
    class="st-select"
    name="parameterType"
  >
    <option value="int">int</option>
    <option value="string">string</option>
    <option value="boolean">boolean</option>
  </select>
  <input
    bind:checked={newParameterIsRequired}
    name="parameterIsRequired"
    type="checkbox"
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
</style>
