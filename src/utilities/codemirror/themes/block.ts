import { Decoration } from '@codemirror/view';
import { EditorView } from 'codemirror';

export const blockMark = Decoration.mark({ class: 'cm-block-match' });

export const blockTheme = EditorView.baseTheme({
  '.cm-block-match': {
    outline: '1px dashed',
  },
});
