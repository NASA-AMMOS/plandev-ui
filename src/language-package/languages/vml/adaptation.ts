import type { NewAdaptationInterface } from "../../interfaces/new-adaptation-interface";
import { setupVmlLanguageSupport } from "./vml";
import { vmlAutoComplete } from "./vml-adaptation";
import { vmlLinter } from "./vml-linter";
import { vmlTooltip } from "./vml-tooltip";

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
        )
    ],
    "outputExtension": context => [],
}