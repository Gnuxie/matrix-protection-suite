/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 */

import { ActionError, ActionResult, ResultError } from './Action';

export class MultipleErrors extends ActionError {
  constructor(message: string, public readonly errors: ActionError[]) {
    super(message);
  }

  public static Result(
    message: string,
    { errors = [] }: { errors: ActionError[] }
  ): ActionResult<never, ActionError> {
    return ResultError(new MultipleErrors(message, errors));
  }
}
