import { indentService } from "@codemirror/language";
import { EditorView } from "codemirror";
import { debounce } from "lodash-es";
import { outputLinter } from "../../interfaces/legacy";
import type { NewAdaptationInterface } from "../../interfaces/new-adaptation-interface";
import { setupLanguageSupport } from "./seq-n";
import { seqNHighlightBlock, seqqNBlockHighlighter } from "./seq-n-highlighter";
import { sequenceAutoIndent } from "./sequence-autoindent";
import { sequenceCompletion } from "./sequence-completion";
import { seqnLinter } from "./sequence-linter";
import { sequenceTooltip } from "./sequence-tooltip";

const debouncedSeqNHighlightBlock = debounce(seqNHighlightBlock, 250);

export const defaultAdaptation: NewAdaptationInterface = {
    "extension": context => [
        setupLanguageSupport(sequenceCompletion(
            context.channelDictionary,
            context.commandDictionary,
            context.parameterDictionaries,
            [], // TODO: Library sequences
        )),
        seqnLinter(
            [], // TODO: globals
            context.channelDictionary,
            context.commandDictionary,
            context.parameterDictionaries,
            [], // TODO: library sequences
        ),
        sequenceTooltip(
            context.channelDictionary,
            context.commandDictionary,
            context.parameterDictionaries,
        ),
        indentService.of(sequenceAutoIndent()),
        [
          EditorView.updateListener.of(debouncedSeqNHighlightBlock),
          seqqNBlockHighlighter,
        ],
    ],
    "outputExtension": context => [
        outputLinter(context.commandDictionary),
    ],
}
