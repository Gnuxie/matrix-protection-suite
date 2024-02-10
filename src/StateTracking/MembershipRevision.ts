// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 - 2021 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0

// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir

import { StaticDecode } from '@sinclair/typebox';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { MembershipEvent } from '../MatrixTypes/MembershipEvent';
import {
  StringEventID,
  StringUserID,
} from '../MatrixTypes/StringlyTypedMatrix';
import { MembershipChange } from './MembershipChange';

/**
 * A revision is a view of a Membership at a given moment in history.
 * This may even be a representation of multiple rooms aggregated together.
 */
export interface MembershipRevision {
  /**
   * Create a new revision from a series of `MembershipChange`'s
   * @param changes The changes to use as a basis for a new revision.
   * @returns A new `MembershipRevision`.
   */
  reviseFromChanges(changes: MembershipChange[]): MembershipRevision;
}

/**
 * A revision of a Matrix Room's memberships at a given moment in the room's history.
 */
export interface RoomMembershipRevision extends MembershipRevision {
  readonly room: MatrixRoomID;
  reviseFromChanges(changes: MembershipChange[]): RoomMembershipRevision;
  /**
   * Create a new revision from the state of the associated Matrix room.
   * @param state The state from the matrix room, obtained from `/state`.
   * @returns A new PolicyRoomRevision.
   */
  reviseFromMembership(
    membershipEvents: StaticDecode<typeof MembershipEvent>[]
  ): RoomMembershipRevision;
  /**
   * Calculate the changes to memberships contained in this revision based
   * on new room state.
   * @param state State events from /state.
   * @returns A list of changes to memberships.
   */
  changesFromMembership(
    state: StaticDecode<typeof MembershipEvent>[]
  ): MembershipChange[];
  hasEvent(eventID: StringEventID): boolean;
  members(): IterableIterator<MembershipChange>;
  membershipForUser(userID: StringUserID): MembershipChange | undefined;
}
