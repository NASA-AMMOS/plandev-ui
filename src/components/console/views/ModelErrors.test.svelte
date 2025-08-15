<svelte:options immutable={true} />

<script lang="ts">
  import type { ModelSlim } from '../../../types/model';
  import Console from '../Console.svelte';
  import ModelErrors from './ModelErrors.svelte';

  export let model:
    | Pick<ModelSlim, 'refresh_activity_type_logs' | 'refresh_model_parameter_logs' | 'refresh_resource_type_logs'>
    | undefined;
  export let title: string;
</script>

<Console>
  <ModelErrors {model} {title} />
</Console>
