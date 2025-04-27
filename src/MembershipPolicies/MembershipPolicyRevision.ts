// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import {
  StringRoomID,
  StringUserID,
} from '@the-draupnir-project/matrix-basic-types';
import { PolicyRule, Recommendation } from '../PolicyList/PolicyRule';
import { PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { PolicyRuleChange } from '../PolicyList/PolicyRuleChange';
import {
  SetMembershipDelta,
  SetMembershipRevision,
} from '../Membership/SetMembershipRevision';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import { Revision } from '../PolicyList/Revision';
import { MembershipChange } from '../Membership/MembershipChange';
import { RoomMembershipRevision } from '../Membership/MembershipRevision';
import { SetRoomMembership } from '../Membership/SetRoomMembership';

// FIXME:
// Ok so we need a table for just present members, and their rooms that they are in
// and a table for present AND absent members with just userID and policies.
// but we will fill that information dynamically if it is requested on a per userID basis.

export type MemberPolicyMatches = {
  userID: StringUserID;
  policies: PolicyRule[];
};

export type MemberPolicyMatchesWithRooms = {
  rooms: StringRoomID[];
} & MemberPolicyMatches;

export type MemberPolicyMatch = {
  userID: StringUserID;
  policy: PolicyRule;
};

// we include the details of the policies so that they can be used directly
// by protections to ban things
export type MemberRoomMatch = {
  roomID: StringRoomID;
} & MemberPolicyMatches;

export type MembershipPolicyRevisionDelta = {
  addedMemberMatches: MemberPolicyMatch[];
  removedMemberMatches: MemberPolicyMatch[];
  addedMemberRoom: MemberRoomMatch[];
  removedMemberRoom: MemberRoomMatch[];
};

export interface MembershipPolicyRevision {
  readonly revision: Revision;
  /**
   * Is this the first revision that has been issued?
   */
  isBlankRevision(): boolean;
  allMembersWithRules(): MemberPolicyMatchesWithRooms[];
  allRulesMatchingMember(
    member: StringUserID,
    options: { type?: PolicyRuleType; recommendation?: Recommendation }
  ): PolicyRule[];
  memberMatches(userID: StringUserID): MemberPolicyMatchesWithRooms | undefined;
  reviseFromChanges(
    delta: MembershipPolicyRevisionDelta,
    setRoomMembership: SetRoomMembership
  ): MembershipPolicyRevision;
}

export interface SetMembershipPolicyRevision extends MembershipPolicyRevision {
  changesFromMembershipChanges(
    delta: SetMembershipDelta,
    policyRevision: PolicyListRevision
  ): MembershipPolicyRevisionDelta;
  changesFromPolicyChanges(
    changes: PolicyRuleChange[],
    setMembershipRevision: SetMembershipRevision
  ): MembershipPolicyRevisionDelta;
  changesFromInitialRevisions(
    policyRevision: PolicyListRevision,
    setMembershipRevision: SetMembershipRevision
  ): MembershipPolicyRevisionDelta;
  // Be wary implmementing this one, you will need to scan all rooms for
  // a given matches membership when a match is first created.
  changedFromRoomMembershipChanges(
    revision: RoomMembershipRevision,
    changes: MembershipChange[]
  ): MembershipPolicyRevisionDelta;
  reviseFromChanges(
    delta: MembershipPolicyRevisionDelta,
    setRoomMembership: SetRoomMembership
  ): SetMembershipPolicyRevision;
}
