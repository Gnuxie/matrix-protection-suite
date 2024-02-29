// Copyright 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

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
import { ResultForUserInSetMap, UserConsequences } from './UserConsequences';
import './UserConsequences'; // we need this so the interface is loaded.

function setMemberBanResult(
  map: ResultForUserInSetMap,
  userID: StringUserID,
  roomID: StringRoomID,
  result: ActionResult<void>
): void {
  const userEntry =
    map.get(userID) ??
    ((roomMap) => (map.set(userID, roomMap), roomMap))(new Map());
  userEntry.set(roomID, result);
}

export class StandardUserConsequences implements UserConsequences, Capability {
  public readonly requiredPermissions = ['ban'];
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
  ): Promise<ResultForUserInSetMap> {
    const setMembershipBanResultMap: ResultForUserInSetMap = new Map();
    for (const membershipRevision of setMembership.allRooms) {
      for (const membership of membershipRevision.members()) {
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
          setMemberBanResult(
            setMembershipBanResultMap,
            membership.userID,
            membership.roomID,
            consequenceResult
          );
        }
      }
    }
    return setMembershipBanResultMap;
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
  ): Promise<ActionResult<ResultForUserInSetMap>> {
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
  ): Promise<ActionResult<ResultForUserInSetMap>> {
    const resultForUserInSetMap: ResultForUserInSetMap = new Map();
    for (const membershipRevision of this.setMembership.allRooms) {
      const membership = membershipRevision.membershipForUser(userID);
      if (
        membership !== undefined &&
        membership.membership === Membership.Ban
      ) {
        setMemberBanResult(
          resultForUserInSetMap,
          userID,
          membershipRevision.room.toRoomIDOrAlias(),
          await this.roomUnbanner.unbanUser(
            membershipRevision.room,
            userID,
            reason
          )
        );
      }
    }
    return Ok(resultForUserInSetMap);
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
