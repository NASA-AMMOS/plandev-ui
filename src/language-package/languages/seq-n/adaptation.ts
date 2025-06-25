import { indentService } from "@codemirror/language";
import { outputLinter } from "../../interfaces/legacy";
import type { NewAdaptationInterface } from "../../interfaces/new-adaptation-interface";
import { setupLanguageSupport } from "./seq-n";
import { sequenceAutoIndent } from "./sequence-autoindent";
import { sequenceCompletion } from "./sequence-completion";
import { seqnLinter } from "./sequence-linter";
import { sequenceTooltip } from "./sequence-tooltip";

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
        indentService.of(sequenceAutoIndent())
    ],
    "outputExtension": context => [
        outputLinter(context.commandDictionary),
    ],
}
