import { testTree } from '@lezer/generator/dist/test';
import { readFileSync, readdirSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, it } from 'vitest';
import { SeqLanguage } from '../codemirror';

const caseDir = path.dirname(fileURLToPath(import.meta.url)) + '/../../tests/mocks/sequencing/grammar-cases';

for (const file of readdirSync(caseDir)) {
  if (!/\.txt$/.test(file)) {
    continue;
  }

  const name = /^[^.]*/.exec(file)![0];
  describe(name, () => {
    for (const { name, run } of fileTests(readFileSync(path.join(caseDir, file), 'utf8'), file)) {
      it(name, () => run(SeqLanguage.parser));
    }
  });
}

// modified version of function in @lezer/generator/dist/test
// lezer's fileTests strips whitespace off test strings which is bad for a whitespace delimited grammar
function fileTests(file: string, fileName: string, mayIgnore?: any) {
  const caseExpr = /\s*#[ \t]*(.*)(?:\r\n|\r|\n)([^]*?)==+>([^]*?)(?:$|(?:\r\n|\r|\n)+(?=#))/gy;
  const tests: any[] = [];
  let lastIndex = 0;
  const _loop_1 = function () {
    const m = caseExpr.exec(file);
    if (!m) {
      throw new Error('Unexpected file format in '.concat(fileName, ' around\n\n').concat(`${fileName}: ${lastIndex}`));
    }
    const text = m[2].trimStart(),
      expected = m[3].trim();
    const _a = /(.*?)(\{.*?\})?$/.exec(m[1]),
      name_2 = _a?.[1],
      configStr = _a?.[2];
    const config = configStr ? JSON.parse(configStr) : null;
    const strict = !/⚠|\.\.\./.test(expected);
    tests.push({
      config: config,
      configStr: configStr,
      expected: expected,
      name: name_2,
      run: function (parser: any) {
        testTree(parser.parse(text), expected, mayIgnore);
      },
      strict: strict,
      text: text,
    });
    lastIndex = m.index + m[0].length;
    if (lastIndex === file.length) {
      return 'break';
    }
  };
  for (;;) {
    const state_1 = _loop_1();
    if (state_1 === 'break') {
      break;
    }
  }
  return tests;
}
