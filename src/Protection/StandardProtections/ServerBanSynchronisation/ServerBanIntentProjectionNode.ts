// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from matrix-protection-suite
// https://github.com/Gnuxie/matrix-protection-suite
// </text>

import { StringServerName } from '@the-draupnir-project/matrix-basic-types';
import { ProjectionNode } from '../../../Projection/ProjectionNode';
import { PolicyListBridgeProjectionNode } from './PolicyListBridgeProjection';
import {
  PolicyRuleChange,
  PolicyRuleChangeType,
} from '../../../PolicyList/PolicyRuleChange';
import { ULID, ULIDFactory } from 'ulidx';
import {
  GlobPolicyRule,
  LiteralPolicyRule,
  PolicyRule,
  PolicyRuleMatchType,
  Recommendation,
} from '../../../PolicyList/PolicyRule';
import { Map as PersistentMap, List } from 'immutable';
import { PolicyRuleType } from '../../../MatrixTypes/PolicyEvents';
import { ListMultiMap } from '../../../Projection/ListMultiMap';

export type ServerBanIntentProjectionDelta = {
  denied: StringServerName[];
  recalled: StringServerName[];
  add: (LiteralPolicyRule | GlobPolicyRule)[];
  remove: (LiteralPolicyRule | GlobPolicyRule)[];
};

// is there a way that we can adapt this so that it can possibly be swapped
// to a lazy ban style protection if acls become exhausted.
// not withiout addressing the issues in the member protection tbh.
export type ServerBanIntentProjectionNode = ProjectionNode<
  [PolicyListBridgeProjectionNode],
  ServerBanIntentProjectionDelta,
  {
    denied: StringServerName[];
  }
>;

export const ServerBanIntentProjectionHelper = Object.freeze({
  reducePolicyDelta(
    input: PolicyRuleChange[]
  ): Pick<ServerBanIntentProjectionDelta, 'add' | 'remove'> {
    const output: Pick<ServerBanIntentProjectionDelta, 'add' | 'remove'> = {
      add: [],
      remove: [],
    } satisfies Pick<ServerBanIntentProjectionDelta, 'add' | 'remove'>;
    for (const change of input) {
      if (change.rule.kind !== PolicyRuleType.Server) {
        continue;
      } else if (change.rule.matchType === PolicyRuleMatchType.HashedLiteral) {
        continue;
      }
      switch (change.changeType) {
        case PolicyRuleChangeType.Added:
        case PolicyRuleChangeType.RevealedLiteral: {
          output.add.push(change.rule);
          break;
        }
        case PolicyRuleChangeType.Modified: {
          output.add.push(change.rule);
          if (change.previousRule === undefined) {
            throw new TypeError('Things are very wrong');
          }
          output.remove.push(change.previousRule as LiteralPolicyRule);
          break;
        }
        case PolicyRuleChangeType.Removed: {
          output.remove.push(change.rule);
          break;
        }
      }
    }
    return output;
  },

  reduceIntentDelta(
    input: Pick<ServerBanIntentProjectionDelta, 'add' | 'remove'>,
    policies: PersistentMap<StringServerName, List<PolicyRule>>
  ): ServerBanIntentProjectionDelta {
    const output: ServerBanIntentProjectionDelta = {
      ...input,
      denied: [],
      recalled: [],
    };
    type Change = { policyCount: number; introduced?: boolean };
    const projectedChanges = new Map<StringServerName, Change>();
    const accessChanges = (server: StringServerName): Change =>
      projectedChanges.get(server) ??
      ((existing) => ({
        policyCount: existing ?? 0,
        introduced: existing === undefined,
      }))(policies.get(server)?.size);
    for (const rule of input.add) {
      projectedChanges.set(
        rule.entity as StringServerName,
        ((change) => ((change.policyCount += 1), change))(
          accessChanges(rule.entity as StringServerName)
        )
      );
    }
    for (const rule of input.remove) {
      projectedChanges.set(
        rule.entity as StringServerName,
        ((change) => ((change.policyCount -= 1), change))(
          accessChanges(rule.entity as StringServerName)
        )
      );
    }
    for (const [serverName, policyChangeDelta] of projectedChanges) {
      if (policyChangeDelta.introduced && policyChangeDelta.policyCount > 0) {
        output.denied.push(serverName);
      } else if (policyChangeDelta.policyCount === 0) {
        output.recalled.push(serverName);
      } else if (policyChangeDelta.policyCount < 0) {
        throw new TypeError('Things are super wrong vronut');
      }
    }
    return output;
  },
});

export class StandardServerBanIntentProjectionNode
  implements ServerBanIntentProjectionNode
{
  public readonly ulid: ULID;
  constructor(
    private readonly ulidFactory: ULIDFactory,
    private readonly policies: PersistentMap<
      StringServerName,
      List<LiteralPolicyRule | GlobPolicyRule>
    >
  ) {
    this.ulid = ulidFactory();
  }

  public static create(
    ulidFactory: ULIDFactory
  ): ServerBanIntentProjectionNode {
    return new StandardServerBanIntentProjectionNode(
      ulidFactory,
      PersistentMap()
    );
  }

  reduceInput(input: PolicyRuleChange[]): ServerBanIntentProjectionDelta {
    return ServerBanIntentProjectionHelper.reduceIntentDelta(
      ServerBanIntentProjectionHelper.reducePolicyDelta(input),
      this.policies
    );
  }
  reduceInitialInputs([policyListRevision]: [
    PolicyListBridgeProjectionNode,
  ]): ServerBanIntentProjectionDelta {
    if (this.isEmpty()) {
      throw new TypeError('Cannot reduce initial inputs when inialised');
    }
    const serverPolicies = [
      ...policyListRevision.allRulesOfType(
        PolicyRuleType.Server,
        Recommendation.Ban
      ),
      ...policyListRevision.allRulesOfType(
        PolicyRuleType.Server,
        Recommendation.Takedown
      ),
    ].filter((rule) => rule.matchType !== PolicyRuleMatchType.HashedLiteral);
    const names = new Set(serverPolicies.map((policy) => policy.entity));
    return {
      add: serverPolicies,
      denied: [...names] as StringServerName[],
      remove: [],
      recalled: [],
    };
  }

  isEmpty(): boolean {
    return this.policies.size === 0;
  }

  reduceDelta(
    input: ServerBanIntentProjectionDelta
  ): ServerBanIntentProjectionNode {
    let nextPolicies = this.policies;
    nextPolicies = ListMultiMap.addValues(
      nextPolicies,
      input.add,
      (rule) => rule.entity as StringServerName
    );
    nextPolicies = ListMultiMap.removeValues(
      nextPolicies,
      input.remove,
      (rule) => rule.entity as StringServerName
    );
    return new StandardServerBanIntentProjectionNode(
      this.ulidFactory,
      nextPolicies
    );
  }

  get denied(): StringServerName[] {
    return [...this.policies.keys()];
  }
}
