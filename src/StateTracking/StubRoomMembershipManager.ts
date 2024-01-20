/**
 * Copyright (C) 2023-2024 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { ActionError, ActionResult, Ok } from '../Interface/Action';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { MembershipEvent } from '../MatrixTypes/MembershipEvent';
import { StringRoomID } from '../MatrixTypes/StringlyTypedMatrix';
import { RoomMembershipRevisionIssuer } from './MembershipRevisionIssuer';
import { RoomMembershipManager } from './RoomMembershipManager';

export class StubRoomMembershipManager implements RoomMembershipManager {
  private readonly roomStateRevisionIssuers = new Map<
    StringRoomID,
    RoomMembershipRevisionIssuer
  >();

  public constructor(
    roomMembershipRevisionIssuers: RoomMembershipRevisionIssuer[] = []
  ) {
    for (const issuer of roomMembershipRevisionIssuers) {
      this.roomStateRevisionIssuers.set(issuer.room.toRoomIDOrAlias(), issuer);
    }
  }
  public async getRoomMembershipRevisionIssuer(
    room: MatrixRoomID
  ): Promise<ActionResult<RoomMembershipRevisionIssuer>> {
    const issuer = this.roomStateRevisionIssuers.get(room.toRoomIDOrAlias());
    if (issuer === undefined) {
      return ActionError.Result(
        `Canont find the room ${room.toRoomIDOrAlias()}`
      );
    }
    return Ok(issuer);
  }
  getRoomMembershipEvents(
    _room: MatrixRoomID
  ): Promise<ActionResult<MembershipEvent[]>> {
    throw new TypeError(
      `The StubRoomMembershipManager is not capable of fetching MembershipEvents`
    );
  }
}
