/**
 * Represents an error code with an ID and a message.
 */
export type ErrorCode = {
  id: number;
  message: string;
};

/**
 * Contains custom error code definitions along with their error messages.
 */
export const CustomErrorCodes = {
  /**
   * InvalidAbsoluteTime error code and message.
   */
  InvalidAbsoluteTime: (): ErrorCode => {
    return {
      id: -1,
      message: `Time Error: Incorrectly formatted absolute time string.
Received : Malformed Absolute time.
Expected: YYYY-DOYThh:mm:ss[.sss]`,
    };
  },

  /**
   * InvalidArgumentCount error code and message.
   */
  InvalidArgumentCount: (repeatArgCount: number, min: number, max: number): ErrorCode => {
    return {
      id: -8,
      message: `Argument Count Error: The provided arguments for repetition is outside the valid range.
Received: ${repeatArgCount} repeating arguments.
Expected: Repetition within the range of [${min}, ${max}]]`,
    };
  },

  /**
   * InvalidEnum error code and message.
   */
  InvalidEnum: (argValue: string, expectedValue: string): ErrorCode => {
    return {
      id: -6,
      message: `ENUM Error: Unexpected ENUM argument.
Received: ${argValue}
Expected: ${expectedValue}`,
    };
  },

  /**
   * InvalidEpochTime error code and message.
   */
  InvalidEpochTime: (): ErrorCode => {
    return {
      id: -2,
      message: `Time Error: Incorrectly formatted duration string.
Received: A malformed duration.
Expected: [+/-]hh:mm:ss[.sss] or [+/-]DDDThh:mm:ss[.sss]`,
    };
  },

  /**
   * InvalidInteger error code and message.
   */
  InvalidInteger: (argValue: string): ErrorCode => {
    return {
      id: -4,
      message: `Number Error: Argument is not a integer.
Received: ${argValue}
Expected: An integer.`,
    };
  },

  /**
   * InvalidNumber error code and message.
   */
  InvalidNumber: (argValue: string): ErrorCode => {
    return {
      id: -4,
      message: `Number Error: Invalid Argument Type
Received: ${argValue}
Expected: A valid number.`,
    };
  },

  /**
   * InvalidRange error code and message.
   */
  InvalidRange: (argValue: number, min: number, max: number): ErrorCode => {
    return {
      id: -7,
      message: `Range Error: Argument Out of Bounds.
Received: ${argValue}
Expected: A number within the range of [${min}, ${max}]].`,
    };
  },

  /**
   * InvalidRelativeTime error code and message.
   */
  InvalidRelativeTime: (): ErrorCode => {
    return {
      id: -2,
      message: `Time Error: Incorrectly formatted duration string.
Received: A malformed duration.
Expected: hh:mm:ss[.sss]`,
    };
  },

  /**
   * InvalidUnsignedInteger error code and message.
   */
  InvalidUnsignedInteger: (argValue: string): ErrorCode => {
    return {
      id: -5,
      message: `Number Error: Argument is not unsigned.
Received: ${argValue}
Expected: A signed value`,
    };
  },

  /**
   * UncaughtArgumentType error code and message.
   */
  UncaughtArgumentType: (): ErrorCode => {
    return { id: -3, message: `Error: Command Argument Type Mismatch` };
  },
};
