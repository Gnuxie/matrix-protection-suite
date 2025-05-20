// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import {
  StringRoomID,
  StringServerName,
  userServerName,
} from '@the-draupnir-project/matrix-basic-types';
import { RoomStateEventSender } from '../../../Client/RoomStateEventSender';
import {
  ActionError,
  ActionResult,
  Ok,
  isError,
} from '../../../Interface/Action';
import { Access, AccessControl } from '../../AccessControl';
import { ProtectedRoomsSet } from '../../ProtectedRoomsSet';
import { Capability, describeCapabilityProvider } from '../CapabilityProvider';
import { RoomSetResult, RoomSetResultBuilder } from './RoomSetResult';
import { ServerConsequences } from './ServerConsequences';
import './ServerConsequences'; // we need this so the interface is loaded.
import { Result } from '@gnuxie/typescript-result';
import { PolicyListRevisionIssuer } from '../../../PolicyList/PolicyListRevisionIssuer';
import {
  ActionException,
  ActionExceptionKind,
} from '../../../Interface/ActionException';
class ServerACLQueue {
  private readonly pendingRoomChecks = new Map<
    StringRoomID,
    Promise<Result<boolean>>
  >();

  private readonly activeRoomChecks = new Map<
    StringRoomID,
    Promise<Result<boolean>>
  >();

  public constructor(
    private readonly stateEventSender: RoomStateEventSender,
    private readonly serverName: StringServerName,
    private readonly protectedRoomsSet: ProtectedRoomsSet
  ) {
    // nothing to do.
  }

  private async applyPolicyRevisionToRoom(
    roomID: StringRoomID,
    issuer: PolicyListRevisionIssuer
  ): Promise<ActionResult<boolean>> {
    const ACL = AccessControl.compileServerACL(
      this.serverName,
      issuer.currentRevision
    );
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

  private async doActiveCheck(
    roomID: StringRoomID,
    revisionIssuer: PolicyListRevisionIssuer
  ): Promise<Result<boolean>> {
    try {
      const activeCheck = this.applyPolicyRevisionToRoom(
        roomID,
        revisionIssuer
      );
      this.activeRoomChecks.set(roomID, activeCheck);
      return await activeCheck;
    } finally {
      this.activeRoomChecks.delete(roomID);
    }
  }

  private async enqueueCheck(
    roomID: StringRoomID,
    revisionIssuer: PolicyListRevisionIssuer,
    activeCheck: Promise<Result<boolean>>
  ): Promise<Result<boolean>> {
    try {
      await activeCheck;
    } finally {
      this.pendingRoomChecks.delete(roomID);
    }
    return await this.doActiveCheck(roomID, revisionIssuer);
  }

  public async enqueueRoomCheck(
    roomID: StringRoomID,
    revisionIssuer: PolicyListRevisionIssuer
  ): Promise<Result<boolean>> {
    const pendingCheck = this.pendingRoomChecks.get(roomID);
    if (pendingCheck) {
      return pendingCheck;
    }
    const activeCheck = this.activeRoomChecks.get(roomID);
    if (activeCheck) {
      const pendingCheck = this.enqueueCheck(
        roomID,
        revisionIssuer,
        activeCheck
      );
      this.pendingRoomChecks.set(roomID, pendingCheck);
      return await pendingCheck;
    } else {
      return await this.doActiveCheck(roomID, revisionIssuer);
    }
  }
}

export class ServerACLConequences implements ServerConsequences, Capability {
  public readonly requiredPermissions = [];
  public readonly requiredEventPermissions = [];
  public readonly requiredStatePermissions = ['m.room.server_acl'];
  private readonly queue: ServerACLQueue;

  public constructor(
    stateEventSender: RoomStateEventSender,
    private readonly protectedRoomsSet: ProtectedRoomsSet
  ) {
    this.queue = new ServerACLQueue(
      stateEventSender,
      userServerName(this.protectedRoomsSet.userID),
      protectedRoomsSet
    );
  }

  private async applyPolicyRevisionToSet(
    revisionIssuer: PolicyListRevisionIssuer
  ): Promise<ActionResult<RoomSetResult>> {
    const resultBuilder = new RoomSetResultBuilder();
    try {
      await Promise.all(
        this.protectedRoomsSet.allProtectedRooms.map((room) =>
          this.queue
            .enqueueRoomCheck(room.toRoomIDOrAlias(), revisionIssuer)
            .then((result) => {
              resultBuilder.addResult(
                room.toRoomIDOrAlias(),
                result as Result<void>
              );
            })
        )
      );
    } catch (e) {
      if (e instanceof Error) {
        return ActionException.Result(
          `Uncaught error while applying server ACLS`,
          {
            exception: e,
            exceptionKind: ActionExceptionKind.Unknown,
          }
        );
      }
    }

    return Ok(resultBuilder.getResult());
  }
  public async consequenceForServersInRoom(
    roomID: StringRoomID,
    revisionIssuer: PolicyListRevisionIssuer
  ): Promise<ActionResult<boolean>> {
    return await this.queue.enqueueRoomCheck(roomID, revisionIssuer);
  }
  public async consequenceForServersInRoomSet(
    revisionIssuer: PolicyListRevisionIssuer
  ): Promise<ActionResult<RoomSetResult>> {
    return await this.applyPolicyRevisionToSet(revisionIssuer);
  }
  public async unbanServerFromRoomSet(
    serverName: string,
    _reason: string
  ): Promise<ActionResult<RoomSetResult>> {
    const revisionIssuer =
      this.protectedRoomsSet.watchedPolicyRooms.revisionIssuer;
    const revision = revisionIssuer.currentRevision;
    // this method is for applying the ACL, not removing policies.
    const access = AccessControl.getAccessForServer(revision, serverName);
    if (access.outcome !== Access.Allowed) {
      return ActionError.Result(
        `The server ${serverName} has policies that are denying it access to protected rooms with the reason: ${
          access.rule?.reason ?? 'undefined'
        }`
      );
    }
    return await this.applyPolicyRevisionToSet(revisionIssuer);
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
