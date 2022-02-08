/**
 * Transforms a list of violation windows in microseconds by a given offset time.
 * The offsetTime argument should be in milliseconds.
 */
export function offsetViolationWindows(
  violations: ConstraintViolation[],
  offsetTime: number,
): ConstraintViolation[] {
  return violations.map(violation => ({
    ...violation,
    windows: violation.windows.map(({ end, start }) => {
      return {
        end: offsetTime + end / 1000,
        start: offsetTime + start / 1000,
      };
    }),
  }));
}
