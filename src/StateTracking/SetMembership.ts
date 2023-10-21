/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { ActionResult } from '../Interface/Action';
import { MatrixGlob } from '../MatrixTypes/MatrixGlob';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';
import { MembershipChange } from './MembershipChange';
import { RoomMembershipRevision } from './MembershipRevision';

export type SetMembershipListener = (
  roomID: StringRoomID,
  nextRevision: RoomMembershipRevision,
  changes: MembershipChange[],
  previousRevision: RoomMembershipRevision
) => void;

export declare interface SetMembership {
  addRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  removeRoom(room: MatrixRoomID): void;
  on(event: 'membership', listener: SetMembershipListener): this;
  off(event: 'membership', listener: SetMembershipListener): this;
  emit(
    event: 'membership',
    ...args: Parameters<SetMembershipListener>
  ): boolean;
  unregisterListeners(): void;
}