// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult } from '../Interface/Action';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringRoomID } from '../MatrixTypes/StringlyTypedMatrix';
import { RoomStateRevision, StateChange } from './StateRevisionIssuer';

export type SetRoomStateListener = (
  roomID: StringRoomID,
  nextRevision: RoomStateRevision,
  changes: StateChange[],
  previousRevision: RoomStateRevision
) => void;

export declare interface SetRoomState {
  addRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  removeRoom(room: MatrixRoomID): void;
  on(event: 'revision', listener: SetRoomStateListener): this;
  off(event: 'revision', listener: SetRoomStateListener): this;
  emit(event: 'revision', ...args: Parameters<SetRoomStateListener>): boolean;
  unregisterListeners(): void;
  allRooms: RoomStateRevision[];
  getRevision(room: StringRoomID): RoomStateRevision | undefined;
}
