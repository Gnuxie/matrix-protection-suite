/**
 * Copyright (C) 2023-2024 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import EventEmitter from 'events';
import { RoomEvent } from '../MatrixTypes/Events';
import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';
import { JoinedRoomsChange, JoinedRoomsRevision } from './JoinedRoomsRevision';

// Finally someone found a solution to the interfaces of emitters that is pretty correct.
// I'm so happy.
// https://stackoverflow.com/a/61609010
export interface ClientRoomsEvents {
  revision: (
    revision: JoinedRoomsRevision,
    changes: JoinedRoomsChange,
    previousRevision: JoinedRoomsRevision
  ) => void;
  timeline: (roomID: StringRoomID, event: RoomEvent) => void;
}

/**
 * This is a utility to aid clients using the protection suite.
 * The idea being that if they create this utility, then they
 * only need to be responsible for setting up and informing
 * `ClientRooms` of events. Everything else will be handled for them.
 * In other words `ClientRooms` can be used to inform all protectedRoomSets,
 * and all room state manager deriratives of new events.
 *
 * Alternatively can be thought of as the "ClientRoomsRevisionIssuer".
 */
export declare interface ClientRooms {
  /**
   * A room that is paused or will be parted from shortly will still temporarily report true.
   * Even if, in the case of parting, subsequent events will never be processed.
   * A room that is being joined, but is paused, will report true.
   * @param roomID The room to test whether the user is joined to.
   */
  isJoinedRoom(roomID: StringRoomID): boolean;
  isPreemptivelyJoinedRoom(roomID: StringRoomID): boolean;
  readonly clientUserID: StringUserID;
  readonly currentRevision: JoinedRoomsRevision;
  handleTimelineEvent(roomID: StringRoomID, event: RoomEvent): void;
  /**
   * Sometimes it is necessary to preempt a join event that will appear in the
   * timeline from sync or appservice push. For example, immediately after
   * receiving a response from a homeserver when creating a room, joining a room
   * or accepting an invitation.
   * This will not give access to timeline events, or invoke a timeline pauser.
   * @param roomID The room we are certain that we have joined.
   */
  preemptTimelineJoin(roomID: StringRoomID): void;
  on<U extends keyof ClientRoomsEvents>(
    event: U,
    listener: ClientRoomsEvents[U]
  ): this;
  off<U extends keyof ClientRoomsEvents>(
    event: U,
    listener: ClientRoomsEvents[U]
  ): this;
  emit<U extends keyof ClientRoomsEvents>(
    event: U,
    ...args: Parameters<ClientRoomsEvents[U]>
  ): boolean;
}

export abstract class AbstractClientRooms
  extends EventEmitter
  implements Pick<ClientRooms, 'emit'>
{
  constructor(
    public readonly clientUserID: StringUserID,
    protected joinedRoomsRevision: JoinedRoomsRevision
  ) {
    super();
  }

  public get currentRevision() {
    return this.joinedRoomsRevision;
  }

  public isJoinedRoom(roomID: StringRoomID): boolean {
    return this.joinedRoomsRevision.isJoinedRoom(roomID);
  }

  public isPreemptivelyJoinedRoom(roomID: StringRoomID): boolean {
    return this.joinedRoomsRevision.isPreemptivelyJoinedRoom(roomID);
  }

  public preemptTimelineJoin(roomID: StringRoomID): void {
    const previousRevision = this.joinedRoomsRevision;
    this.joinedRoomsRevision =
      this.joinedRoomsRevision.reviseForPreemptiveJoin(roomID);
    this.emit(
      'revision',
      this.joinedRoomsRevision,
      {
        preemptivelyJoined: [roomID],
      },
      previousRevision
    );
  }
}
