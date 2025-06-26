import { EditorView } from "codemirror";
import { debounce } from "lodash-es";
import type { NewAdaptationInterface } from "../../interfaces/new-adaptation-interface";
import { setupVmlLanguageSupport, vmlBlockHighlighter, vmlHighlightBlock } from "./vml";
import { vmlAutoComplete } from "./vml-adaptation";
import { vmlFormat } from "./vml-formatter";
import { vmlLinter } from "./vml-linter";
import { vmlTooltip } from "./vml-tooltip";
import { VmlCommandInfoMapper } from "./vml-tree-utils";

const debouncedVmlHighlightBlock = debounce(vmlHighlightBlock, 250);

export const defaultAdaptation: NewAdaptationInterface = {
    extension: context => [
        setupVmlLanguageSupport(vmlAutoComplete(
            context.commandDictionary,
            [], // TODO: Globals?
            context.librarySequenceMap,
        )),
        vmlLinter(
            context.commandDictionary,
            context.librarySequenceMap,
            [], // TODO: globals?
        ),
        vmlTooltip(
            context.commandDictionary,
            context.librarySequenceMap,
        ),
        // indentService.of(adaptation.autoIndent()) // VML doesn't seem to have an indenter???
        [
          EditorView.updateListener.of(debouncedVmlHighlightBlock),
          vmlBlockHighlighter,
        ],
    ],
    commandInfoMapper: new VmlCommandInfoMapper(),
    format: vmlFormat,
    outputExtension: context => [],
}