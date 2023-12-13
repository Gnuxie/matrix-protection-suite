/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';
import { JoinedRoomsChange, JoinedRoomsRevision } from './JoinedRoomsRevision';
import { UserRooms, UserRoomsRevisionListener } from './UserRooms';

// FIXME: Rename to intent management ASAP.
export interface UsersInRoomMap {
  isUserInRoom(userID: StringUserID, roomID: StringRoomID): boolean;
  getManagedUsersInRoom(roomID: StringRoomID): StringUserID[];
  getUserRooms(userID: StringUserID): UserRooms | undefined;
  addUserRooms(user: UserRooms): void;
  removeUserRooms(user: UserRooms): void;
}

export class StandardUsersInRoomMap implements UsersInRoomMap {
  private readonly userIDByRoom = new Map<StringRoomID, StringUserID[]>();
  private readonly userRoomsByUserID = new Map<StringUserID, UserRooms>();

  private readonly userRevisionListener: UserRoomsRevisionListener;

  constructor() {
    this.userRevisionListener = this.userRevisionListenerMethod.bind(this);
  }

  private addUserToRoom(roomID: StringRoomID, userID: StringUserID) {
    const entry = this.userIDByRoom.get(roomID);
    if (entry === undefined) {
      this.userIDByRoom.set(roomID, [userID]);
    } else {
      entry.push(userID);
    }
  }

  private removeUserFromRoom(roomID: StringRoomID, userID: StringUserID): void {
    const entry = this.userIDByRoom.get(roomID);
    if (entry == undefined) {
      return;
    }
    const nextEntry = entry.filter((user) => user !== userID);
    if (nextEntry.length === 0) {
      this.userIDByRoom.delete(roomID);
    } else {
      this.userIDByRoom.set(roomID, nextEntry);
    }
  }

  private userRevisionListenerMethod(
    revision: JoinedRoomsRevision,
    changes: JoinedRoomsChange
  ): void {
    for (const joinRoomID of changes.joined) {
      this.addUserToRoom(joinRoomID, revision.clientUserID);
    }
    for (const partRoomID of changes.parted) {
      this.removeUserFromRoom(partRoomID, revision.clientUserID);
    }
  }
  public addUserRooms(user: UserRooms): void {
    for (const roomID of user.currentRevision.allJoinedRooms) {
      this.addUserToRoom(roomID, user.clientUserID);
    }
    this.userRoomsByUserID.set(user.clientUserID, user);
    user.on('revision', this.userRevisionListener);
  }

  public removeUserRooms(user: UserRooms): void {
    for (const roomID of user.currentRevision.allJoinedRooms) {
      this.removeUserFromRoom(roomID, user.clientUserID);
    }
    this.userRoomsByUserID.delete(user.clientUserID);
    user.off('revision', this.userRevisionListener);
  }

  public isUserInRoom(userID: StringUserID, roomID: StringRoomID): boolean {
    const entry = this.userRoomsByUserID.get(userID);
    if (entry === undefined) {
      return false;
    } else {
      return entry.isJoinedRoom(roomID);
    }
  }

  public getUserRooms(userID: StringUserID): UserRooms | undefined {
    return this.userRoomsByUserID.get(userID);
  }

  public getManagedUsersInRoom(roomID: StringRoomID): StringUserID[] {
    return this.userIDByRoom.get(roomID) ?? [];
  }
}
