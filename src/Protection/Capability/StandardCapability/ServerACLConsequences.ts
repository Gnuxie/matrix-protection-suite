// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import {
  StringRoomID,
  userServerName,
} from '@the-draupnir-project/matrix-basic-types';
import { RoomStateEventSender } from '../../../Client/RoomStateEventSender';
import {
  ActionError,
  ActionResult,
  Ok,
  isError,
} from '../../../Interface/Action';
import { PolicyListRevision } from '../../../PolicyList/PolicyListRevision';
import { Access, AccessControl } from '../../AccessControl';
import { ProtectedRoomsSet } from '../../ProtectedRoomsSet';
import { Capability, describeCapabilityProvider } from '../CapabilityProvider';
import { RoomSetResult, RoomSetResultBuilder } from './RoomSetResult';
import { ServerConsequences } from './ServerConsequences';
import './ServerConsequences'; // we need this so the interface is loaded.

export class ServerACLConequences implements ServerConsequences, Capability {
  public readonly requiredPermissions = [];
  public readonly requiredEventPermissions = [];
  public readonly requiredStatePermissions = ['m.room.server_acl'];
  /** The name of the server we are operating from, so that we don't brick ourselves */
  private readonly serverName: string;

  public constructor(
    private readonly stateEventSender: RoomStateEventSender,
    private readonly protectedRoomsSet: ProtectedRoomsSet
  ) {
    // nothing to do.
    this.serverName = userServerName(this.protectedRoomsSet.userID);
  }

  private async applyPolicyRevisionToRoom(
    roomID: StringRoomID,
    revision: PolicyListRevision
  ): Promise<ActionResult<boolean>> {
    const ACL = AccessControl.compileServerACL(this.serverName, revision);
    const stateRevision =
      this.protectedRoomsSet.setRoomState.getRevision(roomID);
    if (stateRevision === undefined) {
      throw new TypeError(
        `Somehowe we can't get the state for this room ${roomID}`
      );
    }
    const existingStateEvent = stateRevision.getStateEvent(
      'm.room.server_acl',
      ''
    );
    if (
      existingStateEvent !== undefined &&
      ACL.matches(existingStateEvent.content)
    ) {
      return Ok(false);
    }
    const result = await this.stateEventSender.sendStateEvent(
      roomID,
      'm.room.server_acl',
      '',
      ACL.safeAclContent()
    );
    if (isError(result)) {
      return result;
    } else {
      return Ok(true);
    }
  }

  private async applyPolicyRevisionToSet(
    revision: PolicyListRevision
  ): Promise<ActionResult<RoomSetResult>> {
    const resultBuilder = new RoomSetResultBuilder();
    for (const room of this.protectedRoomsSet.allProtectedRooms) {
      resultBuilder.addResult(
        room.toRoomIDOrAlias(),
        (await this.applyPolicyRevisionToRoom(
          room.toRoomIDOrAlias(),
          revision
        )) as ActionResult<void>
      );
    }
    return Ok(resultBuilder.getResult());
  }
  public async consequenceForServersInRoom(
    roomID: StringRoomID,
    revision: PolicyListRevision
  ): Promise<ActionResult<boolean>> {
    return await this.applyPolicyRevisionToRoom(roomID, revision);
  }
  public async consequenceForServersInRoomSet(
    revision: PolicyListRevision
  ): Promise<ActionResult<RoomSetResult>> {
    return await this.applyPolicyRevisionToSet(revision);
  }
  public async unbanServerFromRoomSet(
    serverName: string,
    _reason: string
  ): Promise<ActionResult<RoomSetResult>> {
    const revision =
      this.protectedRoomsSet.issuerManager.policyListRevisionIssuer
        .currentRevision;
    // this method is for applying the ACL, not removing policies.
    const access = AccessControl.getAccessForServer(revision, serverName);
    if (access.outcome !== Access.Allowed) {
      return ActionError.Result(
        `The server ${serverName} has policies that are denying it access to protected rooms with the reason: ${
          access.rule?.reason ?? 'undefined'
        }`
      );
    }
    return await this.applyPolicyRevisionToSet(revision);
  }
}

export type ServerACLConsequencesContext = {
  stateEventSender: RoomStateEventSender;
  protectedRoomsSet: ProtectedRoomsSet;
};

describeCapabilityProvider({
  name: 'ServerACLConsequences',
  description:
    'An implementation of ServerConsequences that uses m.room.server_acl to change access to rooms for servers.',
  interface: 'ServerConsequences',
  factory(_protectionDescription, context: ServerACLConsequencesContext) {
    return new ServerACLConequences(
      context.stateEventSender,
      context.protectedRoomsSet
    );
  },
});
