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
): Result<PolicyRule> {
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
      Object.freeze({
        recommendation: normaliseRecommendation(event.content.recommendation),
        kind: normalisePolicyRuleType(event.type),
        hashes,
        sourceEvent: event,
        matchType: PolicyRuleMatchType.HashedLiteral,
        ...(event.content.reason ? { reason: event.content.reason } : {}),
      }) satisfies HashedLiteralPolicyRule
    );
  }
  if (/[*?]/.test(event.content.entity)) {
    return Ok(
      Object.freeze({
        glob: new MatrixGlob(event.content.entity),
        entity: event.content.entity,
        recommendation: normaliseRecommendation(event.content.recommendation),
        kind: normalisePolicyRuleType(event.type),
        sourceEvent: event,
        matchType: PolicyRuleMatchType.Glob,
        reason: event.content.reason ?? '<no reason supplied>',
        isMatch(this: GlobPolicyRule, entity: string) {
          return this.glob.test(entity);
        },
      } satisfies GlobPolicyRule)
    );
  } else {
    return Ok(
      Object.freeze({
        entity: event.content.entity,
        recommendation: normaliseRecommendation(event.content.recommendation),
        kind: normalisePolicyRuleType(event.type),
        sourceEvent: event,
        matchType: PolicyRuleMatchType.Literal,
        reason: event.content.reason ?? '<no reason supplied>',
        isMatch(this: LiteralPolicyRule, entity: string) {
          return this.entity === entity;
        },
      } satisfies LiteralPolicyRule)
    );
  }
}

export enum PolicyRuleMatchType {
  Literal = 'literal',
  Glob = 'glob',
  HashedLiteral = 'hashed-literal',
}

type PolicyRuleBase = {
  readonly recommendation: Recommendation;
  readonly reason?: string;
  readonly kind: PolicyRuleType;
  readonly sourceEvent: PolicyRuleEvent;
  readonly matchType: PolicyRuleMatchType;
};

export type LiteralPolicyRule = PolicyRuleBase & {
  readonly entity: string;
  readonly matchType: PolicyRuleMatchType.Literal;
  readonly reason: string;
  isMatch(entity: string): boolean;
};

export type GlobPolicyRule = PolicyRuleBase & {
  readonly entity: string;
  readonly glob: MatrixGlob;
  readonly matchType: PolicyRuleMatchType.Glob;

  isMatch(entity: string): boolean;
};

export type HashedLiteralPolicyRule = PolicyRuleBase & {
  readonly hashes: Record<string, string>;
  readonly matchType: PolicyRuleMatchType.HashedLiteral;
};

export type PolicyRule =
  | LiteralPolicyRule
  | GlobPolicyRule
  | HashedLiteralPolicyRule;
export type EntityPolicyRule = LiteralPolicyRule | GlobPolicyRule;
