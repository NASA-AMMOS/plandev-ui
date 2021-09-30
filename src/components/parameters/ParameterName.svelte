<svelte:options immutable={true} />

<script lang="ts">
  import type { FormParameter } from '../../types';
  import { tooltip } from '../../utilities/tooltip';

  export let formParameter: FormParameter;
</script>

<div class="form-parameter-name">
  <div
    class="name"
    class:error={formParameter.error !== null}
    use:tooltip={{ content: formParameter?.name, placement: 'bottom' }}
  >
    {formParameter?.name}
  </div>
</div>

<style>
  .form-parameter-name {
    align-items: center;
    display: flex;
  }

  .name {
    color: var(--gray-80);
    cursor: pointer;
    font-style: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name.error {
    color: var(--red);
  }
</style>
