/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { StringRoomID } from '../MatrixTypes/StringlyTypedMatrix';
import { Set as PersistentSet } from 'immutable';

export interface JoinedRoomsChange {
  joined: StringRoomID[];
  parted: StringRoomID[];
}

export interface JoinedRoomsRevision {
  readonly allJoinedRooms: StringRoomID[];
  isEmpty(): boolean;
  changesFromJoinedRooms(roomIDs: StringRoomID[]): JoinedRoomsChange;
  reviseFromJoinedRooms(roomIDs: StringRoomID[]): JoinedRoomsRevision;
  isJoinedRoom(roomID: StringRoomID): boolean;
}

export class StandardJoinedRoomsRevision {
  private constructor(
    private readonly joinedRooms: PersistentSet<StringRoomID>
  ) {
    // nothing to do.
  }

  public get allJoinedRooms() {
    return [...this.joinedRooms];
  }

  public isEmpty(): boolean {
    return this.joinedRooms.size === 0;
  }

  public isJoinedRoom(roomID: StringRoomID): boolean {
    return this.joinedRooms.has(roomID);
  }

  public changesFromJoinedRooms(roomIDs: StringRoomID[]): JoinedRoomsChange {
    const updatedJoinedRooms = new Set(roomIDs);
    return {
      joined: roomIDs.filter((roomID) => !this.joinedRooms.has(roomID)),
      parted: this.allJoinedRooms.filter(
        (roomID) => !updatedJoinedRooms.has(roomID)
      ),
    };
  }

  public reviseFromJoinedRooms(roomIDs: StringRoomID[]): JoinedRoomsRevision {
    return new StandardJoinedRoomsRevision(PersistentSet(roomIDs));
  }

  public static blankRevision(): JoinedRoomsRevision {
    return new StandardJoinedRoomsRevision(PersistentSet());
  }
}
