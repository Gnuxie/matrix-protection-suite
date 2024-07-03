// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

/**
 * An ActionResult indicating success.
 */
type ActionResultOk<Ok> = {
  ok: Ok;
  isOkay: true;
  match: typeof match;
};

/**
 * An ActionResult indicating failure.
 */
type ActionResultError<Error = ActionError> = {
  error: Error;
  isOkay: false;
  match: typeof match;
  /**
   * Add context to an action result as it is passed down the stack.
   */
  elaborate: typeof elaborate;
};

/**
 * The action result is a Result type that can be used for any interface that
 * carries out a failable action. The idea being that any errors will be
 * caught be the implementation of the interface and documented in an `ActionError`.
 * This means that interfaces do not need to depend on the exact interface of
 * any Errors and Exceptions that can be thrown by an implementation.
 * As it is often impossible to know their interface.
 * Additionally, this also provides a consistent way to describe what went wrong
 * to a user of the application that can also be referenced in log files.
 *
 * @typeParam Ok The result if the action was a success.
 * @typeParam Error The result if the action was a failure.
 * @see {@link Ok}
 * @see {@link isOk}
 * @see {@link ResultError}
 * @see {@link isError}
 */
export type ActionResult<Ok, Error = ActionError> =
  | ActionResultOk<Ok>
  | ActionResultError<Error>;

/**
 * @param ok The value indicating a successful result.
 * @returns Return an ActionResult that was a success with the value ok.
 */
export function Ok<Ok>(ok: Ok): ActionResult<Ok, never> {
  return { ok, isOkay: true, match };
}

/**
 * @param error The value indicating a failed result.
 * @returns An `ActionResult` that was a failure with the error value.
 */
export function ResultError<Error>(error: Error): ActionResult<never, Error> {
  return { error, isOkay: false, match, elaborate };
}

/**
 * Check an `ActionResult` was a success, can be used as a type assertion.
 * @param result An `ActionResult` to check the success of.
 * @returns `true` if the `ActionResult` was a success.
 */
export function isOk<Ok, Error = ActionError>(
  result: ActionResult<Ok, Error>
): result is ActionResultOk<Ok> {
  return result.isOkay;
}

/**
 * Check an `ActionResult` was a failure, can be used as a type assertion.
 * @param result The `ActionResult` to check the success of.
 * @returns `true` if the `ActionResult` was a failure.
 */
export function isError<Ok, Error = ActionError>(
  result: ActionResult<Ok, Error>
): result is ActionResultError<Error> {
  return !result.isOkay;
}

function elaborate<Error extends ActionError = ActionError>(
  this: ActionResultError<Error>,
  message: string
): ActionResultError<Error> {
  this.error.elaborate(message);
  return this;
}

function match<T, Ok, Error = ActionError>(
  this: ActionResult<Ok, Error>,
  ok: (ok: Ok) => T,
  error: (error: Error) => T
): T {
  if (isError(this)) {
    return error(this.error);
  } else {
    return ok(this.ok);
  }
}

/**
 * An extensible representation of an Error that describes what went wrong in a
 * a standard way.
 * @see {@link ActionException}
 */
export class ActionError {
  public constructor(
    public readonly message: string,
    private readonly elaborations: string[] = []
  ) {
    // nothing to do.
  }

  /**
   * Convienant factory method to wrap an `ActionError` into an `ActionResult`.
   * @param message The message for the `ActionError` that concisely describes the problem.
   * @param _options This exists so that the method is extensible by subclasses.
   * Otherwise they wouldn't be able to pass other constructor arguments through this method.
   * @returns An `ActionResult` with a `ActionError` as the `Error` value.
   */
  public static Result(message: string, _options = {}): ActionResult<never> {
    return ResultError(new ActionError(message));
  }

  /**
   * Elaborate on an ActionError that has been passed down the call stack.
   * Since we may need to offer a better explanation in a higher level context.
   * For example, there may be an ActionException relating to a network error,
   * but there is no explanation for what the caller was attempting to do.
   * So we can use this in the caller code to elaborate on the error.
   * @param message A short message to contextualise the action,
   * For example: "Failed to join the provided policy room.".
   * @returns This ActionError.
   */
  public elaborate(message: string): this {
    this.elaborations.push(message);
    return this;
  }

  public getElaborations(): string[] {
    return this.elaborations;
  }

  public get mostRelevantElaboration(): string {
    return this.elaborations.at(-1) ?? this.message;
  }
}
