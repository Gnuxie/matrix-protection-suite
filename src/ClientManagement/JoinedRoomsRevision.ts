/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { Logger } from '../Logging/Logger';
import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';
import { Set as PersistentSet } from 'immutable';

const log = new Logger('JoinedRoomsRevision');

export interface JoinedRoomsChange {
  joined: StringRoomID[];
  parted: StringRoomID[];
  preemptivelyJoined: StringRoomID[];
}

export interface JoinedRoomsRevision {
  readonly allJoinedRooms: StringRoomID[];
  readonly clientUserID: StringUserID;
  isEmpty(): boolean;
  changesFromJoinedRooms(roomIDs: StringRoomID[]): JoinedRoomsChange;
  reviseFromJoinedRooms(roomIDs: StringRoomID[]): JoinedRoomsRevision;
  isJoinedRoom(roomID: StringRoomID): boolean;
  /**
   * Whether the Client has marked this room a preemptivelyJoined, with no event
   * that reflects that the client has joined in the timeline.
   * To be used to determine if a client can attempt to make requests about
   * the state of the room in caches. This should not be used to determine if
   * the client can be informed about timeline events in the room.
   * Specifically, this is used by the RoomStateManager.
   * @param roomID The room that the client may be preemptively joined to.
   */
  isPreemptivelyJoinedRoom(roomID: StringRoomID): boolean;
  reviseForPreemptiveJoin(roomID: StringRoomID): JoinedRoomsRevision;
}

export class StandardJoinedRoomsRevision {
  private constructor(
    public readonly clientUserID: StringUserID,
    private readonly joinedRooms: PersistentSet<StringRoomID>,
    private readonly preemptivelyJoinedRooms: PersistentSet<StringRoomID>
  ) {
    // nothing to do.
  }

  public get allJoinedRooms() {
    return [...this.joinedRooms];
  }

  public isEmpty(): boolean {
    return (
      this.joinedRooms.size === 0 && this.preemptivelyJoinedRooms.size === 0
    );
  }

  public isJoinedRoom(roomID: StringRoomID): boolean {
    return this.joinedRooms.has(roomID);
  }

  public isPreemptivelyJoinedRoom(roomID: StringRoomID): boolean {
    return (
      this.joinedRooms.has(roomID) || this.preemptivelyJoinedRooms.has(roomID)
    );
  }

  public changesFromJoinedRooms(roomIDs: StringRoomID[]): JoinedRoomsChange {
    const updatedJoinedRooms = new Set(roomIDs);
    return {
      joined: roomIDs.filter((roomID) => !this.joinedRooms.has(roomID)),
      parted: this.allJoinedRooms.filter(
        (roomID) => !updatedJoinedRooms.has(roomID)
      ),
      preemptivelyJoined: [],
    };
  }

  public reviseFromJoinedRooms(roomIDs: StringRoomID[]): JoinedRoomsRevision {
    const joinedRooms = PersistentSet(roomIDs);
    const nextPreemptivelyJoinedRooms = this.preemptivelyJoinedRooms.filter(
      (roomID) => !joinedRooms.has(roomID)
    );
    if (nextPreemptivelyJoinedRooms.size > 0) {
      log.warn(
        `There are ${this.preemptivelyJoinedRooms.size} preemptively joined rooms unaccounted for in a new revision. This is almost certainly a result of a critical failing by callers of ClientRooms['preemptTimelineJoin'].`
      );
    }
    return new StandardJoinedRoomsRevision(
      this.clientUserID,
      joinedRooms,
      // We have to clear the peemptively joined rooms each revision. Otherwise
      // we risk building up a lot of invalid state.
      PersistentSet()
    );
  }

  public reviseForPreemptiveJoin(roomID: StringRoomID): JoinedRoomsRevision {
    if (this.isPreemptivelyJoinedRoom(roomID)) {
      return this;
    } else {
      return new StandardJoinedRoomsRevision(
        this.clientUserID,
        this.joinedRooms,
        this.preemptivelyJoinedRooms.add(roomID)
      );
    }
  }

  public static blankRevision(clientUserID: StringUserID): JoinedRoomsRevision {
    return new StandardJoinedRoomsRevision(
      clientUserID,
      PersistentSet(),
      PersistentSet()
    );
  }
}
