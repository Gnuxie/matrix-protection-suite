/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { ActionResult } from '../Interface/Action';
import { ServerACLContent } from '../MatrixTypes/ServerACL';
import {
  StringEventID,
  StringRoomID,
  StringUserID,
} from '../MatrixTypes/StringlyTypedMatrix';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import { SetMembership } from '../StateTracking/SetMembership';
import { ProtectionDescription } from './Protection';

export enum StandardConsequence {
  /**
   * Request a ban after detected abuse.
   */
  Ban = 'ban',
  /**
   * Request a kick after detected abuse.
   */
  Kick = 'kick',
  /**
   * Request a message redaction after detected abuse.
   */
  Redact = 'redact',
  /**
   * Request an alert to be created after detected abuse.
   */
  Alert = 'alert',
  /**
   * Another consequence.
   */
  Custom = 'Custom',
}

export type ProtectionDescriptionInfo = Pick<
  ProtectionDescription,
  'name' | 'description'
>;

/**
 * This has to be provided to all protections, they can't configure it themselves.
 */
export interface ConsequenceProvider {
  consequenceForUserInRoom(
    protectionDescription: ProtectionDescriptionInfo,
    roomID: StringRoomID,
    user: StringUserID,
    reason: string
  ): Promise<ActionResult<void>>;
  renderConsequenceForUserInRoom(
    protectionDescription: ProtectionDescriptionInfo,
    roomID: StringRoomID,
    user: StringUserID,
    reason: string
  ): Promise<ActionResult<void>>;
  consequenceForUsersInRevision(
    protectionDescription: ProtectionDescriptionInfo,
    membershipSet: SetMembership,
    revision: PolicyListRevision
  ): Promise<ActionResult<void>>;
  consequenceForServerInRoom(
    protectionDescription: ProtectionDescriptionInfo,
    roomID: StringRoomID,
    serverName: string,
    reason: string
  ): Promise<ActionResult<void>>;
  consequenceForEvent(
    protectionDescription: ProtectionDescriptionInfo,
    roomID: StringRoomID,
    eventID: StringEventID,
    reason: string
  ): Promise<ActionResult<void>>;
  consequenceForServerACL(
    protectionDescription: ProtectionDescriptionInfo,
    content: ServerACLContent
  ): Promise<ActionResult<void>>;
  consequenceForServerACLInRoom(
    protectionDescription: ProtectionDescriptionInfo,
    roomID: StringRoomID,
    content: ServerACLContent
  ): Promise<ActionResult<void>>;
  readonly requiredPermissions: string[];
  readonly requiredEventPermissions: string[];
}
