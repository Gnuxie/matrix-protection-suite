// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

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
import {
  ProtectedRoomChangeType,
  ProtectedRoomsChangeListener,
  ProtectedRoomsConfig,
} from '../Protection/ProtectedRoomsConfig/ProtectedRoomsConfig';
import { Task } from '../Interface/Task';

export class StandardSetMembership
  extends EventEmitter
  implements SetMembership
{
  private readonly issuers = new Map<
    StringRoomID,
    RoomMembershipRevisionIssuer
  >();

  private readonly revisionListener: MembershipRevisionListener<RoomMembershipRevision>;
  private readonly protectedRoomsChangeListener: ProtectedRoomsChangeListener;

  private constructor(
    private readonly roomMembershipManager: RoomMembershipManager,
    private readonly protectedRoomsConfig: ProtectedRoomsConfig
  ) {
    super();
    this.revisionListener = this.membershipRevision.bind(this);
    this.protectedRoomsChangeListener = this.protectedRoomsListener.bind(this);
    this.protectedRoomsConfig.on('change', this.protectedRoomsChangeListener);
  }
  getRevision(room: StringRoomID): RoomMembershipRevision | undefined {
    return this.issuers.get(room)?.currentRevision;
  }

  public static async create(
    roomMembershipManager: RoomMembershipManager,
    protectedRoomsConfig: ProtectedRoomsConfig
  ): Promise<ActionResult<SetMembership>> {
    const setMembership = new StandardSetMembership(
      roomMembershipManager,
      protectedRoomsConfig
    );
    const results = await Promise.all(
      protectedRoomsConfig.allRooms.map((room) => setMembership.addRoom(room))
    );
    const failedResults = results.filter((result) => isError(result));
    if (failedResults.length > 0) {
      if (!isError(failedResults[1])) {
        // just make typescript happy.
        throw new TypeError('This is catastrophically wrong');
      }
      return failedResults[1];
    }
    return Ok(setMembership);
  }

  public async addRoom(room: MatrixRoomID): Promise<ActionResult<void>> {
    const issuerResult =
      await this.roomMembershipManager.getRoomMembershipRevisionIssuer(room);
    if (isError(issuerResult)) {
      return issuerResult;
    }
    this.issuers.set(room.toRoomIDOrAlias(), issuerResult.ok);
    issuerResult.ok.on('revision', this.revisionListener);
    return Ok(undefined);
  }
  public removeRoom(room: MatrixRoomID): void {
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
    this.protectedRoomsConfig.off('change', this.protectedRoomsChangeListener);
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

  private protectedRoomsListener(
    ...[room, changeType]: Parameters<ProtectedRoomsChangeListener>
  ): void {
    Task(
      (async (): Promise<ActionResult<void>> => {
        return changeType === ProtectedRoomChangeType.Added
          ? await this.addRoom(room)
          : Ok(this.removeRoom(room));
      })()
    );
  }
}
