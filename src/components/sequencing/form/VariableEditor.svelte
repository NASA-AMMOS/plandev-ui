<svelte:options immutable={true} />

<script lang="ts">
  import type { SyntaxNode } from '@lezer/common';
  import { type VariableTextDef } from '../../../utilities/codemirror/codemirror-utils';
  import ArgTitle from './ArgTitle.svelte';
  import EnumEditor from './EnumEditor.svelte';
  import ExtraArgumentEditor from './ExtraArgumentEditor.svelte';
  import NumEditor from './NumEditor.svelte';
  import StringEditor from './StringEditor.svelte';

  export let varInfo: VariableTextDef;
  export let setInEditor: (token: SyntaxNode, val: string) => void;
</script>

<fieldset>
  {#if !varInfo.varDef}
    {#if varInfo.text}
      <div class="st-typography-medium" title="Unknown Argument">Unknown Argument</div>
      <ExtraArgumentEditor
        initVal={varInfo.text}
        setInEditor={() => {
          if (varInfo.node) {
            setInEditor(varInfo.node, '');
          }
        }}
      />
    {/if}
  {:else}
    <ArgTitle argDef={varInfo.varDef} />
    {#if varInfo.varDef.type === 'ENUM' && varInfo.node}
      <EnumEditor
        argDef={varInfo.varDef}
        initVal={varInfo.text ?? ''}
        setInEditor={val => {
          if (varInfo.node) {
            setInEditor(varInfo.node, val);
          }
        }}
      />
    {:else if (varInfo.varDef.type === 'FLOAT' || varInfo.varDef.type === 'INT' || varInfo.varDef.type === 'UINT') && varInfo.node}
      <NumEditor
        argDef={varInfo.varDef}
        initVal={Number(varInfo.text) ?? varInfo.varDef.default_value ?? 0}
        setInEditor={val => {
          if (varInfo.node) {
            setInEditor(varInfo.node, val.toString());
          }
        }}
      />
    {:else if varInfo.varDef.type === 'STRING' && varInfo.node}
      <StringEditor
        initVal={varInfo.text ?? ''}
        setInEditor={val => {
          if (varInfo.node) {
            setInEditor(varInfo.node, val);
          }
        }}
      />
    {:else}
      <div class="st-typography-body">Unexpected value for definition</div>
    {/if}
  {/if}
</fieldset>
