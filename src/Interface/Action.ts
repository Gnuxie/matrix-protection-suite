/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 *
 * However, this file is modified and the modifications in this file
 * are NOT distributed, contributed, committed, or licensed under the Apache License.
 */

type ActionResultOk<Ok> = {
  ok: Ok;
  isOkay: true;
  match: typeof match;
};

type ActionResultError<Error = ActionError> = {
  error: Error;
  isOkay: false;
  match: typeof match;
  addContext: typeof addContext;
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
  return { error, isOkay: false, match, addContext };
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

function addContext<Error extends ActionError = ActionError>(
  this: ActionResultError<Error>,
  message: string
): ActionResultError<Error> {
  this.error.addContext(message);
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
  private readonly context: string[] = new Array(0);
  public constructor(public readonly message: string) {
    // nothing to do.
  }

  /**
   * Convienant factory method to wrap an `ActionError` into an `ActionResult`.
   * @param message The message for the `ActionError` that concisely describes the problem.
   * @param _options This exists so that the method is extensible by subclasses.
   * Otherwise they wouldn't be able to pass other constructor arguments through this method.
   * @returns An `ActionResult` with a `ActionError` as the `Error` value.
   */
  public static Result(
    message: string,
    _options = {}
  ): ActionResult<never, ActionError> {
    return ResultError(new ActionError(message));
  }

  /**
   * Add some context to the ActionError as it is passed down the stack.
   * @param message A short message to contextualise the action, e.g. something
   * in future tense. e.g. `Watch the list {list.toPermalink()}`.
   * @returns This ActionError.
   */
  public addContext(message: string): this {
    this.context.push(message);
    return this;
  }
}
