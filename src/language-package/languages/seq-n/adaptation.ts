import { outputLinter } from "../../interfaces/legacy";
import type { NewAdaptationInterface } from "../../interfaces/new-adaptation-interface";
import { setupLanguageSupport } from "./seq-n";
import { sequenceCompletion } from "./sequence-completion";

export const defaultAdaptation: NewAdaptationInterface = {
    "extension": context => [
        setupLanguageSupport(sequenceCompletion(
            context.channelDictionary,
            context.commandDictionary,
            context.parameterDictionaries,
            [], // TODO: Library sequences
            // TODO: Sequence adaptation needs to be refactored out?
        )),
    ],
    "outputExtension": context => [
        outputLinter(context.commandDictionary),
    ],
}
