// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult } from '../../Interface/Action';
import { MatrixRoomID } from '../../MatrixTypes/MatrixRoomReference';
import { StringRoomID } from '../../MatrixTypes/StringlyTypedMatrix';
import { SetMembership } from '../../Membership/SetMembership';
import { SetRoomState } from '../../StateTracking/SetRoomState';

export enum ProtectedRoomChangeType {
  Added = 'added',
  Removed = 'removed',
}

export type ProtectedRoomsChangeListener = (
  room: MatrixRoomID,
  changeType: ProtectedRoomChangeType
) => void;

export interface ProtectedRoomsManager {
  readonly allProtectedRooms: MatrixRoomID[];
  readonly setMembership: SetMembership;
  readonly setRoomState: SetRoomState;
  isProtectedRoom(roomID: StringRoomID): boolean;
  getProtectedRoom(roomID: StringRoomID): MatrixRoomID | undefined;
  addRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  removeRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  on(event: 'change', listener: ProtectedRoomsChangeListener): this;
  off(event: 'change', listener: ProtectedRoomsChangeListener): this;
  emit(
    event: 'change',
    ...args: Parameters<ProtectedRoomsChangeListener>
  ): void;
}
