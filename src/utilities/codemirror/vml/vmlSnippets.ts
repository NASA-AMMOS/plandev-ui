import { snippet, type Completion } from '@codemirror/autocomplete';
import {
  TOKEN_ABSOLUTE_SEQUENCE,
  TOKEN_BLOCK,
  TOKEN_END_MODULE,
  TOKEN_MODULE,
  TOKEN_RELATIVE_SEQUENCE,
  TOKEN_SEQUENCE,
} from './vmlConstants';

function skeletonSeq(seqType: string): string {
  return `${seqType} \${name}
FLAGS \${AUTOEXECUTE} \${AUTOUNLOAD} \${REENTRANT}
BODY

END_BODY`;
}

function moduleWith(s: string): string {
  return `${TOKEN_MODULE}
${s}
${TOKEN_END_MODULE}\n`;
}

export function emptyFileOptions(): Completion[] {
  return [
    {
      apply: snippet(moduleWith(skeletonSeq(TOKEN_SEQUENCE))),
      label: 'MODULE_WITH_SEQUENCE',
      type: 'function',
    },
    {
      apply: snippet(moduleWith('')),
      label: 'MODULE',
      type: 'function',
    },
  ];
}

export function structureSnippets(timePrefix: string) {
  return [
    {
      label: 'Insert WHILE loop',
      snippetText: `${timePrefix}WHILE \${condition} DO\nR00:00:00.00 END_WHILE`,
    },
    {
      label: 'Insert FOR loop',
      snippetText: `${timePrefix}FOR i := \${start} TO \${end} STEP \${step} DO\nR00:00:00.00 END_FOR`,
    },
    {
      label: 'Insert IF conditional',
      snippetText: `${timePrefix}IF \${condition1} THEN\nR00:00:00.00 ELSE_IF \${condition2} THEN\nR00:00:00.00 ELSE\nR00:00:00.00 END_IF`,
    },
  ].map(({ label, snippetText }) => ({
    apply: snippet(snippetText),
    label,
    section: 'Command',
    type: 'function',
  }));
}

export const SEQUENCE_SNIPPETS = [TOKEN_BLOCK, TOKEN_ABSOLUTE_SEQUENCE, TOKEN_RELATIVE_SEQUENCE, TOKEN_SEQUENCE].map(
  seqType => ({
    apply: snippet(`${seqType} \${function_name}
FLAGS \${AUTOEXECUTE} \${AUTOUNLOAD} \${REENTRANT}
BODY

END_BODY`),
    label: seqType,
    type: 'function',
  }),
);
