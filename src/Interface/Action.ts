/**
 * Copyright (C) 2022 Gnuxie <Gnuxie@protonmail.com>
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
/**
 * This is a utility specifically for validating user input, and reporting
 * what was wrong back to the end user in a way that makes sense.
 * We are trying to tell the user they did something wrong and what that is.
 * This is something completely different to a normal exception,
 * where we are saying to ourselves that our assumptions in our code about
 * the thing we're doing are completely wrong. The user never
 * should see exceptions as there is nothing they can do about it.
 *
 * TO be clear this is only used when the user has done something wrong
 * and we need to communicate that. It is not for any other situation.
 */
export type ActionResult<Ok, Error = ActionError> =
  | {
      ok: Ok;
      isOkay: true;
    }
  | {
      error: Error;
      isOkay: false;
    };

export function Ok<Ok>(ok: Ok): ActionResult<Ok, never> {
  return { ok, isOkay: true };
}

export function ResultError<Error>(error: Error): ActionResult<never, Error> {
  return { error, isOkay: false };
}

export function isOk<Ok, Error = ActionError>(
  result: ActionResult<Ok, Error>
): result is ActionResult<Ok, never> {
  return result.isOkay;
}

export function isError<Ok, Error = ActionError>(
  result: ActionResult<Ok, Error>
): result is ActionResult<never, Error> {
  return !result.isOkay;
}

export class ActionError {
  public constructor(public readonly message: string) {
    // nothing to do.
  }

  /**
   * Utility to wrap the error into a Result.
   * @param message The message for the CommandError.
   * @param _options This exists so that the method is extensible by subclasses. Otherwise they wouldn't be able to pass other constructor arguments through this method.
   * @returns A CommandResult with a CommandError nested within.
   */
  public static Result(
    message: string,
    _options = {}
  ): ActionResult<never, ActionError> {
    return ResultError(new ActionError(message));
  }
}
