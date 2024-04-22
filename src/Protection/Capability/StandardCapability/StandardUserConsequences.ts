// Copyright 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { PowerLevelPermission } from '../../../Client/PowerLevelsMirror';
import { RoomBanner } from '../../../Client/RoomBanner';
import { RoomUnbanner } from '../../../Client/RoomUnbanner';
import { ActionResult, Ok } from '../../../Interface/Action';
import {
  StringRoomID,
  StringUserID,
} from '../../../MatrixTypes/StringlyTypedMatrix';
import { Membership } from '../../../Membership/MembershipChange';
import { SetMembership } from '../../../Membership/SetMembership';
import { PolicyListRevision } from '../../../PolicyList/PolicyListRevision';
import { Access, AccessControl } from '../../AccessControl';
import { Capability, describeCapabilityProvider } from '../CapabilityProvider';
import {
  ResultForUsersInSetBuilder,
  ResultForUsersInSet,
  RoomSetResultBuilder,
  RoomSetResult,
} from './RoomSetResult';
import { UserConsequences } from './UserConsequences';
import './UserConsequences'; // we need this so the interface is loaded.

export class StandardUserConsequences implements UserConsequences, Capability {
  public readonly requiredPermissions = [PowerLevelPermission.Ban];
  public readonly requiredEventPermissions = [];
  public constructor(
    private readonly roomBanner: RoomBanner,
    private readonly roomUnbanner: RoomUnbanner,
    private readonly setMembership: SetMembership
  ) {
    // nothing to do.
  }

  public static async applyPolicyRevisionToSetMembership(
    revision: PolicyListRevision,
    setMembership: SetMembership,
    consequenceProviderCB: UserConsequences['consequenceForUserInRoom']
  ): Promise<ResultForUsersInSet> {
    const resultBuilder = new ResultForUsersInSetBuilder();
    for (const membershipRevision of setMembership.allRooms) {
      for (const membership of membershipRevision.members()) {
        if (membership.membership === Membership.Ban) {
          continue;
        }
        const access = AccessControl.getAccessForUser(
          revision,
          membership.userID,
          'IGNORE_SERVER'
        );
        if (access.outcome === Access.Banned) {
          const consequenceResult = await consequenceProviderCB(
            membership.roomID,
            membership.userID,
            access.rule?.reason ?? '<no reason supplied>'
          );
          resultBuilder.addResult(
            membership.userID,
            membership.roomID,
            consequenceResult
          );
        }
      }
    }
    return resultBuilder.getResult();
  }
  public async consequenceForUserInRoom(
    roomID: StringRoomID,
    user: StringUserID,
    reason: string
  ): Promise<ActionResult<void>> {
    return await this.roomBanner.banUser(roomID, user, reason);
  }
  public async consequenceForUserInRoomSet(
    revision: PolicyListRevision
  ): Promise<ActionResult<ResultForUsersInSet>> {
    return Ok(
      await StandardUserConsequences.applyPolicyRevisionToSetMembership(
        revision,
        this.setMembership,
        this.roomBanner.banUser.bind(this.roomBanner)
      )
    );
  }
  public async unbanUserFromRoomSet(
    userID: StringUserID,
    reason: string
  ): Promise<ActionResult<RoomSetResult>> {
    const resultBuilder = new RoomSetResultBuilder();
    for (const membershipRevision of this.setMembership.allRooms) {
      const membership = membershipRevision.membershipForUser(userID);
      if (
        membership !== undefined &&
        membership.membership === Membership.Ban
      ) {
        resultBuilder.addResult(
          membershipRevision.room.toRoomIDOrAlias(),
          await this.roomUnbanner.unbanUser(
            membershipRevision.room,
            userID,
            reason
          )
        );
      }
    }
    return Ok(resultBuilder.getResult());
  }
}

export type StandardUserConsequencesContext = {
  roomBanner: RoomBanner;
  roomUnbanner: RoomUnbanner;
  setMembership: SetMembership;
};

describeCapabilityProvider({
  name: 'StandardUserConsequences',
  description: 'Bans users and unbans users.',
  interface: 'UserConsequences',
  factory(_description, context: StandardUserConsequencesContext) {
    return new StandardUserConsequences(
      context.roomBanner,
      context.roomUnbanner,
      context.setMembership
    );
  },
});
