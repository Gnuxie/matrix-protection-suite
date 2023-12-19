/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';
import { JoinedRoomsChange, JoinedRoomsRevision } from './JoinedRoomsRevision';
import { ClientRooms, ClientRoomsRevisionListener } from './ClientRooms';

export interface ClientsInRoomMap {
  isClientInRoom(userID: StringUserID, roomID: StringRoomID): boolean;
  getManagedUsersInRoom(roomID: StringRoomID): StringUserID[];
  getClientRooms(userID: StringUserID): ClientRooms | undefined;
  addClientRooms(client: ClientRooms): void;
  removeClientRooms(client: ClientRooms): void;
}

export class StandardClientsInRoomMap implements ClientsInRoomMap {
  private readonly userIDByRoom = new Map<StringRoomID, StringUserID[]>();
  private readonly clientRoomsByUserID = new Map<StringUserID, ClientRooms>();

  private readonly userRevisionListener: ClientRoomsRevisionListener;

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
  public addClientRooms(client: ClientRooms): void {
    for (const roomID of client.currentRevision.allJoinedRooms) {
      this.addUserToRoom(roomID, client.clientUserID);
    }
    this.clientRoomsByUserID.set(client.clientUserID, client);
    client.on('revision', this.userRevisionListener);
  }

  public removeClientRooms(client: ClientRooms): void {
    for (const roomID of client.currentRevision.allJoinedRooms) {
      this.removeUserFromRoom(roomID, client.clientUserID);
    }
    this.clientRoomsByUserID.delete(client.clientUserID);
    client.off('revision', this.userRevisionListener);
  }

  public isClientInRoom(userID: StringUserID, roomID: StringRoomID): boolean {
    const entry = this.clientRoomsByUserID.get(userID);
    if (entry === undefined) {
      return false;
    } else {
      return entry.isJoinedRoom(roomID);
    }
  }

  public getClientRooms(userID: StringUserID): ClientRooms | undefined {
    return this.clientRoomsByUserID.get(userID);
  }

  public getManagedUsersInRoom(roomID: StringRoomID): StringUserID[] {
    return this.userIDByRoom.get(roomID) ?? [];
  }
}
