import { foldInside, foldNodeProp, indentNodeProp, LRLanguage } from '@codemirror/language';
import { parser } from './handlebars.grammar';

const mixedParser = parser.configure({
  props: [
    // Add basic folding/indent metadata
    foldNodeProp.add({ Conditional: foldInside }),
    indentNodeProp.add({
      Conditional: cx => {
        const closed = /^\s*\{% endif/.test(cx.textAfter);
        return cx.lineIndent(cx.node.from) + (closed ? 0 : cx.unit);
      },
    }),
  ],
});

export const handlebarsLanguage = LRLanguage.define({ parser: mixedParser });
