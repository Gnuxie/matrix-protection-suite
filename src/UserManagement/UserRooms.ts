/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { RoomEvent } from '../MatrixTypes/Events';
import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';
import { PolicyRoomManager } from '../PolicyList/PolicyRoomManger';
import { ProtectedRoomsSet } from '../Protection/ProtectedRoomsSet';
import { EventReport } from '../Reporting/EventReport';
import { RoomMembershipManager } from '../StateTracking/RoomMembershipManager';
import { RoomStateManager } from '../StateTracking/StateRevisionIssuer';
import { JoinedRoomsRevision } from './JoinedRoomsRevision';

/**
 * This is a utility to aid clients using the protection suite.
 * The idea being that if they create this utility, then they
 * only need to be responsible for setting up and informing
 * `UserRooms` of events. Everything else will be handled for them.
 * In other words `UserRooms` can be used to inform all protectedRoomSets,
 * and all room state manager deriratives of new events.
 */
export interface UserRooms {
  handleTimelineEvent(roomID: StringRoomID, event: RoomEvent): void;
  handleEventReport(report: EventReport): void;
  /**
   * A room that is paused or will be parted from shortly will still temporarily report true.
   * Even if, in the case of parting, subsequent events will never be processed.
   * A room that is being joined, but is paused, will report true.
   * @param roomID The room to test whether the user is joined to.
   */
  isJoinedRoom(roomID: StringRoomID): boolean;
  readonly roomStateManager: RoomStateManager;
  readonly policyRoomManager: PolicyRoomManager;
  readonly roomMemberManager: RoomMembershipManager;
  readonly protectedRoomsSets: ProtectedRoomsSet[];
  readonly clientUserID: StringUserID;
}

export abstract class AbstractUserRooms implements UserRooms {
  constructor(
    public readonly clientUserID: StringUserID,
    public readonly roomStateManager: RoomStateManager,
    public readonly policyRoomManager: PolicyRoomManager,
    public readonly roomMemberManager: RoomMembershipManager,
    public readonly protectedRoomsSets: ProtectedRoomsSet[] = [],
    protected joinedRoomsRevision: JoinedRoomsRevision
  ) {
    // nothing to do.
  }

  public isJoinedRoom(roomID: StringRoomID): boolean {
    return this.joinedRoomsRevision.isJoinedRoom(roomID);
  }

  public handleTimelineEvent(roomID: StringRoomID, event: RoomEvent): void {
    this.roomStateManager.handleTimelineEvent(roomID, event);
    for (const set of this.protectedRoomsSets) {
      set.handleTimelineEvent(roomID, event);
    }
  }

  public handleEventReport(report: EventReport): void {
    for (const set of this.protectedRoomsSets) {
      set.handleEventReport(report);
    }
  }
}
