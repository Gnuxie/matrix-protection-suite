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
import { ActionResult } from '../Interface/Action';
import { PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { PolicyRule, Recommendation } from './PolicyRule';

/**
 * An interface for editing the policies in a PolicyRoom.
 */
export interface PolicyRoomEditor {
  /**
   * Create a policy in the Matrix room.
   * @param entityType The `PolicyRuleType` for the policy.
   * @param recommendation The recommendation for the policy rule.
   * @param entity The entity that is the subject of the rule.
   * @param reason A reason for the policy being created.
   * @param additionalProperties Any other properties that should be embedded in
   * the content of the rule.
   * @returns An `ActionResult` with the event ID of the newly created policy.
   * @see {@link PolicyRuleType}
   * @see {@link Recommendation}
   */
  createPolicy(
    entityType: PolicyRuleType,
    recommendation: Recommendation,
    entity: string,
    reason: string,
    additionalProperties: Record<string, unknown>
  ): Promise<ActionResult<string /** The event ID of the new policy. */>>;
  /**
   * Remove a policy enacted upon an entity from the Matrix room.
   * Necessary because each `PolicyRuleType` and `Recommendation` can have
   * several variants from historical code.
   * @param ruleType The `PolicyRuleType` for the enacted policy.
   * @param recommendation The `Recommendation` for the enacted policy,
   * @param entity The entity that is the subject of the policy.
   * @param reason The reason for the removal of the policy.
   * @returns An `ActionResult` with the `PolicyRule`s that were removed.
   * @see {@link PolicyRuleType}
   * @see {@link Recommendation}
   */
  removePolicy(
    ruleType: PolicyRuleType,
    recommendation: Recommendation,
    entity: string,
    reason?: string
  ): Promise<ActionResult<PolicyRule[]>>;
  /**
   * Create a policy rule with the recommendation to ban the entity.
   * @param ruleType The `PolicyRuleType` for the entity.
   * @param entity The subject of the policy.
   * @param reason The reason why the entity will be banned.
   * @returns The event ID for the newly created policy rule.
   */
  banEntity(
    ruleType: PolicyRuleType,
    entity: string,
    reason?: string
  ): Promise<ActionResult<string>>;
  /**
   * Unban an entity that has a policy with the ban recommendation enacted against it.
   * @param ruleType The `PolicyRuleType` relevant to the entity.
   * @param entity The subject of the enacted ban.
   * @returns The `PolicyRule`s that were enacting a ban against the entity.
   */
  unbanEntity(
    ruleType: PolicyRuleType,
    entity: string
  ): Promise<ActionResult<PolicyRule[]>>;
}
