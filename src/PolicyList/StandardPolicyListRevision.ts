/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019-2021 The Matrix.org Foundation C.I.C.

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

import { PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { PolicyListRevision } from './PolicyListRevision';
import { PolicyRule, Recommendation } from './PolicyRule';
import { ChangeType, PolicyRuleChange } from './PolicyRuleChange';
import { Revision } from './Revision';
import { Map as PersistentMap } from 'immutable';
import { UserID } from '../MatrixTypes/MatrixEntity';

/**
 * A map of policy rules, by their type and then event id.
 */
type PolicyRuleByType = PersistentMap<
  PolicyRuleType,
  PersistentMap<string /* event id */, PolicyRule>
>;

/**
 * A standard implementation of a `PolicyListRevision` using immutable's persistent maps.
 */
export class StandardPolicyListRevision implements PolicyListRevision {
  /**
   * Use {@link StandardPolicyListRevision.blankRevision} to get started.
   * Only use this constructor if you are implementing a variant of PolicyListRevision.
   * @param revisionID A revision ID to represent this revision.
   * @param policyRules A map containing the rules for this revision by state type and then state key.
   * @param policyRuleByEventId A map containing the rules ofr this revision by event id.
   */
  public constructor(
    public readonly revisionID: Revision,
    /**
     * Allow us to detect whether we have updated the state for this event.
     */
    private readonly policyRuleByType: PolicyRuleByType
  ) {}

  /**
   * @returns An empty revision.
   */
  public static blankRevision(): StandardPolicyListRevision {
    return new StandardPolicyListRevision(new Revision(), PersistentMap());
  }

  allRules(): PolicyRule[] {
    return [...this.policyRuleByType.values()]
      .map((byEventId) => [...byEventId.values()])
      .flat();
  }
  userRules(recommendation?: Recommendation): PolicyRule[] {
    return this.rulesOfKind(PolicyRuleType.User, recommendation);
  }
  serverRules(recommendation?: Recommendation): PolicyRule[] {
    return this.rulesOfKind(PolicyRuleType.Server, recommendation);
  }
  roomRules(recommendation?: Recommendation): PolicyRule[] {
    return this.rulesOfKind(PolicyRuleType.Room, recommendation);
  }
  rulesMatchingEntity(
    entity: string,
    ruleKind?: PolicyRuleType | undefined
  ): PolicyRule[] {
    const ruleTypeOf = (entityPart: string): PolicyRuleType => {
      if (ruleKind) {
        return ruleKind;
      } else if (entityPart.startsWith('#') || entityPart.startsWith('#')) {
        return PolicyRuleType.Room;
      } else if (entity.startsWith('@')) {
        return PolicyRuleType.User;
      } else {
        return PolicyRuleType.Server;
      }
    };

    if (ruleTypeOf(entity) === PolicyRuleType.User) {
      // We special case because want to see whether a server ban is preventing this user from participating too.
      const userId = new UserID(entity);
      return [
        ...this.userRules().filter((rule) => rule.isMatch(entity)),
        ...this.serverRules().filter((rule) => rule.isMatch(userId.domain)),
      ];
    } else {
      return this.rulesOfKind(ruleTypeOf(entity)).filter((rule) =>
        rule.isMatch(entity)
      );
    }
  }

  rulesOfKind(
    kind: PolicyRuleType,
    recommendation?: Recommendation | undefined
  ): PolicyRule[] {
    const rules: PolicyRule[] = [];
    const eventIdMap = this.policyRuleByType.get(kind);
    if (eventIdMap) {
      for (const rule of eventIdMap.values()) {
        if (rule && rule.kind === kind) {
          if (recommendation === undefined) {
            rules.push(rule);
          } else if (rule.recommendation === recommendation) {
            rules.push(rule);
          }
        }
      }
    }
    return rules;
  }

  public reviseFromChanges(
    changes: PolicyRuleChange[]
  ): StandardPolicyListRevision {
    let nextPolicyRulesByType = this.policyRuleByType;
    const setPolicyRule = (
      stateType: PolicyRuleType,
      rule: PolicyRule
    ): void => {
      const byEventTable =
        nextPolicyRulesByType.get(stateType) ?? PersistentMap();
      nextPolicyRulesByType = nextPolicyRulesByType.set(
        stateType,
        byEventTable.set(rule.sourceEvent.event_id, rule)
      );
    };
    const removePolicyRule = (rule: PolicyRule): void => {
      const byEventTable = nextPolicyRulesByType.get(rule.kind);
      if (byEventTable === undefined) {
        throw new TypeError(
          `Cannot find a rule for ${rule.sourceEvent.event_id}, this should be impossible`
        );
      }
      nextPolicyRulesByType = nextPolicyRulesByType.set(
        rule.kind,
        byEventTable.delete(rule.sourceEvent.event_id)
      );
    };
    for (const change of changes) {
      if (
        change.changeType === ChangeType.Added ||
        change.changeType === ChangeType.Modified
      ) {
        setPolicyRule(change.rule.kind, change.rule);
      } else if (change.changeType === ChangeType.Removed) {
        removePolicyRule(change.rule);
      }
    }
    return new StandardPolicyListRevision(
      new Revision(),
      nextPolicyRulesByType
    );
  }
  hasEvent(eventId: string): boolean {
    return (
      [...this.policyRuleByType.values()].find((byEvent) =>
        byEvent.has(eventId)
      ) !== undefined
    );
  }
}
