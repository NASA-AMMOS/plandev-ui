import type { Status } from '../enums/status';
import { getHumanReadableStatus } from './status';

export function getConstraintStatus(status: Status | null): string {
  const readableStatus = getHumanReadableStatus(status);

  if (readableStatus === 'Partially Succeeded') {
    return 'Partially Checked';
  }

  return readableStatus;
}
