import type { ExternalEvent, ExternalEventId, ExternalEventPkey, ExternalEventType } from '../types/external-event';
import type {
  DerivationGroup,
  ExternalSourcePkey,
  ExternalSourceSlim,
  ExternalSourceType,
} from '../types/external-source';

// External Event Row/Hash Functions
export function getExternalEventWholeRowId(externalEvent: ExternalEvent): ExternalEventId {
  return getExternalEventRowId(externalEvent.pkey);
}

export function getExternalEventRowId(externalEventPkey: ExternalEventPkey): ExternalEventId {
  return `${externalEventPkey.derivation_group_name}${externalEventPkey.source_key}${externalEventPkey.event_type_name}${externalEventPkey.key}`;
}

export function getExternalEventTypeRowId(externalEventType: ExternalEventType): string {
  return externalEventType.name;
}

// External Source Row/Hash Functions
export function getExternalSourceSlimRowId(externalSourceSlim: ExternalSourceSlim): string {
  return `${externalSourceSlim.derivation_group_name}${externalSourceSlim.key}`;
}

export function getExternalSourceRowId(externalSourcePkey: ExternalSourcePkey): string {
  return `${externalSourcePkey.derivation_group_name}${externalSourcePkey.key}`;
}

export function getDerivationGroupRowId(derivationGroup: DerivationGroup): string {
  return `${derivationGroup.name}${derivationGroup.source_type_name}`;
}

export function getExternalSourceTypeRowId(externalSourceType: ExternalSourceType): string {
  return externalSourceType.name;
}
