/**
 * Copyright (C) 2023-2024 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { ActionError, ActionResult, Ok } from '../Interface/Action';
import { StateEvent } from '../MatrixTypes/Events';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringRoomID } from '../MatrixTypes/StringlyTypedMatrix';
import {
  RoomStateManager,
  RoomStateRevisionIssuer,
} from './StateRevisionIssuer';

export class FakeRoomStateManager implements RoomStateManager {
  private readonly roomStateRevisionIssuers = new Map<
    StringRoomID,
    RoomStateRevisionIssuer
  >();

  public constructor(roomStateRevisionIssuers: RoomStateRevisionIssuer[] = []) {
    for (const issuer of roomStateRevisionIssuers) {
      this.roomStateRevisionIssuers.set(issuer.room.toRoomIDOrAlias(), issuer);
    }
  }

  public async getRoomStateRevisionIssuer(
    room: MatrixRoomID
  ): Promise<ActionResult<RoomStateRevisionIssuer>> {
    const issuer = this.roomStateRevisionIssuers.get(room.toRoomIDOrAlias());
    if (issuer === undefined) {
      return ActionError.Result(
        `Canont find the room ${room.toRoomIDOrAlias()}`
      );
    } else {
      return Ok(issuer);
    }
  }
  getRoomState(_room: MatrixRoomID): Promise<ActionResult<StateEvent[]>> {
    throw new TypeError(
      `The FakeRoomStateManager is not capable of fetching RoomState`
    );
  }
}
