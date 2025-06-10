import type { NewAdaptationInterface } from "../../interfaces/new-adaptation-interface";
import { setupVmlLanguageSupport } from "./vml";
import { vmlAutoComplete } from "./vml-adaptation";
import { vmlLinter } from "./vml-linter";

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
        )
    ],
    "outputExtension": context => [],
}