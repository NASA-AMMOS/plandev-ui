/* eslint-disable sort-keys */
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
  Type: {
    INVALID_ABSOLUTE: -1,
    INVALID_ARGUMENT: -8,
    INVALID_ENUM: -6,
    INVALID_EPOCH: -2,
    INVALID_INT: -4,
    INVALID_NUMBER: -10,
    INVALID_RANGE: -7,
    INVALID_RELATIVE: -11,
    INVALID_UNSIGN_INTEGER: -5,
    MAX_ABSOLUTE: -12,
    MAX_EPOCH: -13,
    MAX_RELATIVE: -14,
    UNBALANCED: -9,
    UNCAUGHT_ARG: -3,
    UNCHECK_ARG: -15,
  },
  /**
   * InvalidAbsoluteTime error code and message.
   */
  InvalidAbsoluteTime: (): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.INVALID_ABSOLUTE,
      message: `Time Error: Incorrectly formatted absolute time string.
Received : Malformed Absolute time.
Expected: YYYY-DOYThh:mm:ss[.sss]`,
    };
  },

  /**
   * InvalidArgumentCount error code and message.
   */
  InvalidArgumentCount: (argName: string, repeatArgCount: number, min: number, max: number): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.INVALID_ARGUMENT,
      message: `Argument Count Error: The provided arguments for '${argName}' is outside the valid range.
Received: ${repeatArgCount} repeating arguments.
Expected: Repetition within the range of [${min}, ${max}]]`,
    };
  },

  /**
   * InvalidEnum error code and message.
   */
  InvalidEnum: (argName: string, argValue: string, expectedValue: string): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.INVALID_ENUM,
      message: `ENUM Error: '${argName}' Unexpected ENUM argument.
Received: ${argValue}
Expected: ${expectedValue}`,
    };
  },

  /**
   * InvalidEpochTime error code and message.
   */
  InvalidEpochTime: (): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.INVALID_EPOCH,
      message: `Time Error: Incorrectly formatted duration string.
Received: A malformed duration.
Expected: [+/-]hh:mm:ss[.sss] or [+/-]DDDThh:mm:ss[.sss]`,
    };
  },

  /**
   * InvalidInteger error code and message.
   */
  InvalidInteger: (argName: string, argValue: string): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.INVALID_INT,
      message: `Number Error: '${argName}' is not a integer.
Received: ${argValue}
Expected: An integer.`,
    };
  },

  /**
   * InvalidNumber error code and message.
   */
  InvalidNumber: (argName: string, argValue: string): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.INVALID_NUMBER,
      message: `Number Error: '${argName}' Invalid Argument Type
Received: ${argValue}
Expected: A valid number.`,
    };
  },

  /**
   * InvalidRange error code and message.
   */
  InvalidRange: (argName: string, argValue: number, min: number, max: number): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.INVALID_RANGE,
      message: `Range Error: '${argName}' Out of Bounds.
Received: ${argValue}
Expected: A number within the range of [${min}, ${max}]].`,
    };
  },

  /**
   * InvalidRelativeTime error code and message.
   */
  InvalidRelativeTime: (): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.INVALID_RELATIVE,
      message: `Time Error: Incorrectly formatted duration string.
Received: A malformed duration.
Expected: hh:mm:ss[.sss]`,
    };
  },

  /**
   * InvalidUnsignedInteger error code and message.
   */
  InvalidUnsignedInteger: (argName: string, argValue: string): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.INVALID_UNSIGN_INTEGER,
      message: `Number Error: '${argName}' is not unsigned.
Received: ${argValue}
Expected: A signed value`,
    };
  },

  /**
   * MaxAbsolutTime error code and message.
   */
  MaxAbsoluteTime: (balancedTime: string): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.MAX_ABSOLUTE,
      message: `Time Error: Maximum time reached
  Received: Balanced time - ${balancedTime}.
  Expected: ${balancedTime} <= 9999-365T23:59:59.999`,
    };
  },

  /**
   * MaxEpochTime error code and message.
   */
  MaxEpochTime: (balancedTime: string): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.MAX_EPOCH,
      message: `Time Error: Maximum time reached.
Received: Balanced time - ${balancedTime}.
Expected: ${balancedTime} <= 365T23:59:59.999`,
    };
  },

  /**
   * MaxRelativeTime error code and message.
   */
  MaxRelativeTime: (balancedTime: string): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.MAX_RELATIVE,
      message: `Time Error: Maximum time reached.
  Received: Balanced time - ${balancedTime}.
  Expected: ${balancedTime} <= 23:59:59.999`,
    };
  },
  /**
   * UnbalancedTime error code and message.
   */
  UnbalancedTime: (balancedTime: string): ErrorCode => {
    return {
      id: CustomErrorCodes.Type.UNBALANCED,
      message: `Time Warning: Unbalanced time used.
Suggestion: ${balancedTime}`,
    };
  },
  /**
   * UncaughtArgumentType error code and message.
   */
  UncaughtArgumentType: (): ErrorCode => {
    return { id: CustomErrorCodes.Type.UNCAUGHT_ARG, message: `Error: Command Argument Type Mismatch` };
  },
};
