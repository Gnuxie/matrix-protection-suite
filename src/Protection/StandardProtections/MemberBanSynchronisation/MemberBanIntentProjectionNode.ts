// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from matrix-protection-suite
// https://github.com/Gnuxie/matrix-protection-suite
// </text>

import { ULID, ULIDFactory } from 'ulidx';
import {
  ExtractInputDeltaShapes,
  ProjectionNode,
} from '../../../Projection/ProjectionNode';
import {
  MemberPolicyMatch,
  MemberPolicyMatches,
  MembershipPolicyRevision,
  MembershipPolicyRevisionDelta,
} from '../../../MembershipPolicies/MembershipPolicyRevision';
import { StringUserID } from '@the-draupnir-project/matrix-basic-types';
import { List, Map as PersistentMap } from 'immutable';
import {
  GlobPolicyRule,
  LiteralPolicyRule,
  Recommendation,
} from '../../../PolicyList/PolicyRule';

/**
 * This is just a stand in while we wait to convert the upstream MembershipPolicyRevision
 * to a projection.
 */
export type MemberBanInputProjectionNode = ProjectionNode<
  never[],
  MembershipPolicyRevisionDelta
> &
  MembershipPolicyRevision;

// use add/remove for steady state intents
// When the intent becomes effectual, matches will be removed
// upstream and so this model will remain consistent
export interface MemberBanIntentProjectionDelta {
  add: MemberPolicyMatch[];
  remove: MemberPolicyMatch[];
}

function isPolicyRelevant(policy: LiteralPolicyRule | GlobPolicyRule): boolean {
  return (
    policy.recommendation === Recommendation.Ban ||
    policy.recommendation === Recommendation.Takedown
  );
}

export type MemberBanIntentProjectionNode = ProjectionNode<
  [MemberBanInputProjectionNode],
  MemberBanIntentProjectionDelta,
  {
    allMembersWithRules(): MemberPolicyMatches[];
    allRulesMatchingMember(
      member: StringUserID
    ): (LiteralPolicyRule | GlobPolicyRule)[];
  }
>;

// Upstream inputs are not yet converted to projections, so have to be never[]
// for now.
export class StandardMemberBanIntentProjectionNode
  implements MemberBanIntentProjectionNode
{
  public readonly ulid: ULID;
  constructor(
    private readonly ulidFactory: ULIDFactory,
    private readonly intents: PersistentMap<
      StringUserID,
      List<LiteralPolicyRule | GlobPolicyRule>
    >
  ) {
    this.ulid = ulidFactory();
  }

  public static create(
    ulidFactory: ULIDFactory
  ): MemberBanIntentProjectionNode {
    return new StandardMemberBanIntentProjectionNode(
      ulidFactory,
      PersistentMap()
    );
  }

  public isEmpty(): boolean {
    return this.intents.isEmpty();
  }

  private reduceMembershipPolicyRevisionDelta(
    inputDelta: MembershipPolicyRevisionDelta
  ): MemberBanIntentProjectionDelta {
    const output: MemberBanIntentProjectionDelta = {
      add: [],
      remove: [],
    };
    // hmm but now what if a policy's recommendation is modified from ban
    // to something irrelevant. How do we know if the policy has been removed?
    // our revision system is quite stupid in that it for some reason allows
    // policies to be modified rather than reissued as something else which
    // is distinct?
    // Good news, the upstream revision issuer splits these into added and removed
    // so it does make them distinct policies, yay.
    for (const added of inputDelta.addedMemberMatches) {
      if (isPolicyRelevant(added.policy)) {
        output.add.push(added);
      }
    }
    for (const removed of inputDelta.removedMemberMatches) {
      if (isPolicyRelevant(removed.policy)) {
        output.remove.push(removed);
      }
    }
    return output;
  }

  reduceInput(
    input: ExtractInputDeltaShapes<[MemberBanInputProjectionNode]>
  ): MemberBanIntentProjectionDelta {
    return this.reduceMembershipPolicyRevisionDelta(input);
  }

  reduceDelta(
    input: MemberBanIntentProjectionDelta
  ): StandardMemberBanIntentProjectionNode {
    const nextIntents = this.intents;
    for (const match of input.add) {
      const existingPolicies = nextIntents.get(match.userID);
      if (existingPolicies) {
        nextIntents.set(match.userID, existingPolicies.push(match.policy));
      } else {
        nextIntents.set(
          match.userID,
          List<LiteralPolicyRule | GlobPolicyRule>().push(match.policy)
        );
      }
    }
    for (const match of input.remove) {
      const existingPolicies = nextIntents.get(
        match.userID,
        List<LiteralPolicyRule | GlobPolicyRule>()
      );
      const nextPolicies = existingPolicies.filter(
        (rule) => rule !== match.policy
      );
      if (nextPolicies.size === 0) {
        nextIntents.delete(match.userID);
      } else {
        nextIntents.set(match.userID, nextPolicies);
      }
    }
    return new StandardMemberBanIntentProjectionNode(
      this.ulidFactory,
      nextIntents
    );
  }

  reduceInitialInputs([membershipPolicyRevision]: [
    MemberBanInputProjectionNode,
  ]): MemberBanIntentProjectionDelta {
    if (!this.isEmpty()) {
      throw new TypeError(
        'This can only be called on an empty projection node'
      );
    }
    return {
      add: membershipPolicyRevision
        .allMembersWithRules()
        .map((member) =>
          member.policies.map((policy) => ({ userID: member.userID, policy }))
        )
        .flat(),
      remove: [],
    };
  }

  allMembersWithRules(): MemberPolicyMatches[] {
    return this.intents.reduce<MemberPolicyMatches[]>(
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
    member: StringUserID
  ): (LiteralPolicyRule | GlobPolicyRule)[] {
    return this.intents
      .get(member, List<LiteralPolicyRule | GlobPolicyRule>())
      .toArray();
  }
}
