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

import { ActionResult, Ok } from '../../Interface/Action';
import { Value } from '../../Interface/Value';
import { PolicyRuleType } from '../../MatrixTypes/PolicyEvents';
import { ServerACLEvent } from '../../MatrixTypes/ServerACL';
import { PolicyListRevision } from '../../PolicyList/PolicyListRevision';
import { PolicyRuleChange } from '../../PolicyList/PolicyRuleChange';
import {
  RoomStateRevision,
  StateChange,
} from '../../StateTracking/StateRevisionIssuer';
import { TrackedStateEvent } from '../../StateTracking/StateTrackingMeta';
import AccessControl from '../AccessControl';
import { ConsequenceProvider } from '../Consequence';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import {
  AbstractProtection,
  Protection,
  ProtectionDescription,
  describeProtection,
} from '../Protection';

export class ServerBanSynchronisation
  extends AbstractProtection
  implements Protection
{
  private readonly serverName: string;
  constructor(
    description: ProtectionDescription,
    consequenceProvider: ConsequenceProvider,
    protectedRoomsSet: ProtectedRoomsSet,
    { serverName }: { serverName?: string }
  ) {
    super(
      description,
      consequenceProvider,
      protectedRoomsSet,
      ['m.room.server_acl'],
      []
    );
    if (serverName === undefined) {
      throw new TypeError(
        `Cannot use the ServerBanSynchronisation protection without providing the name of the server our client is using.`
      );
    }
    this.serverName = serverName;
  }

  public async handleStateChange(
    revision: RoomStateRevision,
    changes: StateChange<TrackedStateEvent>[]
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
      this.protectedRoomsSet.directIssuer.currentRevision
    );
    if (serverACLEvent.content !== undefined) {
      if (mostRecentACL.matches(serverACLEvent.content)) {
        return Ok(undefined);
      }
    }
    return await this.consequenceProvider.consequenceForServerACLInRoom(
      revision.room.toRoomIdOrAlias(),
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
      AccessControl.compileServerACL(
        this.serverName,
        this.protectedRoomsSet.directIssuer.currentRevision
      ).safeAclContent()
    );
  }
}

describeProtection({
  name: 'ServerBanSynchronisation',
  description:
    'Synchronise server bans from watched policy lists across the protected rooms set by producing ServerACL events',
  factory: ServerBanSynchronisation,
});
