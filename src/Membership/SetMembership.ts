// Copyright (C) 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringRoomID } from '../MatrixTypes/StringlyTypedMatrix';
import { MembershipChange } from './MembershipChange';
import { RoomMembershipRevision } from './MembershipRevision';
import { RoomMembershipRevisionIssuer } from './MembershipRevisionIssuer';

export type SetMembershipListener = (
  roomID: StringRoomID,
  nextRevision: RoomMembershipRevision,
  changes: MembershipChange[],
  previousRevision: RoomMembershipRevision
) => void;

export const SetMembershipMirrorCord = Object.freeze({
  addRoom: Symbol('addRoom'),
  removeRoom: Symbol('removeRoom'),
}) as Readonly<{
  readonly addRoom: unique symbol;
  readonly removeRoom: unique symbol;
}>;

export declare interface SetMembership {
  [SetMembershipMirrorCord.addRoom](
    room: MatrixRoomID,
    issuer: RoomMembershipRevisionIssuer
  ): void;
  [SetMembershipMirrorCord.removeRoom](room: MatrixRoomID): void;
  on(event: 'membership', listener: SetMembershipListener): this;
  off(event: 'membership', listener: SetMembershipListener): this;
  emit(
    event: 'membership',
    ...args: Parameters<SetMembershipListener>
  ): boolean;
  unregisterListeners(): void;
  allRooms: RoomMembershipRevision[];
  getRevision(room: StringRoomID): RoomMembershipRevision | undefined;
}

export const SetMembershipMirror = Object.freeze({
  addRoom(
    setMembership: SetMembership,
    room: MatrixRoomID,
    revisionIssuer: RoomMembershipRevisionIssuer
  ): void {
    setMembership[SetMembershipMirrorCord.addRoom](room, revisionIssuer);
  },
  removeRoom(setMembership: SetMembership, room: MatrixRoomID): void {
    return setMembership[SetMembershipMirrorCord.removeRoom](room);
  },
});
