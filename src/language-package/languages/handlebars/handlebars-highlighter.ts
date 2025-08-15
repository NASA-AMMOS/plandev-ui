import { styleTags, tags } from '@lezer/highlight';

export const handlebarsHighlighter = styleTags({
  BIHelper: tags.keyword,
  BlockComment: tags.comment,
  DirectiveContent: tags.variableName,
  Escape: tags.annotation,
  Identifier: tags.variableName,
  Number: tags.number,
  OnelineComment: tags.comment,
  String: tags.string,
  'if endif': tags.controlKeyword,
  '{{ }}': tags.tagName,
  '{{{ }}}': tags.tagName,
  '~ @': tags.atom,
});
