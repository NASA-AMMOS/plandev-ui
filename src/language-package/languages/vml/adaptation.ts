import type { NewAdaptationInterface } from "../../interfaces/new-adaptation-interface";
import { setupVmlLanguageSupport } from "./vml";
import { vmlAutoComplete } from "./vml-adaptation";

export const defaultAdaptation: NewAdaptationInterface = {
    "extension": context => [
        setupVmlLanguageSupport(vmlAutoComplete(
            context.commandDictionary,
            [], // TODO: Globals?
            {}, // TODO: library sequences?
        )),

    ],
    "outputExtension": context => [],
}