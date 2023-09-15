export enum Status {
  Canceled = 'Canceled',
  Complete = 'Complete',
  Failed = 'Failed',
  Incomplete = 'Incomplete',
  Modified = 'Modified',
  Pending = 'Pending',
  PartialSuccess = 'PartialSuccess',
}

export const statusColors: Record<string, string> = {
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
    return statusColors.gray;
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
