/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019-2022 The Matrix.org Foundation C.I.C.

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
import { StringUserID, serverName } from '../MatrixTypes/StringlyTypedMatrix';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import { PolicyRule, Recommendation } from '../PolicyList/PolicyRule';

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
export default class AccessControl {
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
        serverName(userID),
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
    const allowRule = revision.findRuleMatchingEntity(
      entity,
      entityType,
      Recommendation.Allow
    );
    if (
      allowRule === undefined &&
      // this is gonna be a pita resource wise.
      !(revision.allRulesOfType(entityType, Recommendation.Allow).length === 0)
    ) {
      return { outcome: Access.NotAllowed };
    }
    // Now check if the entity is banned.
    const banRule = revision.findRuleMatchingEntity(
      entity,
      entityType,
      Recommendation.Ban
    );
    if (banRule !== undefined) {
      return { outcome: Access.Banned, rule: banRule };
    }
    // If they got to this point, they're allowed!!
    return { outcome: Access.Allowed };
  }
}
