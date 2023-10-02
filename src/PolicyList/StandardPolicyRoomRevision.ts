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

import { Logger } from '../Logging/Logger';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
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
import { StandardPolicyListRevision } from './StandardPolicyListRevision';

const log = new Logger('StandardPolicyRoomRevision');

export class StandardPolicyRoomRevision implements PolicyRoomRevision {
  public constructor(
    public readonly room: MatrixRoomID,
    private readonly revisionContainer: StandardPolicyListRevision
  ) {
    // nothing to do.
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
      const existingRule = this.revisionContainer.getPolicyRule(
        ruleKind,
        event.state_key
      );
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

  public reviseFromChanges(changes: PolicyRuleChange[]): PolicyRoomRevision {
    const nextRevision = this.revisionContainer.reviseFromChanges(changes);
    return new StandardPolicyRoomRevision(this.room, nextRevision);
  }

  public reviseFromState(policyState: PolicyRuleEvent[]): PolicyRoomRevision {
    const changes = this.changesFromState(policyState);
    return this.reviseFromChanges(changes);
  }

  public get revisionID(): Revision {
    return this.revisionContainer.revisionID;
  }

  hasEvent(eventId: string): boolean {
    return this.revisionContainer.hasEvent(eventId);
  }

  public allRules(): PolicyRule[] {
    return this.revisionContainer.allRules();
  }
  userRules(recommendation?: Recommendation | undefined): PolicyRule[] {
    return this.revisionContainer.userRules(recommendation);
  }
  serverRules(recommendation?: Recommendation | undefined): PolicyRule[] {
    return this.revisionContainer.serverRules(recommendation);
  }
  roomRules(recommendation?: Recommendation | undefined): PolicyRule[] {
    return this.revisionContainer.roomRules(recommendation);
  }
  rulesMatchingEntity(
    entity: string,
    ruleKind?: PolicyRuleType | undefined
  ): PolicyRule[] {
    return this.revisionContainer.rulesMatchingEntity(entity, ruleKind);
  }
  rulesOfKind(
    kind: PolicyRuleType,
    recommendation?: Recommendation | undefined
  ): PolicyRule[] {
    return this.revisionContainer.rulesOfKind(kind, recommendation);
  }
}
