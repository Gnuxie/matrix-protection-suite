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

import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { ActionError, ActionResult, ResultError } from './Action';
import { ActionException, ActionExceptionKind } from './ActionException';

// might be best also to have a version of result with a room id that
// explains what we were trying to do ? not sure.
export interface RoomUpdateError extends ActionError {
  readonly room: MatrixRoomID;
}

export class RoomActionError extends ActionError implements RoomUpdateError {
  constructor(
    public readonly room: MatrixRoomID,
    message: string,
    context: string[] = []
  ) {
    super(message, context);
  }

  public static Result(
    message: string,
    { room }: { room: MatrixRoomID }
  ): ActionResult<never, PermissionError> {
    return ResultError(new PermissionError(room, message));
  }

  public static fromActionError(
    room: MatrixRoomID,
    error: ActionError
  ): RoomUpdateError {
    if (error instanceof ActionException) {
      return RoomUpdateException.fromActionException(room, error);
    } else if (error instanceof RoomActionError) {
      return error;
    } else {
      return new RoomActionError(room, error.message, error.getContext());
    }
  }
}

export class PermissionError extends RoomActionError {
  constructor(room: MatrixRoomID, message: string) {
    super(room, message);
  }
}

export class RoomUpdateException
  extends ActionException
  implements RoomUpdateError
{
  constructor(
    public readonly room: MatrixRoomID,
    ...args: ConstructorParameters<typeof ActionException>
  ) {
    super(...args);
  }

  public static Result<Ok>(
    message: string,
    options: {
      exception: Error;
      exceptionKind: ActionExceptionKind;
      room: MatrixRoomID;
    }
  ): ActionResult<Ok, RoomUpdateException> {
    return ResultError(
      new RoomUpdateException(
        options.room,
        options.exceptionKind,
        options.exception,
        message
      )
    );
  }

  public static fromActionException(
    room: MatrixRoomID,
    error: ActionException
  ): RoomUpdateException {
    return new RoomUpdateException(
      room,
      error.exceptionKind,
      error.exception,
      error.message,
      {
        uuid: error.uuid,
        suppressLog: true,
        context: error.getContext(),
      }
    );
  }
}
