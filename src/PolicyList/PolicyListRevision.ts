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

import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { PolicyRuleEvent, PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { PolicyRule, Recommendation } from './PolicyRule';
import { PolicyRuleChange } from './PolicyRuleChange';
import { Revision } from './Revision';

/** MSC3784 support. Please note that policy lists predate room types. So there will be lists in the wild without this type. */
export const POLICY_ROOM_TYPE = 'support.feline.policy.lists.msc.v1';
export const POLICY_ROOM_TYPE_VARIANTS = [POLICY_ROOM_TYPE];
export const SHORTCODE_EVENT_TYPE = 'org.matrix.mjolnir.shortcode';

/**
 * An interface for reading rules from a `PolicyListRevision`.
 */
export interface PolicyListRevisionView {
  /**
   * @returns all of the rules enacted by the policy list.
   */
  allRules(): PolicyRule[];
  /**
   * @param entity The entity that is being queried.
   * @param type Restrict the search to only rules of this `PolicyRuleType`.
   * @param recommendation The recommendation for the rule.
   * @returns The rules that are enacted against the entity in the policy list.
   */
  allRulesMatchingEntity(
    entity: string,
    type?: PolicyRuleType,
    recommendation?: Recommendation
  ): PolicyRule[];
  /**
   * @param type The PolicyRuleType to restrict the rules to.
   * @param recommendation A recommendation to also restrict the rules to.
   */
  allRulesOfType(
    type: PolicyRuleType,
    recommendation?: Recommendation
  ): PolicyRule[];
  /**
   * Find the first rule that matches the entity.
   * @param entity The entity to search a rule for.
   * @param type The rule type for the entity.
   * @param recommendation The recommendation that we are looking for.
   */
  findRuleMatchingEntity(
    entity: string,
    type: PolicyRuleType,
    recommendation: Recommendation
  ): PolicyRule | undefined;
}

/**
 * A revision is a view of a PolicyList at a given moment in the list's history.
 * This may even be a representation of multiple lists aggregated together.
 */
export interface PolicyListRevision extends PolicyListRevisionView {
  readonly revisionID: Revision;
  /**
   * Create a new revision from a series of `PolicyRuleChange`'s
   * @param changes The changes to use as a basis for a new revision.
   * @returns A new `PolicyListRevision`.
   */
  reviseFromChanges(changes: PolicyRuleChange[]): PolicyListRevision;
  /**
   * Is this the first revision that has been issued?
   */
  isBlankRevision(): boolean;
}

/**
 * A revision of a PolicyRoom at a given moment in the room's history.
 */
export interface PolicyRoomRevision extends PolicyListRevision {
  readonly room: MatrixRoomID;
  /**
   * Create a new revision from the state of the associated Matrix room.
   * @param policyState The state from the matrix room, obtained from `/state`.
   * @returns A new PolicyRoomRevision.
   */
  reviseFromState(policyState: PolicyRuleEvent[]): PolicyRoomRevision;
  /**
   * Calculate the changes to `PolicyRule`s contained in this revision based
   * on new room state.
   * @param state State events from /state.
   * @returns A list of changes to `PolicyRule`s.
   */
  changesFromState(state: PolicyRuleEvent[]): PolicyRuleChange[];
  /**
   * Check whether the list has a rule associated with this event.
   * @param eventId The id of a policy rule event.
   * @returns true if the revision contains a rule associated with the event.
   */
  hasEvent(eventId: string): boolean;
}
