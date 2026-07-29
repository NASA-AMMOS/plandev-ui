import type { Model } from '../types/model';

/**
 * What PlanDev may DO with a mission model, as opposed to what the model is.
 *
 * A model's activity and resource types describe its shape. They say nothing about which PlanDev
 * features apply to it, and for a model served by an external backend the answer genuinely differs
 * in ways nothing here could infer. A backend that places its own activities during simulation
 * produces a schedule as an OUTPUT; running PlanDev's scheduler against it would put two schedulers
 * on one plan. Nothing in its declared types distinguishes that from a pure simulator.
 *
 * So the backend declares it, merlin stores it in `mission_model.external_capabilities`, and this
 * module reads it. The one rule that matters here: **nothing in the UI may branch on which
 * framework a model belongs to.** A capability carries the backend's own `reason`, and that string
 * is what the user is shown -- so adding a framework never means editing this file.
 */

/** PlanDev's own scheduler may place activities in plans using this model. */
export const PLANDEV_SCHEDULING = 'plandevScheduling';
/** The backend can read its framework's native plan format and hand back directives. */
export const PLAN_IMPORT = 'planImport';

export type ModelCapability = {
  /** Present and false on an unsupported capability: the backend's own explanation, shown verbatim. */
  reason?: string | null;
  supported: boolean;
} & Record<string, unknown>;

export type ModelCapabilities = Record<string, ModelCapability>;

/** One format a backend accepts for plan import, as it describes itself. */
export type PlanImportFormat = {
  extensions?: string[];
  key: string;
  label: string;
};

type CapabilityHolder = Pick<Model, 'external_capabilities' | 'model_type'> | null | undefined;

/**
 * A JAR model's capabilities are not in question -- it is compiled against PlanDev and everything
 * applies. Only an external model has an answer worth reading, and an external model that has not
 * declared one is treated as supporting nothing.
 */
function capabilities(model: CapabilityHolder): ModelCapabilities | null {
  if (!model || model.model_type !== 'external') {
    return null;
  }
  return (model.external_capabilities as ModelCapabilities | null | undefined) ?? {};
}

/**
 * Why `capability` is unavailable for `model`, or null when it is available.
 *
 * Returning the SENTENCE rather than a boolean is the point. Three cases reach a user, and they
 * have three different remedies, so collapsing them to "unavailable" sends people to fix the wrong
 * thing -- or to fix nothing, because they cannot tell there is anything to fix.
 */
export function capabilityUnavailableReason(capability: string, model: CapabilityHolder): string | null {
  const declared = capabilities(model);
  if (declared === null) {
    return null; // a JAR model: everything applies
  }

  const entry = declared[capability];
  if (entry === undefined) {
    // Either the backend predates capabilities or the model has not been re-introspected since.
    // Unknown is treated as unsupported -- the safe direction -- but reported as unknown, because
    // unlike the other two this one has a remedy.
    return (
      'This model’s backend has not declared whether this feature applies to it, so it is ' +
      'treated as unavailable. Re-introspect the model to pick up its declared capabilities.'
    );
  }
  if (entry.supported) {
    return null;
  }
  return entry.reason?.trim() || 'This model’s backend reports that this feature does not apply to it.';
}

export function isCapabilitySupported(capability: string, model: CapabilityHolder): boolean {
  return capabilityUnavailableReason(capability, model) === null;
}

/**
 * The formats a model's backend accepts for plan import. Empty unless the capability is supported,
 * so a caller can drive a file picker straight off this without checking twice.
 */
export function planImportFormats(model: CapabilityHolder): PlanImportFormat[] {
  if (!isCapabilitySupported(PLAN_IMPORT, model)) {
    return [];
  }
  const entry = capabilities(model)?.[PLAN_IMPORT];
  const formats = entry?.formats;
  return Array.isArray(formats) ? (formats as PlanImportFormat[]) : [];
}
