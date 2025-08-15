import { indentService } from "@codemirror/language";
import { seqJsonToSeqn, seqnToSeqJson } from "@nasa-jpl/aerie-sequence-languages";
import { EditorView } from "codemirror";
import { debounce } from "lodash-es";
import type { LanguageAdaptation, NewAdaptationInterface, OutputLanguageAdaptation } from "../../interfaces/new-adaptation-interface";
import { globals } from "./global-types";
import { outputLinter } from "./output-linter";
import { SeqLanguage, setupLanguageSupport } from "./seq-n";
import { seqNBlockHighlighter, seqNHighlightBlock } from "./seq-n-highlighter";
import { SeqNCommandInfoMapper } from "./seq-n-tree-utils";
import { seqNFormat, sequenceAutoIndent } from "./sequence-autoindent";
import { sequenceCompletion } from "./sequence-completion";
import { seqnLinter } from "./sequence-linter";
import { sequenceTooltip } from "./sequence-tooltip";

const debouncedSeqNHighlightBlock = debounce(seqNHighlightBlock, 250);

const seqnAdaptation: LanguageAdaptation = {
    name: "SeqN",
    fileExtension: ".seqN.txt",
    editorExtension: context => [
        setupLanguageSupport(sequenceCompletion(
            context.channelDictionary,
            context.commandDictionary,
            context.parameterDictionaries,
            Object.values(context.librarySequenceMap),
        )),
        seqnLinter(
            globals,
            context.channelDictionary,
            context.commandDictionary,
            context.parameterDictionaries,
            Object.values(context.librarySequenceMap),
        ),
        sequenceTooltip(
            context.channelDictionary,
            context.commandDictionary,
            context.parameterDictionaries,
        ),
        indentService.of(sequenceAutoIndent()),
        [
            EditorView.updateListener.of(debouncedSeqNHighlightBlock),
            seqNBlockHighlighter,
        ],
    ],
    commandInfoMapper: new SeqNCommandInfoMapper(),
    format: seqNFormat,
}

const seqJsonAdaptation: OutputLanguageAdaptation = {
    name: "SeqJSON",
    fileExtension: ".seq.json",
    editorExtension: context => [
        outputLinter(context.commandDictionary),
    ],
    toOutputFormat(input, context, name) {
        return JSON.stringify(seqnToSeqJson(SeqLanguage.parser.parse(input), input, context.commandDictionary, name))
    },
    toInputFormat(output, context, name) {
        return seqJsonToSeqn(JSON.parse(output))
    },
}

export const defaultAdaptation: NewAdaptationInterface = {
    input: seqnAdaptation,
    outputs: [seqJsonAdaptation],
}
