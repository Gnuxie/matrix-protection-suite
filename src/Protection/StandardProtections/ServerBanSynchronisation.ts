// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { MatrixRoomID } from '@the-draupnir-project/matrix-basic-types';
import { ActionResult, Ok, isError } from '../../Interface/Action';
import { Task } from '../../Interface/Task';
import { PolicyRuleType } from '../../MatrixTypes/PolicyEvents';
import { PolicyListRevision } from '../../PolicyList/PolicyListRevision';
import { PolicyRuleChange } from '../../PolicyList/PolicyRuleChange';
import {
  RoomStateRevision,
  StateChange,
} from '../../StateTracking/StateRevisionIssuer';
import { ServerConsequences } from '../Capability/StandardCapability/ServerConsequences';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import {
  AbstractProtection,
  Protection,
  ProtectionDescription,
  describeProtection,
} from '../Protection';
import { UnknownSettings } from '../ProtectionSettings/ProtectionSetting';

export class ServerBanSynchronisationProtection
  extends AbstractProtection<
    ProtectionDescription<unknown, UnknownSettings<string>, Capabilities>
  >
  implements
    Protection<
      ProtectionDescription<unknown, UnknownSettings<string>, Capabilities>
    >
{
  private readonly serverConsequences: ServerConsequences;
  constructor(
    description: ProtectionDescription<
      unknown,
      UnknownSettings<string>,
      Capabilities
    >,
    capabilities: Capabilities,
    protectedRoomsSet: ProtectedRoomsSet
  ) {
    super(description, capabilities, protectedRoomsSet, {});
    this.serverConsequences = capabilities.serverConsequences;
  }

  public async handleStateChange(
    revision: RoomStateRevision,
    changes: StateChange[]
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
    return await this.serverConsequences.consequenceForServersInRoom(
      revision.room.toRoomIDOrAlias(),
      this.protectedRoomsSet.issuerManager.policyListRevisionIssuer
        .currentRevision
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
    const result = await this.serverConsequences.consequenceForServersInRoomSet(
      this.protectedRoomsSet.issuerManager.policyListRevisionIssuer
        .currentRevision
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
        await this.serverConsequences.consequenceForServersInRoom(
          room.toRoomIDOrAlias(),
          this.protectedRoomsSet.issuerManager.policyListRevisionIssuer
            .currentRevision
        );
      })()
    );
  }
}

type Capabilities = {
  serverConsequences: ServerConsequences;
};

describeProtection<Capabilities>({
  name: 'ServerBanSynchronisationProtection',
  description:
    'Synchronise server bans from watched policy lists across the protected rooms set by producing ServerACL events',
  capabilityInterfaces: {
    serverConsequences: 'ServerConsequences',
  },
  defaultCapabilities: {
    serverConsequences: 'ServerACLConsequences',
  },
  factory: (description, protectedRoomsSet, _settings, capabilities) =>
    Ok(
      new ServerBanSynchronisationProtection(
        description,
        capabilities,
        protectedRoomsSet
      )
    ),
});
