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

import {
  PolicyRuleEvent,
  PolicyRuleType,
  isPolicyTypeObsolete,
  normalisePolicyRuleType,
} from '../MatrixTypes/PolicyEvents';
import { PolicyRoomRevision } from './PolicyListRevision';
import { PolicyRule, Recommendation, parsePolicyRule } from './PolicyRule';
import { ChangeType, PolicyRuleChange } from './PolicyRuleChange';
import { Revision } from './Revision';
import { Map as PersistentMap } from 'immutable';
import { UserID } from '../MatrixTypes/MatrixEntity';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { Logger } from '../Logging/Logger';

const log = new Logger('StandardPolicyRoomRevision');

/**
 * A map interning rules by their rule type, and then their state key.
 */
type PolicyRuleMap = PersistentMap<
  PolicyRuleType,
  PersistentMap<string, PolicyRule>
>;

/**
 * A map interning rules by their event id.
 */
type PolicyRuleByEventIDMap = PersistentMap<string /* event id */, PolicyRule>;

/**
 * A standard implementation of a `PolicyListRevision` using immutable's persistent maps.
 */
export class StandardPolicyRoomRevision implements PolicyRoomRevision {
  /**
   * Use {@link StandardPolicyRoomRevision.blankRevision} to get started.
   * Only use this constructor if you are implementing a variant of PolicyListRevision.
   * @param revisionID A revision ID to represent this revision.
   * @param policyRules A map containing the rules for this revision by state type and then state key.
   * @param policyRuleByEventId A map containing the rules ofr this revision by event id.
   */
  public constructor(
    public readonly room: MatrixRoomID,
    public readonly revisionID: Revision,
    /**
     * A map of state events indexed first by state type and then state keys.
     */
    private readonly policyRules: PolicyRuleMap,
    /**
     * Allow us to detect whether we have updated the state for this event.
     */
    private readonly policyRuleByEventId: PolicyRuleByEventIDMap
  ) {}

  /**
   * @returns An empty revision.
   */
  public static blankRevision(room: MatrixRoomID): StandardPolicyRoomRevision {
    return new StandardPolicyRoomRevision(
      room,
      new Revision(),
      PersistentMap(),
      PersistentMap()
    );
  }

  /**
   * Lookup the current rules cached for the list.
   * @param stateType The event type e.g. m.policy.rule.user.
   * @param stateKey The state key e.g. rule:@bad:matrix.org
   * @returns A state event if present or null.
   */
  public getPolicyRule(stateType: PolicyRuleType, stateKey: string) {
    return this.policyRules.get(stateType)?.get(stateKey);
  }

