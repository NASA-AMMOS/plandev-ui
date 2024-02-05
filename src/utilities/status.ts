import { Status } from '../enums/status';

export const statusColors: Record<string, string> = {
  blue: '#2f80ed',
  gray: '#bec0c2',
  green: '#0eaf0a',
  orange: '#c58b00',
  red: '#db5139',
  yellow: '#e6b300',
};

/**
 * Helper function that maps a status to a color.
 */
export function getColorForStatus(status: Status | null): string {
  if (status === Status.Complete) {
    return statusColors.green;
  } else if (status === Status.Failed || status === Status.Canceled) {
    return statusColors.red;
  } else if (status === Status.Incomplete) {
    return statusColors.blue;
  } else if (status === Status.Unchecked) {
    return statusColors.yellow;
  } else if (status === Status.Modified) {
    return statusColors.yellow;
  } else if (status === Status.Pending) {
    return statusColors.gray;
  } else if (status === Status.PartialSuccess) {
    return statusColors.orange;
  } else {
    return statusColors.gray;
  }
}
