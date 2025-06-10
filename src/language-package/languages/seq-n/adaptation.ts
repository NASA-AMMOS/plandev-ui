import { outputLinter } from "../../interfaces/legacy";
import type { NewAdaptationInterface } from "../../interfaces/new-adaptation-interface";
import { setupLanguageSupport } from "./seq-n";
import { sequenceCompletion } from "./sequence-completion";
import { seqnLinter } from "./sequence-linter";

export const defaultAdaptation: NewAdaptationInterface = {
    "extension": context => [
        setupLanguageSupport(sequenceCompletion(
            context.channelDictionary,
            context.commandDictionary,
            context.parameterDictionaries,
            [], // TODO: Library sequences
            // TODO: Sequence adaptation needs to be refactored out?
        )),
        seqnLinter(
            [], // TODO: globals
            context.channelDictionary,
            context.commandDictionary,
            context.parameterDictionaries,
            [], // TODO: library sequences
        )
    ],
    "outputExtension": context => [
        outputLinter(context.commandDictionary),
    ],
}
