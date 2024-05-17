<svelte:options immutable={true} />

<script lang="ts">
  import { SeqLanguage } from '../../../utilities/codemirror';

  export let initVal: string;
  export let setInEditor: (val: string) => void;

  let value: string;

  $: value = initVal;

  $: {
    if (value.trim() && isValidTimeTag(value)) {
      setInEditor(value + ' ');
    }
  }

  function isValidTimeTag(s: string) {
    const cursor = SeqLanguage.parser.parse(s.trim() + ' CMD_STEM').cursor();
    do {
      const { node } = cursor;
      if (node.type.name === 'TimeTag') {
        return true;
      }
    } while (cursor.next());
    return false;
  }
</script>

<div>Time Tag: <input type="text" bind:value /></div>
