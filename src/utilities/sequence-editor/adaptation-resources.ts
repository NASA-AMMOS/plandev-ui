import { indentService, LRLanguage } from '@codemirror/language';
import { linter } from '@codemirror/lint';
import { hoverTooltip, ViewPlugin } from '@codemirror/view';
import type { CreateTooltip, PhoenixResources } from '@nasa-jpl/aerie-sequence-languages';
import { EditorView } from 'codemirror';
import StringTooltip from '../../components/sequencing/StringTooltip.svelte';

const createTooltip: CreateTooltip = (text: string[], from: number, to?: number) => {
  return {
    above: true,
    create() {
      const dom = document.createElement('div');
      new StringTooltip({ props: { messages: text }, target: dom });
      return { dom };
    },
    end: to,
    pos: from,
  };
};
export const phoenixResources: PhoenixResources = {
  EditorView,
  LRLanguage,
  ViewPlugin,
  createTooltip,
  hoverTooltip,
  indentService,
  linter,
};
