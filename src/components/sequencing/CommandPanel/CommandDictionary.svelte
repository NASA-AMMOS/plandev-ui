<svelte:options immutable={true} />

<script lang="ts">
  import type { CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
  import type { CommandInfoMapper } from '../../../utilities/codemirror/commandInfoMapper';

  export let commandDictionary: CommandDictionary;
  export let parameterDictionaries: ParameterDictionary[];
  export let commandInfoMapper: CommandInfoMapper;

  $: console.log('commandDictionary :>> ', commandDictionary);
  $: console.log('parameterDictionaries :>> ', parameterDictionaries);
  $: console.log('commandInfoMapper :>> ', commandInfoMapper);
</script>

<div>hi</div>
