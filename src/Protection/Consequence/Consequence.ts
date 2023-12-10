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

import { ActionResult } from '../../Interface/Action';
import { ServerACLContent } from '../../MatrixTypes/ServerACL';
import {
  StringEventID,
  StringRoomID,
  StringUserID,
} from '../../MatrixTypes/StringlyTypedMatrix';
import { PolicyListRevision } from '../../PolicyList/PolicyListRevision';
import { SetMembership } from '../../StateTracking/SetMembership';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import { ProtectionDescription } from '../Protection';

export const DEFAULT_CONSEQUENCE_PROVIDER = 'DefaultConsequenceProvider';

export type ProtectionDescriptionInfo = Pick<
  ProtectionDescription,
  'name' | 'description'
>;

/**
 * We don't want to give protections access to the consequence provider
 * description, just in case they do something silly.
 */
export interface ConsequenceProviderDescription<Context = unknown> {
  /** Used by the user to identify the description */
  name: string;
  description: string;
  /** These aren't checked, just a way of tagging the provider. */
  interfaces: string[];
  /** Returns an instance of the provider. */
  factory(context: Context): ConsequenceProvider;
}

export interface ConsequenceProvider {
  readonly requiredPermissions: string[];
  readonly requiredEventPermissions: string[];
}

const PROVIDER_DESCRIPTIONS = new Map<string, ConsequenceProviderDescription>();

export function registerConsequenceProvider(
  description: ConsequenceProviderDescription
): void {
  if (PROVIDER_DESCRIPTIONS.has(description.name)) {
    throw new TypeError(
      `There is already a consequence provider named ${description.name}`
    );
  }
  PROVIDER_DESCRIPTIONS.set(description.name, description);
}

export function findConsequenceProvider<Context = unknown>(
  name: string
): ConsequenceProviderDescription<Context> | undefined {
  return PROVIDER_DESCRIPTIONS.get(name);
}

export function describeConsequenceProvider<Context = unknown>({
  name,
  description,
  interfaces = [],
  factory,
}: {
  name: string;
  description: string;
  interfaces?: string[];
  factory(context: Context): ConsequenceProvider;
}): void {
  registerConsequenceProvider({
    name,
    description,
    interfaces,
    factory,
  });
}

/**
 * We are string to draft out the consequence provider detail that will
 * put names to providers and then we can implement the draupnir
 * commands for adding configs with a little more ease.
 */

/**
 * This has to be provided to all protections, they can't configure it themselves.
 */
export interface BasicConsequenceProvider extends ConsequenceProvider {
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
  unbanUserFromRoomsInSet(
    protectionDescription: ProtectionDescriptionInfo,
    userID: StringUserID,
    set: ProtectedRoomsSet
  ): Promise<ActionResult<void>>;
}
