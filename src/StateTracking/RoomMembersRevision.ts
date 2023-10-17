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

import { StateEvent } from '../MatrixTypes/Events';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { MembershipChange } from './MembershipChange';

/**
 * An interface for reading rules from a `PolicyListRevision`.
 */
export interface MembersRevisionView {
  room: MatrixRoomID;
}

/**
 * A revision is a view of a PolicyList at a given moment in the list's history.
 * This may even be a representation of multiple lists aggregated together.
 */
export interface MembersRevision extends MembersRevisionView {
  /**
   * Create a new revision from a series of `PolicyRuleChange`'s
   * @param changes The changes to use as a basis for a new revision.
   * @returns A new `PolicyListRevision`.
   */
  reviseFromChanges(changes: MembershipChange[]): MembersRevision;
}

/**
 * A revision of a PolicyRoom at a given moment in the room's history.
 */
export interface RoomMembersRevision extends MembersRevision {
  readonly room: MatrixRoomID;
  /**
   * Create a new revision from the state of the associated Matrix room.
   * @param policyState The state from the matrix room, obtained from `/state`.
   * @returns A new PolicyRoomRevision.
   */
  reviseFromState(policyState: StateEvent[]): RoomMembersRevision;
  /**
   * Calculate the changes to `PolicyRule`s contained in this revision based
   * on new room state.
   * @param state State events from /state.
   * @returns A list of changes to `PolicyRule`s.
   */
  changesFromState(state: StateEvent[]): MembershipChange[];
  /**
   * Check whether the list has a rule associated with this event.
   * @param eventId The id of a policy rule event.
   * @returns true if the revision contains a rule associated with the event.
   */
  hasEvent(eventId: string): boolean;
}
