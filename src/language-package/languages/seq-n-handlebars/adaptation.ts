import { indentService } from "@codemirror/language";
import { EditorView } from "codemirror";
import { debounce } from "lodash-es";
import type { LanguageAdaptation, NewAdaptationInterface } from "../../interfaces/new-adaptation-interface";
import { globals } from "../seq-n/global-types";
import { seqNBlockHighlighter, seqNHighlightBlock } from "../seq-n/seq-n-highlighter";
import { SeqNCommandInfoMapper, userSequenceToLibrarySequence } from "../seq-n/seq-n-tree-utils";
import { seqNFormat, sequenceAutoIndent } from "../seq-n/sequence-autoindent";
import { sequenceCompletion } from "../seq-n/sequence-completion";
import { seqnLinter } from "../seq-n/sequence-linter";
import { sequenceTooltip } from "../seq-n/sequence-tooltip";
import { setupLanguageSupport } from "./seq-n-handlebars";

const debouncedSeqNHighlightBlock = debounce(seqNHighlightBlock, 250);

const seqnAdaptation: LanguageAdaptation = {
    name: "SeqN (Template)",
    fileExtension: ".template.seqN.txt",
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
    getLibrarySequences: (sequence, workspaceId) => [userSequenceToLibrarySequence(sequence, workspaceId)]
}

export const defaultAdaptation: NewAdaptationInterface = {
    input: seqnAdaptation,
    outputs: [],
}
