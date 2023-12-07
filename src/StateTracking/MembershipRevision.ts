/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019-2021 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 *
 * However, this file is modified and the modifications in this file
 * are NOT distributed, contributed, committed, or licensed under the Apache License.
 */

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
