// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { StringUserID } from '@the-draupnir-project/matrix-basic-types';
import { PolicyRule, Recommendation } from '../PolicyList/PolicyRule';
import { PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { PolicyRuleChange } from '../PolicyList/PolicyRuleChange';
import { Revision } from '../PolicyList/Revision';
import { MembershipChange } from '../Membership/MembershipChange';
import { MembershipEvent } from '../MatrixTypes/MembershipEvent';
import { StaticDecode } from '@sinclair/typebox';

export type MemberPolicies = {
  userID: StringUserID;
  policies: PolicyRule[];
};

export interface MembershipPolicyRevision {
  readonly revisionID: Revision;
  /**
   * Is this the first revision that has been issued?
   */
  isBlankRevision(): boolean;
  allMembersWithRules(): MemberPolicies[];
  allRulesMatchingMember(
    member: StringUserID,
    options: { type?: PolicyRuleType; recommendation?: Recommendation }
  ): PolicyRule[];
  /**
   * @param type The PolicyRuleType to restrict the rules to.
   * @param recommendation A recommendation to also restrict the rules to.
   */
  allRulesOfType(
    type: PolicyRuleType,
    recommendation?: Recommendation
  ): MemberPolicies[];
  reviseFromPolicyChanges(
    changes: PolicyRuleChange[]
  ): MembershipPolicyRevision;
}

// I don't know if we need this, since we probably need a SetMembershipIssuer
// that just checks if someone is a member of any room in the protected rooms
// set.
export interface RoomMembershipPolicyRevision extends MembershipPolicyRevision {
  reviseFromMembershipChanges(
    changes: MembershipChange[]
  ): MembershipPolicyRevision;
  reviseFromMembership(
    membershipEvents: StaticDecode<typeof MembershipEvent>[]
  ): MembershipPolicyRevision;
}
