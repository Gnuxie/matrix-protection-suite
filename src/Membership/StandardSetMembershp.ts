// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import EventEmitter from 'events';
import { ActionResult, Ok, isError } from '../Interface/Action';
import { RoomMembershipRevision } from './MembershipRevision';
import {
  SetMembership,
  SetMembershipMirror,
  SetMembershipMirrorCord,
} from './SetMembership';
import {
  MembershipRevisionListener,
  RoomMembershipRevisionIssuer,
} from './MembershipRevisionIssuer';
import { RoomMembershipManager } from './RoomMembershipManager';
import {
  StringRoomID,
  MatrixRoomID,
} from '@the-draupnir-project/matrix-basic-types';

export class StandardSetMembership
  extends EventEmitter
  implements SetMembership
{
  private readonly issuers = new Map<
    StringRoomID,
    RoomMembershipRevisionIssuer
  >();

  private readonly revisionListener: MembershipRevisionListener<RoomMembershipRevision>;

  private constructor() {
    super();
    this.revisionListener = this.membershipRevision.bind(this);
  }
  getRevision(room: StringRoomID): RoomMembershipRevision | undefined {
    return this.issuers.get(room)?.currentRevision;
  }

  public static async create(
    roomMembershipManager: RoomMembershipManager,
    roomsSet: MatrixRoomID[]
  ): Promise<ActionResult<SetMembership>> {
    const setMembership = new StandardSetMembership();
    const issuerResults = await Promise.all(
      roomsSet.map((room) =>
        roomMembershipManager.getRoomMembershipRevisionIssuer(room)
      )
    );
    for (const result of issuerResults) {
      if (isError(result)) {
        return result.elaborate(
          `Unable to fetch a membership revision issuer while creating SetMembership`
        );
      } else {
        SetMembershipMirror.addRoom(setMembership, result.ok.room, result.ok);
      }
    }
    return Ok(setMembership);
  }

  public static blankSet(): StandardSetMembership {
    return new StandardSetMembership();
  }

  public [SetMembershipMirrorCord.addRoom](
    room: MatrixRoomID,
    issuer: RoomMembershipRevisionIssuer
  ): void {
    this.issuers.set(room.toRoomIDOrAlias(), issuer);
    issuer.on('revision', this.revisionListener);
  }
  public [SetMembershipMirrorCord.removeRoom](room: MatrixRoomID): void {
    const issuer = this.issuers.get(room.toRoomIDOrAlias());
    if (issuer === undefined) {
      return;
    }
    this.issuers.delete(room.toRoomIDOrAlias());
    issuer.off('revision', this.revisionListener);
  }
  public unregisterListeners(): void {
    for (const issuer of this.issuers.values()) {
      issuer.off('revision', this.revisionListener);
    }
  }
  public get allRooms(): RoomMembershipRevision[] {
    return [...this.issuers.values()].map((issuer) => issuer.currentRevision);
  }

  private membershipRevision(
    ...[nextRevision, changes, previousRevision]: Parameters<
      MembershipRevisionListener<RoomMembershipRevision>
    >
  ) {
    this.emit(
      'membership',
      nextRevision.room.toRoomIDOrAlias(),
      nextRevision,
      changes,
      previousRevision
    );
  }
}
