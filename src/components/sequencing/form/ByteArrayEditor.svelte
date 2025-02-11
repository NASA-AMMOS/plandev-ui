<svelte:options immutable={true} />

<script lang="ts">
  import type { SyntaxNode } from '@lezer/common';
  import { decodeInt32Array } from '../../../utilities/codemirror/codemirror-utils';
  import type { CommandInfoMapper } from '../../../utilities/codemirror/commandInfoMapper';

  export let argNode: SyntaxNode;
  export let commandInfoMapper: CommandInfoMapper;
  export let value: string;

  let decodedValue: string;

  $: {
    const arrayNodes = commandInfoMapper.getByteArrayElements && commandInfoMapper.getByteArrayElements(argNode, value);
    if (arrayNodes) {
      decodedValue = decodeInt32Array(arrayNodes);
    }
  }
</script>

<div>
  <input class="st-input w-100" spellcheck="false" bind:value title="encoded string" disabled={true} />
  <input class="st-input w-100" spellcheck="false" bind:value={decodedValue} title="decoded string" disabled={true} />
</div>
