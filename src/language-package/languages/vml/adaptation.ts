import { EditorView } from "codemirror";
import type { NewAdaptationInterface } from "../../interfaces/new-adaptation-interface";
import { setupVmlLanguageSupport, vmlBlockHighlighter, vmlHighlightBlock } from "./vml";
import { vmlAutoComplete } from "./vml-adaptation";
import { vmlLinter } from "./vml-linter";
import { vmlTooltip } from "./vml-tooltip";
import { debounce } from "lodash-es";

const debouncedVmlHighlightBlock = debounce(vmlHighlightBlock, 250);

export const defaultAdaptation: NewAdaptationInterface = {
    "extension": context => [
        setupVmlLanguageSupport(vmlAutoComplete(
            context.commandDictionary,
            [], // TODO: Globals?
            {}, // TODO: library sequences?
        )),
        vmlLinter(
            context.commandDictionary,
            {}, // TODO: library sequences?
            [], // TODO: globals?
        ),
        vmlTooltip(
            context.commandDictionary,
            {}, // TODO: library sequences
        ),
        // indentService.of(adaptation.autoIndent()) // VML doesn't seem to have an indenter???
        [
          EditorView.updateListener.of(debouncedVmlHighlightBlock),
          vmlBlockHighlighter,
        ],
    ],
    "outputExtension": context => [],
}