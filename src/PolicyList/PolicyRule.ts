// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { MatrixGlob } from '@the-draupnir-project/matrix-basic-types';
import {
  PolicyRuleEvent,
  PolicyRuleType,
  UnredactedPolicyContent,
  normalisePolicyRuleType,
} from '../MatrixTypes/PolicyEvents';
import { Ok, Result, ResultError } from '@gnuxie/typescript-result';

export enum Recommendation {
  /// The rule recommends a "ban".
  ///
  /// The actual semantics for this "ban" may vary, e.g. room ban,
  /// server ban, ignore user, etc. To determine the semantics for
  /// this "ban", clients need to take into account the context for
  /// the list, e.g. how the rule was imported.
  Ban = 'm.ban',

  /**
   * This is a rule that recommends allowing a user to participate.
   * Used for the construction of allow lists.
   */
  Allow = 'org.matrix.mjolnir.allow',

  Unknown = 'unknown',
}

/**
 * All variants of recommendation `m.ban`
 */
const RECOMMENDATION_BAN_VARIANTS = [
  // Stable
  Recommendation.Ban,
  // Unstable prefix, for compatibility.
  'org.matrix.mjolnir.ban',
];

const RECOMMENDATION_ALLOW_VARIANTS: string[] = [
  // Unstable
  Recommendation.Allow,
];

export function normaliseRecommendation(
  recommendation: string
): Recommendation {
  if (RECOMMENDATION_BAN_VARIANTS.includes(recommendation)) {
    return Recommendation.Ban;
  } else if (RECOMMENDATION_ALLOW_VARIANTS.includes(recommendation)) {
    return Recommendation.Allow;
  } else {
    return Recommendation.Unknown;
  }
}

// grr so we face an issue where appservice usres would share reversed policies
// in the current model which is a pita.
// We should probably consider how agree/disagree and filtering is going to work
// to see if we can leverage off of the same shit to introduce policies selectively.
// Since with agree mode, we will need to exclude all policies and introduce them
// one by one. Which is kinda the same deal as reversal if you want to
// preserve source.

// I think it's ok that in the current model the revision used by the watchProfile
// is the final say and then the policy room revisions contain all their policies.
// we just need to be aware of that in the matching command etc.
// so i think having virtual policy list revisions that include policies from policy
// room revisions is fine. And its up to other code to present them inline.

// SO TLDR, reversal will have to happen in virtual policy lists.

// Ok but how is this going to work with the SetMembershipPolicy??
// since it'll need to see all policies aaaaaaaaaa

// we just make more of those revisions don't worry about it.

export function parsePolicyRule(
  event: Omit<PolicyRuleEvent, 'content'> & { content: UnredactedPolicyContent }
): Result<PolicyRule | HashedPolicyRule> {
  if (!('entity' in event.content)) {
    const hashes =
      // we need the expressions mare:
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ('hashes' in event.content && event.content.hashes) ||
      ('org.matrix.msc4205.hashes' in event.content &&
        event.content['org.matrix.msc4205.hashes']);
    if (!hashes) {
      return ResultError.Result('There is a missing entity in the policy rule');
    }
    return Ok(
      new StandardHashedPolicyRule(
        normaliseRecommendation(event.content.recommendation),
        normalisePolicyRuleType(event.type),
        hashes,
        event
      )
    );
  }
  return Ok(
    new StandardPolicyRule(
      event.content.entity,
      normaliseRecommendation(event.content.recommendation),
      event.content.reason ?? '<no reason supplied>',
      normalisePolicyRuleType(event.type),
      event
    )
  );
}

/**
 * We've kind of messed up our own understanding of rules.
 * There are three types of policy rules. Literal, Glob, and Hashed literal.
 * Literal and glob rules target specific entities, whereas hashed literals
 * don't have any relation to an entity, they need to be unmaskeed somehow
 * to be used.
 */
export type WeakPolicyRule = PolicyRule | HashedPolicyRule;

export interface PolicyRule {
  readonly entity: string;
  readonly recommendation: Recommendation;
  readonly reason: string;
  readonly kind: PolicyRuleType;
  readonly sourceEvent: PolicyRuleEvent;
  isMatch(entity: string): boolean;
  isGlob(): boolean;
  readonly isReversed?: boolean;
  readonly isHashed: false;
}

export type HashedPolicyRule = {
  readonly recommendation: Recommendation;
  readonly kind: PolicyRuleType;
  readonly hashes: Record<string, string>;
  readonly sourceEvent: PolicyRuleEvent;
  readonly isHashed: true;
};

class StandardPolicyRule implements PolicyRule {
  private readonly glob: MatrixGlob;
  public constructor(
    public readonly entity: string,
    public readonly recommendation: Recommendation,
    public readonly reason: string,
    public readonly kind: PolicyRuleType,
    public readonly sourceEvent: PolicyRuleEvent
  ) {
    this.glob = new MatrixGlob(entity);
  }

  /**
   * Determine whether this rule should apply to a given entity.
   */
  public isMatch(entity: string): boolean {
    return this.glob.test(entity);
  }

  /**
   * @returns Whether the entity in the rule represents a Matrix glob (and not a literal).
   */
  public isGlob(): boolean {
    return /[*?]/.test(this.entity);
  }

  public get isHashed(): false {
    return false;
  }
}

class StandardHashedPolicyRule implements HashedPolicyRule {
  public constructor(
    public readonly recommendation: Recommendation,
    public readonly kind: PolicyRuleType,
    public readonly hashes: Record<string, string>,
    public readonly sourceEvent: PolicyRuleEvent
  ) {
    // nothing to do.
  }

  public get isHashed(): true {
    return true;
  }
}
