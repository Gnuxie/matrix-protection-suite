// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import {
  StringRoomID,
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
import {
  Recommendation,
  PolicyRule,
  PolicyRuleMatchType,
} from '../PolicyList/PolicyRule';
import {
  PolicyRuleChange,
  PolicyRuleChangeType,
} from '../PolicyList/PolicyRuleChange';
import {
  MemberPolicyMatch,
  MemberPolicyMatchesWithRooms,
  MemberRoomMatch,
  MembershipPolicyRevisionDelta,
  SetMembershipPolicyRevision,
} from './MembershipPolicyRevision';
import { Map as PerisstentMap, List } from 'immutable';
import { StandardPolicyListRevision } from '../PolicyList/StandardPolicyListRevision';
import { Revision } from '../PolicyList/Revision';
import { SetRoomMembership } from '../Membership/SetRoomMembership';
import {
  Membership,
  MembershipChange,
  MembershipChangeType,
} from '../Membership/MembershipChange';
import { RoomMembershipRevision } from '../Membership/MembershipRevision';

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
type MemberPoliciesInfo = {
  readonly policies: List<PolicyRule>;
  readonly participaitingRoomIDs: List<StringRoomID>;
};

export class StandardSetMembershipPolicyRevision
  implements SetMembershipPolicyRevision
{
  readonly revision = new Revision();
  private constructor(
    private readonly memberPolicies: PerisstentMap<
      StringUserID,
      MemberPoliciesInfo
    >,
    private readonly policyMembers: PerisstentMap<
      PolicyRule,
      List<StringUserID>
    >
    // maybe we need two revisions?
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
        ...policyRevision.allRulesMatchingEntity(change.userID, {
          type: PolicyRuleType.User,
          searchHashedRules: false,
        }),
        // hmm would it be better if the membership revision grouped users by server so that
        // we would only need to do server scans once?
        // i mean we'd have to do the complete scan when the user is joining a room we already have interned
        // but it'd at least avoid things when adding an entire room of users.
        // That being said, there aren't that many server rules...
        ...policyRevision.allRulesMatchingEntity(
          userServerName(change.userID),
          {
            type: PolicyRuleType.Server,
            searchHashedRules: false,
          }
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
        const matchingRules = this.memberPolicies.get(change.userID)?.policies;
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
      addedMemberRoom: [],
      removedMemberRoom: [],
    };
  }
  changesFromPolicyChanges(
    changes: PolicyRuleChange[],
    setMembershipRevision: SetMembershipRevision
  ): MembershipPolicyRevisionDelta {
    const removedMatches: MemberPolicyMatch[] = [];
    const policiesToRemove = changes
      .filter(
        (change) =>
          change.changeType === PolicyRuleChangeType.Removed ||
          change.changeType === PolicyRuleChangeType.Modified
      )
      .map((change) => {
        if (change.previousRule === undefined) {
          throw new TypeError(
            'Modified and Removed policies should have the previousRule field.'
          );
        }
        return change.previousRule;
      });
    for (const policy of policiesToRemove) {
      if (policy.matchType === PolicyRuleMatchType.HashedLiteral) {
        continue; // we can't derive matches from hashed literals.
      }
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
      .filter((change) => change.changeType !== PolicyRuleChangeType.Removed)
      .map((change) => {
        switch (change.changeType) {
          case PolicyRuleChangeType.Modified:
          case PolicyRuleChangeType.RevealedLiteral:
            return { ...change, changeType: PolicyRuleChangeType.Added };
          default:
            return change;
        }
      });
    const temporaryRevision =
      StandardPolicyListRevision.blankRevision().reviseFromChanges(
        relevantChangesForTemproaryRevision
      );
    const addedMatches: MemberPolicyMatch[] = [];
    for (const member of setMembershipRevision.presentMembers()) {
      const matchingRules = [
        ...temporaryRevision.allRulesMatchingEntity(member, {
          type: PolicyRuleType.User,
          searchHashedRules: false,
        }),
        ...temporaryRevision.allRulesMatchingEntity(member, {
          type: PolicyRuleType.Server,
          searchHashedRules: false,
        }),
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
      addedMemberRoom: [],
      removedMemberRoom: [],
    };
  }
  changesFromInitialRevisions(
    policyRevision: PolicyListRevision,
    setMembershipRevision: SetMembershipRevision
  ): MembershipPolicyRevisionDelta {
    const addedMatches: MemberPolicyMatch[] = [];
    for (const member of setMembershipRevision.presentMembers()) {
      const matchingRules = [
        ...policyRevision.allRulesMatchingEntity(member, {
          type: PolicyRuleType.User,
          searchHashedRules: false,
        }),
        ...policyRevision.allRulesMatchingEntity(member, {
          type: PolicyRuleType.Server,
          searchHashedRules: false,
        }),
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
    // FIXME: Typo in interface and this should add the other version too...
    // We should have added and removed member rooms here always...
    // it's just we don't want the reviser from changes thing to get
    // confused by the duplicated information...
    // addedMemberMatches should always take priority for instance.
    // We should really add some confidence by testing this thing exclusively
    return {
      addedMemberMatches: addedMatches,
      removedMemberMatches: [],
      addedMemberRoom: [],
      removedMemberRoom: [],
    };
  }

  private createNewMembershipInfo(
    userID: StringUserID,
    setRoomMembership: SetRoomMembership
  ): MemberPoliciesInfo {
    const participaitingRoomIDs = setRoomMembership.allRooms
      .filter((revision) => {
        switch (revision.membershipForUser(userID)?.membership) {
          case Membership.Join:
          case Membership.Invite:
          case Membership.Knock:
            return true;
          default:
            return false;
        }
      })
      .map((revision) => revision.room.toRoomIDOrAlias());
    return {
      policies: List<PolicyRule>(),
      participaitingRoomIDs: List(participaitingRoomIDs),
    };
  }

  // FIXME: Typo in name to change at interface level
  changedFromRoomMembershipChanges(
    revision: RoomMembershipRevision,
    changes: MembershipChange[]
  ): MembershipPolicyRevisionDelta {
    const roomsAdded: MemberRoomMatch[] = [];
    const roomsRemoved: MemberRoomMatch[] = [];
    for (const change of changes) {
      const entry = this.memberPolicies.get(change.userID);
      if (entry === undefined) {
        continue;
      }
      switch (change.membershipChangeType) {
        case MembershipChangeType.Joined:
        case MembershipChangeType.Invited:
        case MembershipChangeType.Knocked:
        case MembershipChangeType.Rejoined:
        case MembershipChangeType.Reknocked:
          if (!entry.participaitingRoomIDs.includes(change.roomID)) {
            roomsAdded.push({
              roomID: change.roomID,
              policies: entry.policies.toArray(),
              userID: change.userID,
            });
          }
          break;
        case MembershipChangeType.Banned:
        case MembershipChangeType.Kicked:
        case MembershipChangeType.Left:
        case MembershipChangeType.Unbanned:
          roomsRemoved.push({
            roomID: change.roomID,
            policies: entry.policies.toArray(),
            userID: change.userID,
          });
          break;
        case MembershipChangeType.NoChange:
          // nothing to do mare fall through.
          break;
        default:
          throw new TypeError('Mate the code is fucked');
      }
    }
    return {
      addedMemberMatches: [],
      removedMemberMatches: [],
      addedMemberRoom: roomsAdded,
      removedMemberRoom: roomsRemoved,
    };
  }

  reviseFromChanges(
    delta: MembershipPolicyRevisionDelta,
    setRoomMembership: SetRoomMembership
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
      const existing =
        memberPolicies.get(match.userID) ??
        this.createNewMembershipInfo(match.userID, setRoomMembership);
      memberPolicies = memberPolicies.set(match.userID, {
        ...existing,
        policies: existing.policies.push(match.policy),
      });
      const existingMembers = policyMembers.get(
        match.policy,
        List<StringUserID>()
      );
      policyMembers = policyMembers.set(
        match.policy,
        existingMembers.push(match.userID)
      );
    }
    for (const room of delta.addedMemberRoom) {
      const existing = memberPolicies.get(room.userID);
      if (existing === undefined) {
        // we would otherwise for it to be added properly there is probably some mistake here.
        throw new TypeError(
          'The revision issuer is out of sync with the previous revision somehow'
        );
      }
      if (!existing.participaitingRoomIDs.includes(room.roomID)) {
        memberPolicies.set(room.userID, {
          ...existing,
          participaitingRoomIDs: existing.participaitingRoomIDs.push(
            room.roomID
          ),
        });
      }
    }
    for (const match of delta.removedMemberMatches) {
      const entry = memberPolicies.get(match.userID);
      if (entry === undefined) {
        continue;
      }
      const nextPolicies = entry.policies.filter(
        (rule) => rule !== match.policy
      );
      if (nextPolicies.size === 0) {
        memberPolicies = memberPolicies.delete(match.userID);
      } else {
        memberPolicies = memberPolicies.set(match.userID, {
          ...entry,
          policies: nextPolicies,
        });
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
    for (const room of delta.removedMemberRoom) {
      const entry = memberPolicies.get(room.userID);
      if (entry === undefined) {
        continue;
      }
      memberPolicies = memberPolicies.set(room.userID, {
        ...entry,
        participaitingRoomIDs: entry.participaitingRoomIDs.filter(
          (roomID) => roomID !== room.roomID
        ),
      });
    }
    return new StandardSetMembershipPolicyRevision(
      memberPolicies,
      policyMembers
    );
  }
  isBlankRevision(): boolean {
    return this.memberPolicies.size === 0;
  }

  memberMatches(
    userID: StringUserID
  ): MemberPolicyMatchesWithRooms | undefined {
    const entry = this.memberPolicies.get(userID);
    if (entry === undefined) {
      return undefined;
    }
    return {
      rooms: entry.participaitingRoomIDs.toArray(),
      policies: entry.policies.toArray(),
      userID,
    };
  }

  allMembersWithRules(): MemberPolicyMatchesWithRooms[] {
    return this.memberPolicies.reduce<MemberPolicyMatchesWithRooms[]>(
      (matches, entry, userID) => {
        matches.push({
          userID: userID,
          policies: entry.policies.toArray(),
          rooms: entry.participaitingRoomIDs.toArray(),
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
    return (this.memberPolicies.get(member)?.policies ?? List<PolicyRule>())
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
