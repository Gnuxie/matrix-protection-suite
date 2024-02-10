// Copyright 2022-2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0

// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir

import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import { PolicyListRevision } from '../../PolicyList/PolicyListRevision';
import { PolicyRuleChange } from '../../PolicyList/PolicyRuleChange';
import {
  BasicConsequenceProvider,
  ProtectionDescriptionInfo,
} from '../Consequence/Consequence';
import {
  AbstractProtection,
  Protection,
  ProtectionDescription,
  describeProtection,
} from '../Protection';
import {
  Membership,
  MembershipChange,
  MembershipChangeType,
} from '../../StateTracking/MembershipChange';
import { RoomMembershipRevision } from '../../StateTracking/MembershipRevision';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import { PolicyRuleType } from '../../MatrixTypes/PolicyEvents';
import { Recommendation } from '../../PolicyList/PolicyRule';
import { MultipleErrors } from '../../Interface/MultipleErrors';
import { Access, AccessControl } from '../AccessControl';
import {
  StringRoomID,
  StringUserID,
} from '../../MatrixTypes/StringlyTypedMatrix';
import { SetMembership } from '../../StateTracking/SetMembership';
import { MatrixRoomID } from '../../MatrixTypes/MatrixRoomReference';
import { RoomEvent } from '../../MatrixTypes/Events';
import { Value } from '../../Interface/Value';
import { MembershipEvent } from '../../MatrixTypes/MembershipEvent';

class MemberBanSynchronisationProtection
  extends AbstractProtection
  implements Protection
{
  constructor(
    description: ProtectionDescription,
    consequenceProvider: BasicConsequenceProvider,
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
              this.description,
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
  public async handleTimelineEvent(
    room: MatrixRoomID,
    event: RoomEvent
  ): Promise<ActionResult<void>> {
    if (event.type === 'm.room.member' && Value.Check(MembershipEvent, event)) {
      switch (event.content.membership) {
        case Membership.Ban:
        case Membership.Leave:
          return Ok(undefined);
      }
      const directIssuer =
        this.protectedRoomsSet.issuerManager.policyListRevisionIssuer;
      const applicableRule =
        directIssuer.currentRevision.findRuleMatchingEntity(
          event.state_key,
          PolicyRuleType.User,
          Recommendation.Ban
        );
      if (applicableRule !== undefined) {
        return await this.consequenceProvider.consequenceForUserInRoom(
          this.description,
          room.toRoomIDOrAlias(),
          event.state_key as StringUserID,
          applicableRule.reason
        );
      }
    }
    return Ok(undefined);
  }

  public async synchroniseWithRevision(
    revision: PolicyListRevision
  ): Promise<ActionResult<void>> {
    return await this.consequenceProvider.consequenceForUsersInRevision(
      this.description,
      this.protectedRoomsSet.setMembership,
      revision
    );
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
  factory: (decription, consequenceProvider, protectedRoomsSet, _settings) =>
    Ok(
      new MemberBanSynchronisationProtection(
        decription,
        consequenceProvider,
        protectedRoomsSet
      )
    ),
});

export type SetMemberBanResultMap = Map<
  StringUserID,
  Map<StringRoomID, ActionResult<void>>
>;

function setMemberBanResult(
  map: SetMemberBanResultMap,
  userID: StringUserID,
  roomID: StringRoomID,
  result: ActionResult<void>
): void {
  const userEntry =
    map.get(userID) ??
    ((roomMap) => (map.set(userID, roomMap), roomMap))(new Map());
  userEntry.set(roomID, result);
}

export async function applyPolicyRevisionToSetMembership(
  description: ProtectionDescriptionInfo,
  revision: PolicyListRevision,
  setMembership: SetMembership,
  consequenceProviderCB: BasicConsequenceProvider['consequenceForUserInRoom']
): Promise<SetMemberBanResultMap> {
  const setMembershipBanResultMap: SetMemberBanResultMap = new Map();
  for (const membershipRevision of setMembership.allRooms) {
    for (const membership of membershipRevision.members()) {
      const access = AccessControl.getAccessForUser(
        revision,
        membership.userID,
        'IGNORE_SERVER'
      );
      if (access.outcome === Access.Banned) {
        const consequenceResult = await consequenceProviderCB(
          description,
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
