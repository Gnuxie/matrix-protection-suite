// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 - 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import {
  StringUserID,
  userServerName,
} from '@the-draupnir-project/matrix-basic-types';
import { Logger } from '../Logging/Logger';
import { PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { ServerACLBuilder } from '../MatrixTypes/ServerACLBuilder';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import {
  PolicyRule,
  PolicyRuleMatchType,
  Recommendation,
} from '../PolicyList/PolicyRule';

// FIXME: Not sure the logger in this file is really enough to inform users with.
const log = new Logger('AccessControl');

export enum Access {
  /// The entity was explicitly banned by a policy list.
  Banned,
  /// The entity did not match any allow rule.
  NotAllowed,
  /// The user was allowed and didn't match any ban.
  Allowed,
}

/**
 * A description of the access an entity has.
 * If the access is `Banned`, then a single rule that bans the entity will be included.
 */
export interface EntityAccess {
  readonly outcome: Access;
  readonly rule?: PolicyRule;
}

/**
 * This allows us to work out the access an entity has to some thing based on a set of watched/unwatched lists.
 */
export class AccessControl {
  /**
   * Test whether the server is allowed by the ACL unit.
   * @param domain The server name to test.
   * @returns A description of the access that the server has.
   */
  public static getAccessForServer(
    revision: PolicyListRevision,
    domain: string
  ): EntityAccess {
    return AccessControl.getAccessForEntity(
      revision,
      domain,
      PolicyRuleType.Server
    );
  }

  /**
   * Get the level of access the user has for the ACL unit.
   * @param mxid The user id to test.
   * @param policy Whether to check the server part of the user id against server rules.
   * @returns A description of the access that the user has.
   */
  public static getAccessForUser(
    revision: PolicyListRevision,
    userID: StringUserID,
    policy: 'CHECK_SERVER' | 'IGNORE_SERVER'
  ): EntityAccess {
    const userAccess = AccessControl.getAccessForEntity(
      revision,
      userID,
      PolicyRuleType.User
    );
    if (policy === 'IGNORE_SERVER' || userAccess.outcome === Access.Banned) {
      return userAccess;
    } else {
      const serverAccess = AccessControl.getAccessForEntity(
        revision,
        userServerName(userID),
        PolicyRuleType.Server
      );
      if (
        userAccess.outcome === Access.Allowed &&
        serverAccess.outcome === Access.NotAllowed
      ) {
        return userAccess;
      } else {
        return serverAccess;
      }
    }
  }

  public static getAccessForEntity(
    revision: PolicyListRevision,
    entity: string,
    entityType: PolicyRuleType
  ): EntityAccess {
    // Check if the entity is explicitly allowed.
    // We have to infer that a rule exists for '*' if the allowCache is empty, otherwise you brick the ACL.
    const allowRule = revision.findRuleMatchingEntity(entity, {
      type: entityType,
      recommendation: Recommendation.Allow,
      searchHashedRules: false,
    });
    if (
      allowRule === undefined &&
      // this is gonna be a pita resource wise.
      !(revision.allRulesOfType(entityType, Recommendation.Allow).length === 0)
    ) {
      return { outcome: Access.NotAllowed };
    }
    // Now check if the entity is banned.
    const banRule = revision.findRuleMatchingEntity(entity, {
      type: entityType,
      recommendation: Recommendation.Ban,
      searchHashedRules: true,
    });
    if (banRule !== undefined) {
      return { outcome: Access.Banned, rule: banRule };
    }
    const takedownRule = revision.findRuleMatchingEntity(entity, {
      type: entityType,
      recommendation: Recommendation.Takedown,
      searchHashedRules: true,
    });
    if (takedownRule !== undefined) {
      return { outcome: Access.Banned, rule: takedownRule };
    }
    // If they got to this point, they're allowed!!
    return { outcome: Access.Allowed };
  }

  /**
   * Create a ServerAcl instance from the rules contained in this unit.
   * @param serverName The name of the server that you are operating from, used to ensure you cannot brick yourself.
   * @returns A new `ServerAcl` instance with deny and allow entries created from the rules in this unit.
   */
  public static compileServerACL(
    serverName: string,
    revision: PolicyListRevision
  ): ServerACLBuilder {
    const builder = new ServerACLBuilder(serverName).denyIpAddresses();
    const allowedServers = revision.allRulesOfType(
      PolicyRuleType.Server,
      Recommendation.Allow
    );
    // Allowed servers (allow).
    if (allowedServers.length === 0) {
      builder.allowServer('*');
    } else {
      for (const rule of allowedServers) {
        if (rule.matchType !== PolicyRuleMatchType.HashedLiteral) {
          builder.allowServer(rule.entity);
        }
      }
      if (
        AccessControl.getAccessForServer(revision, serverName).outcome ===
        Access.NotAllowed
      ) {
        builder.allowServer(serverName);
        log.warn(
          'AccessControl',
          `The server ${serverName} we are operating from was not on the allowed when constructing the server ACL, so it will be injected it into the server acl. Please check the ACL lists.`
        );
      }
    }
    // Banned servers (deny).
    const bannedServers = revision.allRulesOfType(
      PolicyRuleType.Server,
      Recommendation.Ban
    );
    for (const rule of bannedServers) {
      if (rule.matchType === PolicyRuleMatchType.HashedLiteral) {
        continue;
      }
      if (rule.isMatch(serverName)) {
        log.warn(
          'AccessControlUnit',
          `The server ${serverName} we are operating from was found to be banned by ${rule.entity} by a rule from the event: ${rule.sourceEvent.event_id}, while constructing a server acl. Ignoring the rule. Please check the ACL lists.`
        );
      } else {
        builder.denyServer(rule.entity);
      }
    }
    return builder;
  }
}
