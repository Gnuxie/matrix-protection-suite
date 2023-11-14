/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019, 2022 The Matrix.org Foundation C.I.C.

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

import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import { PolicyListRevision } from '../../PolicyList/PolicyListRevision';
import { PolicyRuleChange } from '../../PolicyList/PolicyRuleChange';
import { ConsequenceProvider } from '../Consequence';
import {
  AbstractProtection,
  Protection,
  ProtectionDescription,
  describeProtection,
} from '../Protection';
import {
  MembershipChange,
  MembershipChangeType,
} from '../../StateTracking/MembershipChange';
import { RoomMembershipRevision } from '../../StateTracking/MembershipRevision';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import { PolicyRuleType } from '../../MatrixTypes/PolicyEvents';
import { Recommendation } from '../../PolicyList/PolicyRule';
import { MultipleErrors } from '../../Interface/MultipleErrors';
import AccessControl, { Access } from '../AccessControl';

class MemberBanSynchronisationProtection
  extends AbstractProtection
  implements Protection
{
  constructor(
    description: ProtectionDescription,
    consequenceProvider: ConsequenceProvider,
    protectedRoomsSet: ProtectedRoomsSet
  ) {
    super(description, consequenceProvider, protectedRoomsSet, [], []);
  }

  public async handleMembershipChange(
    revision: RoomMembershipRevision,
    changes: MembershipChange[]
  ): Promise<ActionResult<void>> {
    // we need access to the policy list issuer from the protected rooms set.
    const directIssuer =
      this.protectedRoomsSet.issuerManager.policyListRevisionIssuer;
    // then check the changes against the policies
    const errors: ActionError[] = [];
    for (const change of changes) {
      switch (change.membershipChangeType) {
        case MembershipChangeType.Banned:
        case MembershipChangeType.Kicked:
        case MembershipChangeType.Left:
        case MembershipChangeType.NoChange:
        case MembershipChangeType.Unbanned:
          continue;
      }
      const applicableRules =
        directIssuer.currentRevision.allRulesMatchingEntity(
          change.userID,
          PolicyRuleType.User
        );

      for (const rule of applicableRules) {
        if (rule.recommendation === Recommendation.Ban) {
          const result =
            await this.consequenceProvider.consequenceForUserInRoom(
              revision.room.toRoomIdOrAlias(),
              change.userID,
              rule.reason
            );
          if (isError(result)) {
            errors.push(result.error);
          }
          break;
        }
      }
    }
    if (errors.length > 1) {
      return MultipleErrors.Result(
        `There were errors when banning members in ${revision.room.toPermalink()}`,
        { errors }
      );
    } else {
      return Ok(undefined);
    }
  }

  public async synchroniseWithRevision(
    revision: PolicyListRevision
  ): Promise<ActionResult<void>> {
    const errors: ActionError[] = [];
    for (const membershipRevision of this.protectedRoomsSet.setMembership
      .allRooms) {
      for (const membership of membershipRevision.members()) {
        const access = AccessControl.getAccessForUser(
          revision,
          membership.userID,
          'IGNORE_SERVER'
        );
        if (access.outcome === Access.Banned) {
          const consequenceResult =
            await this.consequenceProvider.consequenceForUserInRoom(
              membership.roomID,
              membership.userID,
              access.rule?.reason ?? '<no reason supplied>'
            );
          if (isError(consequenceResult)) {
            errors.push(consequenceResult.error);
          }
        }
      }
    }
    if (errors.length > 1) {
      return MultipleErrors.Result(
        `There were errors when enacting consequences against members when synchronising with revision`,
        { errors }
      );
    } else {
      return Ok(undefined);
    }
  }

  public async handlePolicyChange(
    revision: PolicyListRevision,
    _changes: PolicyRuleChange[]
  ): Promise<ActionResult<void>> {
    return await this.synchroniseWithRevision(revision);
  }
}

describeProtection({
  name: 'MemberBanSynchronisationProtection',
  description:
    'Synchronises `m.ban` events from watch policy lists with room level bans.',
  factory: MemberBanSynchronisationProtection,
});
