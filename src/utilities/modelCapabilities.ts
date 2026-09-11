import type { Model } from '../types/model';

/**
 * What PlanDev may DO with a mission model, as opposed to what the model is.
 *
 * A model's activity and resource types describe its shape. They say nothing about which PlanDev
 * features apply to it, and for a model PlanDev did not compile the answer genuinely differs in ways
 * nothing here could infer. A model declared by an imported run has no simulator behind it at all,
 * so simulating is not slow or unavailable-for-now: it is not a thing that exists. Nothing in its
 * declared types says so.
 *
 * So the declaration says it, merlin stores it in `mission_model.external_capabilities`, and this
 * module reads it. The one rule that matters here: **nothing in the UI may branch on where a model
 * came from.** A capability carries its declaration's own `reason`, and that string is what the user
 * is shown -- so a new kind of model never means editing this file.
 */

/** PlanDev can run a simulation of this model. */
export const SIMULATION = 'simulation';
/** PlanDev's own scheduler may place activities in plans using this model. */
export const PLANDEV_SCHEDULING = 'plandevScheduling';

export type ModelCapability = {
  /** Present and false on an unsupported capability: the declaration's own explanation, verbatim. */
  reason?: string | null;
  supported: boolean;
} & Record<string, unknown>;

export type ModelCapabilities = Record<string, ModelCapability>;

type CapabilityHolder = Pick<Model, 'external_capabilities' | 'model_type'> | null | undefined;

/**
 * A JAR model's capabilities are not in question -- PlanDev compiled it and everything applies. Any
 * other model has an answer worth reading, and one that has declared nothing is treated as
 * supporting nothing.
 *
 * Keyed off `model_type !== 'jar'` rather than off a list of the kinds that exist today, so a kind
 * added later is read rather than silently treated as a JAR -- which is the failure that matters,
 * since it offers features the model cannot do.
 */
function capabilities(model: CapabilityHolder): ModelCapabilities | null {
  if (!model || model.model_type === 'jar' || model.model_type == null) {
    return null;
  }
  return (model.external_capabilities as ModelCapabilities | null | undefined) ?? {};
}

/**
 * Why `capability` is unavailable for `model`, or null when it is available.
 *
 * Returning the SENTENCE rather than a boolean is the point. Three cases reach a user and they are
 * not the same, so collapsing them to "unavailable" sends people to fix the wrong thing -- or to fix
 * nothing, because they cannot tell whether there is anything to fix.
 *
 *   declares it unsupported -> the declaration's own sentence. A property of the model.
 *   declares it supported   -> available.
 *   declares nothing        -> unavailable. Treated as unsupported, which is the safe direction,
 *                              and said in a way that does not claim to know why.
 */
export function capabilityUnavailableReason(capability: string, model: CapabilityHolder): string | null {
  const declared = capabilities(model);
  if (declared === null) {
    return null; // a JAR model, or a plan still loading: everything applies
  }

  const entry = declared[capability];
  if (entry === undefined) {
    return 'This model’s declaration does not say whether this feature applies to it, so it is treated as unavailable.';
  }
  if (entry.supported) {
    return null;
  }
  return entry.reason?.trim() || 'This model’s declaration reports that this feature does not apply to it.';
}

export function isCapabilitySupported(capability: string, model: CapabilityHolder): boolean {
  return capabilityUnavailableReason(capability, model) === null;
}
