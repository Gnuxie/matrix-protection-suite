// Copyright 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import {
  StringRoomID,
  StringUserID,
} from '@the-draupnir-project/matrix-basic-types';
import { PowerLevelPermission } from '../../../Client/PowerLevelsMirror';
import { RoomBanner } from '../../../Client/RoomBanner';
import { RoomUnbanner } from '../../../Client/RoomUnbanner';
import { ActionError, ActionResult, Ok } from '../../../Interface/Action';
import { Membership } from '../../../Membership/MembershipChange';
import { RoomMembershipRevision } from '../../../Membership/MembershipRevision';
import { SetMembership } from '../../../Membership/SetRoomMembership';
import { PolicyListRevision } from '../../../PolicyList/PolicyListRevision';
import { Access, AccessControl } from '../../AccessControl';
import { Capability, describeCapabilityProvider } from '../CapabilityProvider';
import {
  ResultForUsersInSetBuilder,
  ResultForUsersInSet,
  RoomSetResultBuilder,
  RoomSetResult,
  ResultForUsersInRoom,
  ResultForUsersInRoomBuilder,
} from './RoomSetResult';
import { UserConsequences } from './UserConsequences';
import './UserConsequences'; // we need this so the interface is loaded.

export class StandardUserConsequences implements UserConsequences, Capability {
  public readonly requiredPermissions = [PowerLevelPermission.Ban];
  public readonly requiredEventPermissions = [];
  public readonly requiredStatePermissions = [];
  public constructor(
    private readonly roomBanner: RoomBanner,
    private readonly roomUnbanner: RoomUnbanner,
    private readonly setMembership: SetMembership
  ) {
    // nothing to do.
  }

  private static async applyRevisionToRoom(
    revision: PolicyListRevision,
    roomMembershipRevision: RoomMembershipRevision,
    consequenceProviderCB: UserConsequences['consequenceForUserInRoom']
  ): Promise<ResultForUsersInRoom> {
    const resultBuilder = new ResultForUsersInRoomBuilder();
    for (const membership of roomMembershipRevision.members()) {
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
        resultBuilder.addResult(membership.userID, consequenceResult);
      }
    }
    return resultBuilder.getResult();
  }

  public static async applyPolicyRevisionToSetMembership(
    revision: PolicyListRevision,
    setMembership: SetMembership,
    consequenceProviderCB: UserConsequences['consequenceForUserInRoom']
  ): Promise<ResultForUsersInSet> {
    const resultBuilder = new ResultForUsersInSetBuilder();
    for (const membershipRevision of setMembership.allRooms) {
      const results = await StandardUserConsequences.applyRevisionToRoom(
        revision,
        membershipRevision,
        consequenceProviderCB
      );
      for (const [userID, result] of results.map) {
        resultBuilder.addResult(
          userID,
          membershipRevision.room.toRoomIDOrAlias(),
          result
        );
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
  public async consequenceForUsersInRoomSet(
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
  public async consequenceForUsersInRoom(
    roomID: StringRoomID,
    revision: PolicyListRevision
  ): Promise<ActionResult<ResultForUsersInRoom>> {
    const membershipRevision = this.setMembership.getRevision(roomID);
    if (membershipRevision === undefined) {
      return ActionError.Result(
        `Unable to find a membership revision for the room ${roomID}`
      );
    }
    return Ok(
      await StandardUserConsequences.applyRevisionToRoom(
        revision,
        membershipRevision,
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
