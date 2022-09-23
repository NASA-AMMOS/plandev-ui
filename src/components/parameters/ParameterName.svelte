<svelte:options immutable={true} />

<script lang="ts">
  import { tooltip } from '../../utilities/tooltip';

  export let formParameter: FormParameter;

  let tooltipContent: string;

  $: tooltipContent = formParameter.required ? `${formParameter.name} (required)` : formParameter.name;
</script>

<div class="form-parameter-name">
  <div
    class="name"
    class:error={formParameter.errors !== null}
    use:tooltip={{ content: tooltipContent, placement: 'top' }}
  >
    {formParameter?.name}
    {#if formParameter.required}
      <span class="required">*</span>
    {/if}
  </div>
</div>

<style>
  .form-parameter-name {
    align-items: center;
    display: flex;
  }

  .name {
    color: var(--st-gray-80);
    cursor: default;
    font-style: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name.error {
    color: var(--st-red);
  }

  .required {
    color: var(--st-red);
  }
</style>
