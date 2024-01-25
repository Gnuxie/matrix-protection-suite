/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019 The Matrix.org Foundation C.I.C.

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

import { MatrixGlob } from '../MatrixTypes/MatrixGlob';

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
