// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 - 2021 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { PolicyListRevision } from './PolicyListRevision';
import { PolicyRule, Recommendation } from './PolicyRule';
import { PolicyRuleChange } from './PolicyRuleChange';
import { Revision } from './Revision';
import { Map as PersistentMap, List as PersistentList } from 'immutable';
import { StringEventID } from '../MatrixTypes/StringlyTypedMatrix';
import { SimpleChangeType } from '../Interface/SimpleChangeType';

/**
 * A map of policy rules, by their type and then event id.
 */
type PolicyRuleByType = PersistentMap<
  PolicyRuleType,
  PersistentMap<StringEventID, PolicyRule>
>;

type PolicyRuleScopes = PersistentMap<
  PolicyRuleType,
  PersistentMap<Recommendation, PolicyRuleScope>
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
    private readonly policyRuleByType: PolicyRuleByType,
    private readonly policyRuleScopes: PolicyRuleScopes
  ) {}

  /**
   * @returns An empty revision.
   */
  public static blankRevision(): StandardPolicyListRevision {
    return new StandardPolicyListRevision(
      new Revision(),
      PersistentMap(),
      PersistentMap()
    );
  }

  public isBlankRevision(): boolean {
    return this.policyRuleByType.isEmpty();
  }

  allRules(): PolicyRule[] {
    return [...this.policyRuleByType.values()]
      .map((byEventId) => [...byEventId.values()])
      .flat();
  }
  allRulesMatchingEntity(
    entity: string,
    ruleKind?: PolicyRuleType | undefined,
    recommendation?: Recommendation
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
    if (recommendation !== undefined) {
      const scope = this.policyRuleScopes
        .get(ruleTypeOf(entity))
        ?.get(recommendation);
      if (scope === undefined) {
        return [];
      }
      return scope.allRulesMatchingEntity(entity);
    }
    return this.allRulesOfType(ruleTypeOf(entity), recommendation).filter(
      (rule) => rule.isMatch(entity)
    );
  }

  findRuleMatchingEntity(
    entity: string,
    type: PolicyRuleType,
    recommendation: Recommendation
  ): PolicyRule | undefined {
    const scope = this.policyRuleScopes.get(type)?.get(recommendation);
    if (scope === undefined) {
      return undefined;
    } else {
      return scope.findRuleMatchingEntity(entity);
    }
  }

  allRulesOfType(
    kind: PolicyRuleType,
    recommendation?: Recommendation | undefined
  ): PolicyRule[] {
    const rules: PolicyRule[] = [];
    const eventIdMap = this.policyRuleByType.get(kind);
    if (eventIdMap) {
      for (const rule of eventIdMap.values()) {
        if (rule.kind === kind) {
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
        change.changeType === SimpleChangeType.Added ||
        change.changeType === SimpleChangeType.Modified
      ) {
        setPolicyRule(change.rule.kind, change.rule);
        // The code base could change, and then we'd be screwed:
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (change.changeType === SimpleChangeType.Removed) {
        removePolicyRule(change.rule);
      } else {
        throw new TypeError(`Unknown change type ${change.changeType}`);
      }
    }
    const nextRevisionID = new Revision();
    const changesByScope = groupChangesByScope(changes);
    const nextPolicyRuleScopes = flattenChangesByScope(changesByScope).reduce(
      (map, [policyRuleType, recommendation, changes]) => {
        const scopeEntry = map.getIn(
          [policyRuleType, recommendation],
          undefined
        ) as PolicyRuleScope | undefined;
        if (scopeEntry === undefined) {
          return map.setIn(
            [policyRuleType, recommendation],
            PolicyRuleScope.blankScope(
              nextRevisionID,
              policyRuleType,
              recommendation
            ).reviseFromChanges(nextRevisionID, changes)
          );
        } else {
          return map.setIn(
            [policyRuleType, recommendation],
            scopeEntry.reviseFromChanges(nextRevisionID, changes)
          );
        }
      },
      this.policyRuleScopes
    );
    return new StandardPolicyListRevision(
      nextRevisionID,
      nextPolicyRulesByType,
      nextPolicyRuleScopes
    );
  }
  hasEvent(eventId: string): boolean {
    return (
      [...this.policyRuleByType.values()].find((byEvent) =>
        byEvent.has(eventId as StringEventID)
      ) !== undefined
    );
  }
}

export type PolicyRuleChangeByScope = Map<
  PolicyRuleType,
  Map<Recommendation, PolicyRuleChange[]>
>;

export function groupChangesByScope(
  changes: PolicyRuleChange[]
): PolicyRuleChangeByScope {
  const changesByScope: PolicyRuleChangeByScope = new Map();
  const addChange = (change: PolicyRuleChange) => {
    const policyTypeEntry = changesByScope.get(change.rule.kind);
    if (policyTypeEntry === undefined) {
      const map = new Map<Recommendation, PolicyRuleChange[]>();
      map.set(change.rule.recommendation, [change]);
      changesByScope.set(change.rule.kind, map);
    } else {
      const recommendationEntry = policyTypeEntry.get(
        change.rule.recommendation
      );
      if (recommendationEntry === undefined) {
        policyTypeEntry.set(change.rule.recommendation, [change]);
      } else {
        recommendationEntry.push(change);
      }
    }
  };
  for (const change of changes) {
    addChange(change);
  }
  return changesByScope;
}

type FlatPolicyRuleChnageByScope = [
  PolicyRuleType,
  Recommendation,
  PolicyRuleChange[],
][];

function flattenChangesByScope(
  scopes: PolicyRuleChangeByScope
): FlatPolicyRuleChnageByScope {
  const flatChanges: FlatPolicyRuleChnageByScope = [];
  for (const [policyRuleType, changeByRecommendation] of scopes.entries()) {
    for (const [recommendation, changes] of changeByRecommendation.entries()) {
      flatChanges.push([policyRuleType, recommendation, changes]);
    }
  }
  return flatChanges;
}

type PolicyRuleByEntity = PersistentMap<
  string /*rule entity*/,
  PersistentList<PolicyRule>
>;

/**
 * A scope is a collection of rules that are scoped to a single entity type and
 * recommendation. So for the most basic policy list, there will usually be
 * a scope for all the `m.policy.rule.user` events that have the recommendation
 * `m.ban`.
 *
 * Scopes are built, quite painfully, to make rule lookup convienant and quick.
 * We accept this because revisions are few and far between, and if they are
 * frequent, will have a very small number of change events.
 */
class PolicyRuleScope {
  public static blankScope(
    revisionID: Revision,
    ruleType: PolicyRuleType,
    recommendation: Recommendation
  ): PolicyRuleScope {
    return new PolicyRuleScope(
      revisionID,
      ruleType,
      recommendation,
      PersistentMap(),
      PersistentMap()
    );
  }

  constructor(
    public readonly revisionID: Revision,
    /**
     * The entity type that this cache is for e.g. RULE_USER.
     */
    public readonly entityType: PolicyRuleType,
    /**
     * The recommendation that this cache is for e.g. m.ban (RECOMMENDATION_BAN).
     */
    public readonly recommendation: Recommendation,
    /**
     * Glob rules always have to be scanned against every entity.
     */
    private readonly globRules: PolicyRuleByEntity,
    /**
     * This table allows us to skip matching an entity against every literal.
     */
    private readonly literalRules: PolicyRuleByEntity
  ) {
    // nothing to do.
  }
  reviseFromChanges(
    revision: Revision,
    changes: PolicyRuleChange[]
  ): PolicyRuleScope {
    const addRuleToMap = (
      map: PolicyRuleByEntity,
      rule: PolicyRule
    ): PolicyRuleByEntity => {
      const rules = map.get(rule.entity) ?? PersistentList();
      return map.set(rule.entity, rules.push(rule));
    };
    const removeRuleFromMap = (
      map: PolicyRuleByEntity,
      ruleToRemove: PolicyRule
    ): PolicyRuleByEntity => {
      const rules = (map.get(ruleToRemove.entity) ?? PersistentList()).filter(
        (rule) =>
          rule.sourceEvent.event_id !== ruleToRemove.sourceEvent.event_id
      );
      if (rules.size === 0) {
        return map.delete(ruleToRemove.entity);
      } else {
        return map.set(ruleToRemove.entity, rules);
      }
    };
    let nextGlobRules = this.globRules;
    let nextLiteralRules = this.literalRules;
    const addRule = (rule: PolicyRule): void => {
      if (rule.isGlob()) {
        nextGlobRules = addRuleToMap(nextGlobRules, rule);
      } else {
        nextLiteralRules = addRuleToMap(nextLiteralRules, rule);
      }
    };
    const removeRule = (rule: PolicyRule): void => {
      if (rule.isGlob()) {
        nextGlobRules = removeRuleFromMap(nextGlobRules, rule);
      } else {
        nextLiteralRules = removeRuleFromMap(nextLiteralRules, rule);
      }
    };
    for (const change of changes) {
      if (
        change.rule.kind !== this.entityType ||
        change.rule.recommendation !== this.recommendation
      ) {
        continue;
      }
      switch (change.changeType) {
        case SimpleChangeType.Added:
        case SimpleChangeType.Modified:
          addRule(change.rule);
          break;
        case SimpleChangeType.Removed:
          removeRule(change.rule);
      }
    }
    return new PolicyRuleScope(
      revision,
      this.entityType,
      this.recommendation,
      nextGlobRules,
      nextLiteralRules
    );
  }
  public literalRulesMatchingEntity(entity: string): PolicyRule[] {
    return [...(this.literalRules.get(entity) ?? [])];
  }
  public globRulesMatchingEntity(entity: string): PolicyRule[] {
    return [...this.globRules.values()]
      .filter((rules) => {
        const [firstRule] = rules;
        if (firstRule === undefined) {
          throw new TypeError(
            `The code is wrong and so is my understanding of everything`
          );
        }
        return firstRule.isMatch(entity);
      })
      .map((rules) => [...rules])
      .flat();
  }
  allRulesMatchingEntity(entity: string): PolicyRule[] {
    return [
      ...this.literalRulesMatchingEntity(entity),
      ...this.globRulesMatchingEntity(entity),
    ];
  }
  findRuleMatchingEntity(entity: string): PolicyRule | undefined {
    const literalRule = this.literalRules.get(entity);
    if (literalRule !== undefined) {
      return literalRule.get(0);
    }
    const globRules = this.globRulesMatchingEntity(entity);
    if (globRules.length === 0) {
      return undefined;
    } else {
      return globRules.at(0);
    }
  }
}
