/**
 * Copyright (C) 2023-2024 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { MembershipChange } from './MembershipChange';
import { RoomMembershipRevision } from './MembershipRevision';
import {
  MembershipRevisionListener,
  RoomMembershipRevisionIssuer,
} from './MembershipRevisionIssuer';
import { RoomStateMembershipRevisionIssuer } from './RoomStateMembershipRevisionIssuer';
import { RoomStateRevisionIssuer } from './StateRevisionIssuer';

export class FakeRoomMembershipRevisionIssuer
  extends RoomStateMembershipRevisionIssuer
  implements RoomMembershipRevisionIssuer
{
  private revisionLog: Parameters<
    MembershipRevisionListener<RoomMembershipRevision>
  >[] = [];
  public constructor(
    room: MatrixRoomID,
    currentRevision: RoomMembershipRevision,
    roomStateRevisionIssuer: RoomStateRevisionIssuer
  ) {
    super(room, currentRevision, roomStateRevisionIssuer);
  }

  public emit(
    event: 'revision',
    nextRevision: RoomMembershipRevision,
    changes: MembershipChange[],
    previousRevision: RoomMembershipRevision
  ): boolean {
    if (event === 'revision') {
      this.revisionLog.push([nextRevision, changes, previousRevision]);
    }
    return super.emit(event, nextRevision, changes, previousRevision);
  }

  // These methods are on the Fake's reflective side
  public getLastRevision(): Parameters<
    MembershipRevisionListener<RoomMembershipRevision>
  > {
    const revisionEntry = this.revisionLog.at(-1);
    if (revisionEntry === undefined) {
      throw new TypeError(`the revision log is empty`);
    }
    return revisionEntry;
  }

  public getNumberOfRevisions(): number {
    return this.revisionLog.length;
  }
}
