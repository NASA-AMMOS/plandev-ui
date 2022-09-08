export enum Status {
  Complete = 'Complete',
  Failed = 'Failed',
  Incomplete = 'Incomplete',
  Modified = 'Modified',
  Pending = 'Pending',
}

export const statusColors: Record<string, string> = {
  gray: '#bec0c2',
  green: '#0eaf0a',
  red: '#db5139',
  yellow: '#e6b300',
};

/**
 * Helper function that maps a status to a color.
 */
export function getColorForStatus(status: Status): string {
  if (status === Status.Complete) {
    return statusColors.green;
  } else if (status === Status.Failed) {
    return statusColors.red;
  } else if (status === Status.Incomplete) {
    return statusColors.gray;
  } else if (status === Status.Modified) {
    return statusColors.yellow;
  } else if (status === Status.Pending) {
    return statusColors.gray;
  } else {
    return statusColors.gray;
  }
}
