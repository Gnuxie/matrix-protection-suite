/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import EventEmitter from 'events';
import { ActionResult, Ok, isError } from '../Interface/Action';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringRoomID } from '../MatrixTypes/StringlyTypedMatrix';
import { RoomMembershipRevision } from './MembershipRevision';
import { SetMembership } from './SetMembership';
import {
  MembershipRevisionListener,
  RoomMembershipRevisionIssuer,
} from './MembershipRevisionIssuer';
import { RoomMembershipManager } from './RoomMembershipManager';

export class StandardSetMembership
  extends EventEmitter
  implements SetMembership
{
  private readonly issuers = new Map<
    StringRoomID,
    RoomMembershipRevisionIssuer
  >();

  private readonly revisionListener: MembershipRevisionListener<RoomMembershipRevision>;

  constructor(private readonly roomMembershipManager: RoomMembershipManager) {
    super();
    this.revisionListener = this.membershipRevision.bind(this);
  }
  public async addRoom(room: MatrixRoomID): Promise<ActionResult<void>> {
    const issuerResult =
      await this.roomMembershipManager.getRoomMembershipRevisionIssuer(room);
    if (isError(issuerResult)) {
      return issuerResult;
    }
    this.issuers.set(room.toRoomIdOrAlias(), issuerResult.ok);
    issuerResult.ok.on('revision', this.revisionListener);
    return Ok(undefined);
  }
  public removeRoom(room: MatrixRoomID): void {
    const issuer = this.issuers.get(room.toRoomIdOrAlias());
    if (issuer === undefined) {
      return;
    }
    this.issuers.delete(room.toRoomIdOrAlias());
    issuer.off('revision', this.revisionListener);
  }
  public unregisterListeners(): void {
    for (const issuer of this.issuers.values()) {
      issuer.off('revision', this.revisionListener);
    }
  }

  private membershipRevision(
    ...[nextRevision, changes, previousRevision]: Parameters<
      MembershipRevisionListener<RoomMembershipRevision>
    >
  ) {
    this.emit(
      'membership',
      nextRevision.room.toRoomIdOrAlias(),
      nextRevision,
      changes,
      previousRevision
    );
  }
}
