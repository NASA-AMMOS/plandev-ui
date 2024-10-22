<svelte:options immutable={true} />

<script lang="ts">
  import type { ExternalEventProperty } from '../../types/external-event-property';
  import { compare } from '../../utilities/generic';
  import PropertyRecObject from './PropertyRecObject.svelte';

  export let formProperty: ExternalEventProperty;
  export let highlightKeysMap: Record<string, boolean> = {};

  let formProperties: ExternalEventProperty[] = [];
  let formPropertyName: string;

  $: formProperties =
    formProperty.value === undefined
      ? [{ name: '-', value: '-' }]
      : Object.entries(formProperty.value)
          .map(currentProperty => {
            return {
              name: currentProperty[0],
              value: currentProperty[1],
            };
          })
          .sort((a, b) => compare(a.name, b.name));
  $: formPropertyName = formProperty.name;
</script>

<PropertyRecObject {formPropertyName} {formProperties} {highlightKeysMap} />
