// Copyright (C) 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringRoomID } from '../MatrixTypes/StringlyTypedMatrix';
import {
  RoomStateRevision,
  RoomStateRevisionIssuer,
  StateChange,
} from './StateRevisionIssuer';

export type SetRoomStateListener = (
  roomID: StringRoomID,
  nextRevision: RoomStateRevision,
  changes: StateChange[],
  previousRevision: RoomStateRevision
) => void;

export const SetRoomStateMirrorCord = Object.freeze({
  addRoom: Symbol('addRoom'),
  removeRoom: Symbol('removeRoom'),
}) as Readonly<{
  readonly addRoom: unique symbol;
  readonly removeRoom: unique symbol;
}>;

export declare interface SetRoomState {
  [SetRoomStateMirrorCord.addRoom](
    room: MatrixRoomID,
    roomStateRevisionIssuer: RoomStateRevisionIssuer
  ): void;
  [SetRoomStateMirrorCord.removeRoom](room: MatrixRoomID): void;
  on(event: 'revision', listener: SetRoomStateListener): this;
  off(event: 'revision', listener: SetRoomStateListener): this;
  emit(event: 'revision', ...args: Parameters<SetRoomStateListener>): boolean;
  unregisterListeners(): void;
  allRooms: RoomStateRevision[];
  getRevision(room: StringRoomID): RoomStateRevision | undefined;
}

export const SetRoomStateMirror = Object.freeze({
  addRoom(
    setRoomState: SetRoomState,
    room: MatrixRoomID,
    revisionIssuer: RoomStateRevisionIssuer
  ): void {
    setRoomState[SetRoomStateMirrorCord.addRoom](room, revisionIssuer);
  },
  removeRoom(setRoomState: SetRoomState, room: MatrixRoomID): void {
    setRoomState[SetRoomStateMirrorCord.removeRoom](room);
  },
});
