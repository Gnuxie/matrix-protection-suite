// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { StringUserID } from '@the-draupnir-project/matrix-basic-types';
import { PolicyRule, Recommendation } from '../PolicyList/PolicyRule';
import { PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { PolicyRuleChange } from '../PolicyList/PolicyRuleChange';
import {
  SetMembershipDelta,
  SetMembershipRevision,
} from '../Membership/SetMembershipRevision';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import { Revision } from '../PolicyList/Revision';

export type MemberPolicyMatches = {
  userID: StringUserID;
  policies: PolicyRule[];
};

export type MemberPolicyMatch = {
  userID: StringUserID;
  policy: PolicyRule;
};

export type MemberPolicyChange = {
  addedMemberMatches: MemberPolicyMatch[];
  removedMemberMatches: MemberPolicyMatch[];
};

export type MembershipPolicyRevisionDelta = {
  changes: MemberPolicyChange[];
};

export interface MembershipPolicyRevision {
  readonly revision: Revision;
  /**
   * Is this the first revision that has been issued?
   */
  isBlankRevision(): boolean;
  allMembersWithRules(): MemberPolicyMatches[];
  allRulesMatchingMember(
    member: StringUserID,
    options: { type?: PolicyRuleType; recommendation?: Recommendation }
  ): PolicyRule[];
  reviseFromChanges(
    delta: MembershipPolicyRevisionDelta
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
  reviseFromChanges(
    delta: MembershipPolicyRevisionDelta
  ): SetMembershipPolicyRevision;
}
