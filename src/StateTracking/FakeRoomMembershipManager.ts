// Copyright (C) 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionError, ActionResult, Ok } from '../Interface/Action';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { MembershipEvent } from '../MatrixTypes/MembershipEvent';
import { StringRoomID } from '../MatrixTypes/StringlyTypedMatrix';
import { FakeRoomMembershipRevisionIssuer } from './FakeRoomMembershipRevisionIssuer';
import { RoomMembershipRevisionIssuer } from './MembershipRevisionIssuer';
import { RoomMembershipManager } from './RoomMembershipManager';

export class FakeRoomMembershipManager implements RoomMembershipManager {
  private readonly roomMembershipRevisionIssuers = new Map<
    StringRoomID,
    FakeRoomMembershipRevisionIssuer
  >();

  public constructor(
    roomMembershipRevisionIssuers: FakeRoomMembershipRevisionIssuer[] = []
  ) {
    for (const issuer of roomMembershipRevisionIssuers) {
      this.roomMembershipRevisionIssuers.set(
        issuer.room.toRoomIDOrAlias(),
        issuer
      );
    }
  }
  public async getRoomMembershipRevisionIssuer(
    room: MatrixRoomID
  ): Promise<ActionResult<RoomMembershipRevisionIssuer>> {
    const issuer = this.roomMembershipRevisionIssuers.get(
      room.toRoomIDOrAlias()
    );
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
      `The FakeRoomMembershipManager is not capable of fetching MembershipEvents`
    );
  }

  // These methods are for reflecting on the Fake side of the FakeRoomMembershipManager.
  public getFakeRoomMembershpRevisionIssuer(
    room: MatrixRoomID
  ): FakeRoomMembershipRevisionIssuer {
    const issuer = this.roomMembershipRevisionIssuers.get(
      room.toRoomIDOrAlias()
    );
    if (issuer === undefined) {
      throw new TypeError(
        `You haven't yet given the room ${room.toPermalink} to the FakeRoomMembershipManager`
      );
    }
    return issuer;
  }
}
