// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { ActionResult, Ok } from '../../Interface/Action';
import { Value } from '../../Interface/Value';
import { StateEvent } from '../../MatrixTypes/Events';
import { PolicyRuleType } from '../../MatrixTypes/PolicyEvents';
import { ServerACLEvent } from '../../MatrixTypes/ServerACL';
import { serverName } from '../../MatrixTypes/StringlyTypedMatrix';
import { PolicyListRevision } from '../../PolicyList/PolicyListRevision';
import { PolicyRuleChange } from '../../PolicyList/PolicyRuleChange';
import {
  RoomStateRevision,
  StateChange,
} from '../../StateTracking/StateRevisionIssuer';
import { AccessControl } from '../AccessControl';
import { BasicConsequenceProvider } from '../Capability/Consequence';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import {
  AbstractProtection,
  Protection,
  ProtectionDescription,
  describeProtection,
} from '../Protection';

export class ServerBanSynchronisationProtection
  extends AbstractProtection
  implements Protection
{
  private readonly serverName: string;
  constructor(
    description: ProtectionDescription,
    consequenceProvider: BasicConsequenceProvider,
    protectedRoomsSet: ProtectedRoomsSet
  ) {
    super(
      description,
      consequenceProvider,
      protectedRoomsSet,
      ['m.room.server_acl'],
      []
    );
    this.serverName = serverName(this.protectedRoomsSet.userID);
  }

  public async handleStateChange(
    revision: RoomStateRevision,
    changes: StateChange<StateEvent>[]
  ): Promise<ActionResult<void>> {
    const serverACLEventChanges = changes.filter(
      (change) => change.eventType === 'm.room.server_acl'
    );
    if (serverACLEventChanges.length === 0) {
      return Ok(undefined);
    }
    if (serverACLEventChanges.length !== 1) {
      throw new TypeError(
        `How is it possible for there to be more than one server_acl event change in the same revision?`
      );
    }
    const serverACLEvent = serverACLEventChanges.at(1)?.state;
    if (!Value.Check(ServerACLEvent, serverACLEvent)) {
      throw new TypeError(`Event decoding is not working`);
    }
    const mostRecentACL = AccessControl.compileServerACL(
      this.serverName,
      this.protectedRoomsSet.issuerManager.policyListRevisionIssuer
        .currentRevision
    );
    if (serverACLEvent.content !== undefined) {
      if (mostRecentACL.matches(serverACLEvent.content)) {
        return Ok(undefined);
      }
    }
    return await this.consequenceProvider.consequenceForServerACLInRoom(
      this.description,
      revision.room.toRoomIDOrAlias(),
      mostRecentACL.safeAclContent()
    );
  }

  public async handlePolicyChange(
    _revision: PolicyListRevision,
    changes: PolicyRuleChange[]
  ): Promise<ActionResult<void>> {
    const serverPolicyChanges = changes.filter(
      (change) => change.rule.kind === PolicyRuleType.Server
    );
    if (serverPolicyChanges.length === 0) {
      return Ok(undefined);
    }
    return await this.consequenceProvider.consequenceForServerACL(
      this.description,
      AccessControl.compileServerACL(
        this.serverName,
        this.protectedRoomsSet.issuerManager.policyListRevisionIssuer
          .currentRevision
      ).safeAclContent()
    );
  }
}

describeProtection({
  name: 'ServerBanSynchronisationProtection',
  description:
    'Synchronise server bans from watched policy lists across the protected rooms set by producing ServerACL events',
  factory: (description, consequenceProvider, protectedRoomsSet, _settings) =>
    Ok(
      new ServerBanSynchronisationProtection(
        description,
        consequenceProvider,
        protectedRoomsSet
      )
    ),
});
