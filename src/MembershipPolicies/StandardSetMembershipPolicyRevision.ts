// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import {
  StringUserID,
  userServerName,
} from '@the-draupnir-project/matrix-basic-types';
import { PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import {
  SetMembershipChangeType,
  SetMembershipDelta,
  SetMembershipRevision,
} from '../Membership/SetMembershipRevision';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import { Recommendation, PolicyRule } from '../PolicyList/PolicyRule';
import { PolicyRuleChange } from '../PolicyList/PolicyRuleChange';
import {
  MemberPolicyMatch,
  MemberPolicyMatches,
  MembershipPolicyRevisionDelta,
  SetMembershipPolicyRevision,
} from './MembershipPolicyRevision';
import { Map as PerisstentMap, List } from 'immutable';
import { StandardPolicyListRevision } from '../PolicyList/StandardPolicyListRevision';
import { SimpleChangeType } from '../Interface/SimpleChangeType';
import { Revision } from '../PolicyList/Revision';

// TODO: It would be nice to have a method on PolicyListRevision that would
// let us pass a membership revision and have it run the matches for us
// the idea being that it could use literal values from literal rooms
// to lookup memberships. Alternatively we could have a method that
// returns all literal rules or all glob rules so that this can be hand
// optimized. But it's a little silly that way since we would probably
// have to then make a temporary revision from glob rules just to make it
// easier.

// TODO: Don't forget that when this is consumed by the user consequences capability
// that you need to do a check afterwards that the user didn't join more rooms
// while the capability was running, and if they did, keep removing them.
// however, doing so needs to consider the rooms that failed to remove e.g. because
// of permissions. can easily be done by comparing errors to remaining rooms.
// Worrying, it might be possible to evade a ban by joining rooms.
// Since the ban events have to take ages to come down sync before they get
// removed from the set revision, and if you join you can evade detection.
// So we might have to keep running the capability onMembershipChange when
// they join. Regardless of whether there are matching policies or not.
// Alternatively, we can just keep trying every time we get a join, which
// is probably going to cause a lot of duplicates unless we come up with
// something smart.
// Mutual excursion and checking repeatedly might not work because it takes
// time for the bans to come down sync and be processed. It might be possible
// to avoid that by keeping a small set of roomMembershipRevisionID's and successful
// room bans in a little list and simply compare and pop them off when we get
// the bans.

export class StandardSetMembershipPolicyRevision
  implements SetMembershipPolicyRevision
{
  readonly revision = new Revision();
  private constructor(
    private readonly memberPolicies: PerisstentMap<
      StringUserID,
      List<PolicyRule>
    >,
    private readonly policyMembers: PerisstentMap<
      PolicyRule,
      List<StringUserID>
    >
  ) {
    // nothing to do.
  }
  changesFromMembershipChanges(
    delta: SetMembershipDelta,
    policyRevision: PolicyListRevision
  ): MembershipPolicyRevisionDelta {
    const addedMatches: MemberPolicyMatch[] = [];
    const removedMatches: MemberPolicyMatch[] = [];
    for (const change of delta.changes) {
      if (change.changeType === SetMembershipChangeType.NoOverallChange) {
        continue;
      }
      const matchingRules = [
        ...policyRevision.allRulesMatchingEntity(
          change.userID,
          PolicyRuleType.User
        ),
        // hmm would it be better if the membership revision grouped users by server so that
        // we would only need to do server scans once?
        // i mean we'd have to do the complete scan when the user is joining a room we already have interned
        // but it'd at least avoid things when adding an entire room of users.
        // That being said, there aren't that many server rules...
        ...policyRevision.allRulesMatchingEntity(
          userServerName(change.userID),
          PolicyRuleType.Server
        ),
      ];
      if (change.changeType === SetMembershipChangeType.BecamePresent) {
        if (matchingRules.length !== 0) {
          for (const rule of matchingRules) {
            addedMatches.push({
              userID: change.userID,
              policy: rule,
            });
          }
        }
      } else {
        const matchingRules = this.memberPolicies.get(change.userID);
        if (matchingRules) {
          for (const rule of matchingRules) {
            removedMatches.push({
              userID: change.userID,
              policy: rule,
            });
          }
        }
      }
    }
    return {
      addedMemberMatches: addedMatches,
      removedMemberMatches: removedMatches,
    };
  }
  changesFromPolicyChanges(
    changes: PolicyRuleChange[],
    setMembershipRevision: SetMembershipRevision
  ): MembershipPolicyRevisionDelta {
    const removedMatches: MemberPolicyMatch[] = [];
    const policiesToRemove = changes
      .filter((change) => change.changeType !== SimpleChangeType.Added)
      .map((change) => {
        if (change.previousRule === undefined) {
          throw new TypeError(
            'Modified and Removed policies should have the previousRule field.'
          );
        }
        return change.previousRule;
      });
    for (const policy of policiesToRemove) {
      for (const userID of this.policyMembers.get(
        policy,
        List<StringUserID>()
      )) {
        removedMatches.push({
          userID,
          policy,
        });
      }
    }
    const relevantChangesForTemproaryRevision = changes
      .filter((change) => change.changeType !== SimpleChangeType.Removed)
      .map((change) =>
        change.changeType === SimpleChangeType.Modified
          ? { ...change, changeType: SimpleChangeType.Added }
          : change
      );
    const temporaryRevision =
      StandardPolicyListRevision.blankRevision().reviseFromChanges(
        relevantChangesForTemproaryRevision
      );
    const addedMatches: MemberPolicyMatch[] = [];
    for (const member of setMembershipRevision.presentMembers()) {
      const matchingRules = [
        ...temporaryRevision.allRulesMatchingEntity(
          member,
          PolicyRuleType.User
        ),
        ...temporaryRevision.allRulesMatchingEntity(
          member,
          PolicyRuleType.Server
        ),
      ];
      if (matchingRules.length !== 0) {
        for (const rule of matchingRules) {
          addedMatches.push({
            userID: member,
            policy: rule,
          });
        }
      }
    }
    return {
      addedMemberMatches: addedMatches,
      removedMemberMatches: removedMatches,
    };
  }
  changesFromInitialRevisions(
    policyRevision: PolicyListRevision,
    setMembershipRevision: SetMembershipRevision
  ): MembershipPolicyRevisionDelta {
    const addedMatches: MemberPolicyMatch[] = [];
    for (const member of setMembershipRevision.presentMembers()) {
      const matchingRules = [
        ...policyRevision.allRulesMatchingEntity(member, PolicyRuleType.User),
        ...policyRevision.allRulesMatchingEntity(member, PolicyRuleType.Server),
      ];
      if (matchingRules.length !== 0) {
        for (const rule of matchingRules) {
          addedMatches.push({
            userID: member,
            policy: rule,
          });
        }
      }
    }
    return {
      addedMemberMatches: addedMatches,
      removedMemberMatches: [],
    };
  }
  reviseFromChanges(
    delta: MembershipPolicyRevisionDelta
  ): SetMembershipPolicyRevision {
    if (
      delta.addedMemberMatches.length === 0 &&
      delta.removedMemberMatches.length === 0
    ) {
      return this;
    }
    let memberPolicies = this.memberPolicies;
    let policyMembers = this.policyMembers;
    for (const match of delta.addedMemberMatches) {
      const existing = memberPolicies.get(match.userID, List<PolicyRule>());
      memberPolicies = memberPolicies.set(
        match.userID,
        existing.push(match.policy)
      );
      const existingMembers = policyMembers.get(
        match.policy,
        List<StringUserID>()
      );
      policyMembers = policyMembers.set(
        match.policy,
        existingMembers.push(match.userID)
      );
    }
    for (const match of delta.removedMemberMatches) {
      const existingPolicies = memberPolicies.get(
        match.userID,
        List<PolicyRule>()
      );
      const nextPolicies = existingPolicies.filter(
        (rule) => rule !== match.policy
      );
      if (nextPolicies.size === 0) {
        memberPolicies = memberPolicies.delete(match.userID);
      } else {
        memberPolicies = memberPolicies.set(match.userID, nextPolicies);
      }
      const existingMembers = policyMembers.get(
        match.policy,
        List<StringUserID>()
      );
      const nextMembers = existingMembers.filter(
        (userID) => userID !== match.userID
      );
      if (nextMembers.size === 0) {
        policyMembers = policyMembers.delete(match.policy);
      } else {
        policyMembers = policyMembers.set(match.policy, nextMembers);
      }
    }
    return new StandardSetMembershipPolicyRevision(
      memberPolicies,
      policyMembers
    );
  }
  isBlankRevision(): boolean {
    return this.memberPolicies.size === 0;
  }
  allMembersWithRules(): MemberPolicyMatches[] {
    return this.memberPolicies.reduce<MemberPolicyMatches[]>(
      (matches, policyRules, userID) => {
        matches.push({
          userID: userID,
          policies: policyRules.toArray(),
        });
        return matches;
      },
      []
    );
  }
  allRulesMatchingMember(
    member: StringUserID,
    options: { type?: PolicyRuleType; recommendation?: Recommendation }
  ): PolicyRule[] {
    return this.memberPolicies
      .get(member, List<PolicyRule>())
      .filter((rule) => {
        if (options.type !== undefined && rule.kind !== options.type) {
          return false;
        } else if (
          options.recommendation !== undefined &&
          rule.recommendation !== options.recommendation
        ) {
          return false;
        } else {
          return true;
        }
      })
      .toArray();
  }

  public static blankRevision(): StandardSetMembershipPolicyRevision {
    return new StandardSetMembershipPolicyRevision(
      PerisstentMap(),
      PerisstentMap()
    );
  }
}
