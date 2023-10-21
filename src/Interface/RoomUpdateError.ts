/**
 * Copyright (C) 2022 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019 The Matrix.org Foundation C.I.C.

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

import { ActionError, ActionResult, ResultError } from './Action';
import { ActionException, ActionExceptionKind } from './ActionException';

// might be best also to have a version of result with a room id that
// explains what we were trying to do ? not sure.
export interface RoomUpdateError extends ActionError {
  readonly roomId: string;
}

export class PermissionError extends ActionError implements RoomUpdateError {
  constructor(public readonly roomId: string, message: string) {
    super(message);
  }
}

export class RoomUpdateException
  extends ActionException
  implements RoomUpdateError
{
  constructor(
    public readonly roomId: string,
    ...args: ConstructorParameters<typeof ActionException>
  ) {
    super(...args);
  }

  public static Result<Ok>(
    message: string,
    options: {
      exception: Error;
      exceptionKind: ActionExceptionKind;
      roomId: string;
    }
  ): ActionResult<Ok, RoomUpdateException> {
    return ResultError(
      new RoomUpdateException(
        options.roomId,
        options.exceptionKind,
        options.exception,
        message
      )
    );
  }
}