  allRules(): PolicyRule[] {
    return [...this.policyRuleByEventId.values()];
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
    const stateKeyMap = this.policyRules.get(kind);
    if (stateKeyMap) {
      for (const rule of stateKeyMap.values()) {
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
  ): StandardPolicyRoomRevision {
    let nextPolicyRules = this.policyRules;
    let nextPolicyRulesByEventID = this.policyRuleByEventId;
    const setPolicyRule = (
      stateType: PolicyRuleType,
      stateKey: string,
      rule: PolicyRule
    ): void => {
      const typeTable = nextPolicyRules.get(stateType) ?? PersistentMap();
      nextPolicyRules = nextPolicyRules.set(
        stateType,
        typeTable.set(stateKey, rule)
      );
      nextPolicyRulesByEventID = nextPolicyRulesByEventID.set(
        rule.sourceEvent.event_id,
        rule
      );
    };
    const removePolicyRule = (rule: PolicyRule): void => {
      const typeTable = nextPolicyRules.get(rule.kind);
      if (typeTable === undefined) {
        throw new TypeError(
          `Cannot find a rule for ${rule.sourceEvent.event_id}, this should be impossible`
        );
      }
      nextPolicyRules = nextPolicyRules.set(
        rule.kind,
        typeTable.delete(rule.sourceEvent.state_key)
      );
      nextPolicyRulesByEventID = nextPolicyRulesByEventID.delete(
        rule.sourceEvent.event_id
      );
    };
    for (const change of changes) {
      if (
        change.changeType === ChangeType.Added ||
        change.changeType === ChangeType.Modified
      ) {
        setPolicyRule(
          change.rule.kind,
          change.rule.sourceEvent.state_key,
          change.rule
        );
      } else if (change.changeType === ChangeType.Removed) {
        removePolicyRule(change.rule);
      }
    }
    return new StandardPolicyRoomRevision(
      this.room,
      new Revision(),
      nextPolicyRules,
      nextPolicyRulesByEventID
    );
  }
  hasEvent(eventId: string): boolean {
    return this.policyRuleByEventId.has(eventId);
  }

  /**
   * Calculate the changes from this revision with a more recent set of state events.
   * Will only show the difference, if the set is the same then no changes will be returned.
   * @param state The state events that reflect a different revision of the list.
   * @returns Any changes between this revision and the new set of state events.
   */
  public changesFromState(state: PolicyRuleEvent[]): PolicyRuleChange[] {
    const changes: PolicyRuleChange[] = [];
    for (const event of state) {
      const ruleKind = normalisePolicyRuleType(event.type);
      if (ruleKind === PolicyRuleType.Unknown) {
        continue; // this rule is of an invalid or unknown type.
      }
      const existingRule = this.getPolicyRule(ruleKind, event.state_key);
      const existingState = existingRule?.sourceEvent;

      // Now we need to figure out if the current event is of an obsolete type
      // (e.g. org.matrix.mjolnir.rule.user) when compared to the previousState (which might be m.policy.rule.user).
      // We do not want to overwrite a rule of a newer type with an older type even if the event itself is supposedly more recent
      // as it may be someone deleting the older versions of the rules.
      if (existingState) {
        if (isPolicyTypeObsolete(ruleKind, existingState.type, event.type)) {
          log.info(
            'PolicyList',
            `In PolicyList ${this.room.toPermalink()}, conflict between rules ${
              event['event_id']
            } (with obsolete type ${event['type']}) ` +
              `and ${existingState.event_id} (with standard type ${existingState['type']}). Ignoring rule with obsolete type.`
          );
          continue;
        }
      }

      const changeType: null | ChangeType = (() => {
        if (!existingState) {
          return ChangeType.Added;
        } else if (existingState.event_id === event.event_id) {
          if (event.unsigned?.redacted_because) {
            return ChangeType.Removed;
          } else {
            // Nothing has changed.
            return null;
          }
        } else {
          // Then the policy has been modified in some other way, possibly 'soft' redacted by a new event with empty content...
          if (Object.keys(event['content']).length === 0) {
            return ChangeType.Removed;
          } else {
            return ChangeType.Modified;
          }
        }
      })();

      // If we haven't got any information about what the rule used to be, then it wasn't a valid rule to begin with
      // and so will not have been used. Removing a rule like this therefore results in no change.
      if (changeType === ChangeType.Removed && existingRule) {
        const redactedBecause = event.unsigned.redacted_because;
        const sender =
          typeof redactedBecause === 'object' &&
          redactedBecause !== null &&
          'sender' in redactedBecause &&
          typeof redactedBecause.sender === 'string'
            ? redactedBecause.sender
            : event.sender;
        changes.push({
          changeType,
          event,
          sender,
          rule: existingRule,
          ...(existingState ? { existingState } : {}),
        });
        // Event has no content and cannot be parsed as a ListRule.
        continue;
      }
      if (changeType) {
        const rule = parsePolicyRule(event);
        changes.push({
          rule,
          changeType,
          event,
          sender: event.sender,
          ...(existingState ? { existingState } : {}),
        });
      }
    }
    return changes;
  }

  public reviseFromState(policyState: PolicyRuleEvent[]): PolicyRoomRevision {
    const changes = this.changesFromState(policyState);
    return this.reviseFromChanges(changes);
  }
}
