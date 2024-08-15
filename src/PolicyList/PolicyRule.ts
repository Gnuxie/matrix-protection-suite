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

export function parsePolicyRule(
  event: Omit<PolicyRuleEvent, 'content'> & { content: UnredactedPolicyContent }
): PolicyRule {
  return new StandardPolicyRule(
    event.content.entity,
    normaliseRecommendation(event.content.recommendation),
    event.content.reason,
    normalisePolicyRuleType(event.type),
    event
  );
}

export interface PolicyRule {
  readonly entity: string;
  readonly recommendation: Recommendation;
  readonly reason: string;
  readonly kind: PolicyRuleType;
  readonly sourceEvent: PolicyRuleEvent;
  isMatch(entity: string): boolean;
  isGlob(): boolean;
}

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
}
