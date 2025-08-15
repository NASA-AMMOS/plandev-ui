import { EditorView } from "codemirror";
import { debounce } from "lodash-es";
import type { LanguageAdaptation, NewAdaptationInterface } from "../../interfaces/new-adaptation-interface";
import { setupVmlLanguageSupport, vmlBlockHighlighter, vmlHighlightBlock } from "./vml";
import { parseFunctionSignatures, vmlAutoComplete } from "./vml-adaptation";
import { vmlFormat } from "./vml-formatter";
import { vmlLinter } from "./vml-linter";
import { vmlTooltip } from "./vml-tooltip";
import { VmlCommandInfoMapper } from "./vml-tree-utils";

const debouncedVmlHighlightBlock = debounce(vmlHighlightBlock, 250);

const vmlAdaptation: LanguageAdaptation = {
    name: "VML",
    fileExtension: ".vml",
    editorExtension: context => [
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
    getLibrarySequences: (sequence, workspaceId) => parseFunctionSignatures(sequence.definition, workspaceId)
}

export const defaultAdaptation: NewAdaptationInterface = {
    input: vmlAdaptation,
    outputs: [],
}
