// Copyright 2022-2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import {
  AbstractProtection,
  Protection,
  ProtectionDescription,
  describeProtection,
} from '../Protection';
import {
  MembershipChange,
  MembershipChangeType,
} from '../../Membership/MembershipChange';
import { RoomMembershipRevision } from '../../Membership/MembershipRevision';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import { PolicyRuleType } from '../../MatrixTypes/PolicyEvents';
import { Recommendation } from '../../PolicyList/PolicyRule';
import { MultipleErrors } from '../../Interface/MultipleErrors';
import { UserConsequences } from '../Capability/StandardCapability/UserConsequences';
import '../Capability/StandardCapability/UserConsequences'; // need this to load the interface.
import '../Capability/StandardCapability/StandardUserConsequences'; // need this to load the providers.
import { Task } from '../../Interface/Task';
import { MatrixRoomID } from '@the-draupnir-project/matrix-basic-types';
import { UnknownConfig } from '../../Config/ConfigDescription';
import {
  MemberPolicyMatches,
  SetMembershipPolicyRevision,
} from '../../MembershipPolicies/MembershipPolicyRevision';

function revisionMatchesWithUserRules(
  revision: SetMembershipPolicyRevision
): MemberPolicyMatches[] {
  return revision
    .allMembersWithRules()
    .filter((match) =>
      match.policies.some((policy) => policy.kind === PolicyRuleType.User)
    );
}

export type MemberBanSynchronisationProtectionDescription =
  ProtectionDescription<
    unknown,
    UnknownConfig,
    MemberBanSynchronisationProtectionCapabilities
  >;

export class MemberBanSynchronisationProtection
  extends AbstractProtection<MemberBanSynchronisationProtectionDescription>
  implements Protection<MemberBanSynchronisationProtectionDescription>
{
  private readonly userConsequences: UserConsequences;
  constructor(
    description: MemberBanSynchronisationProtectionDescription,
    capabilities: MemberBanSynchronisationProtectionCapabilities,
    protectedRoomsSet: ProtectedRoomsSet
  ) {
    super(description, capabilities, protectedRoomsSet, {});
    this.userConsequences = capabilities.userConsequences;
  }

  public handleSetMembershipPolicyMatchesChange(
    revision: SetMembershipPolicyRevision
  ): void {
    void Task(this.synchroniseWithRevision(revision));
  }

  public async handleMembershipChange(
    revision: RoomMembershipRevision,
    changes: MembershipChange[]
  ): Promise<ActionResult<void>> {
    // we need access to the policy list issuer from the protected rooms set.
    const directIssuer =
      this.protectedRoomsSet.watchedPolicyRooms.revisionIssuer;
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
          const result = await this.userConsequences.consequenceForUserInRoom(
            revision.room.toRoomIDOrAlias(),
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
    revision: SetMembershipPolicyRevision
  ): Promise<ActionResult<void>> {
    const result = await this.userConsequences.consequenceForUsersInRoomSet(
      revisionMatchesWithUserRules(revision)
    );
    if (isError(result)) {
      return result;
    } else {
      return Ok(undefined);
    }
  }

  public handlePermissionRequirementsMet(room: MatrixRoomID): void {
    void Task(
      (async () => {
        await this.userConsequences.consequenceForUsersInRoom(
          room.toRoomIDOrAlias(),
          revisionMatchesWithUserRules(
            this.protectedRoomsSet.setPoliciesMatchingMembership.currentRevision
          )
        );
      })()
    );
  }
}

export type MemberBanSynchronisationProtectionCapabilities = {
  userConsequences: UserConsequences;
};

describeProtection<MemberBanSynchronisationProtectionCapabilities>({
  name: 'MemberBanSynchronisationProtection',
  description:
    'Synchronises `m.ban` events from watch policy lists with room level bans.',
  capabilityInterfaces: {
    userConsequences: 'UserConsequences',
  },
  defaultCapabilities: {
    userConsequences: 'StandardUserConsequences',
  },
  factory: (decription, protectedRoomsSet, _settings, capabilitySet) =>
    Ok(
      new MemberBanSynchronisationProtection(
        decription,
        capabilitySet,
        protectedRoomsSet
      )
    ),
});
