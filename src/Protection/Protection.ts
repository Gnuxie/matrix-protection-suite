/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019 The Matrix.org Foundation C.I.C.

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
import { RoomEvent } from '../MatrixTypes/Events';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import { PolicyRuleChange } from '../PolicyList/PolicyRuleChange';
import { MembershipChange } from '../StateTracking/MembershipChange';
import { RoomMembershipRevision } from '../StateTracking/MembershipRevision';
import {
  RoomStateRevision,
  StateChange,
} from '../StateTracking/StateRevisionIssuer';
import { ConsequenceProvider } from './Consequence';
import { ProtectedRoomsSet } from './ProtectedRoomsSet';

export interface ProtectionConstructor {
  new (
    description: ProtectionDescription,
    consequenceProvider: ConsequenceProvider,
    protectedRoomsSet: ProtectedRoomsSet,
    options: Record<string, unknown>
  ): Protection;
}

export type ProtectionFactoryMethod = (
  description: ProtectionDescription,
  consequenceProvider: ConsequenceProvider,
  protectedRoomsSet: ProtectedRoomsSet,
  settings: Record<string, unknown>
) => ActionResult<Protection>;

/**
 * This is a description of a protection, which is used
 * to create protections in a facory method dynamically.
 */
export interface ProtectionDescription {
  readonly name: string;
  readonly description: string;
  readonly factory: ProtectionFactoryMethod;
  readonly defaultSettings: Record<string, unknown>;
}

/**
 * Represents a protection mechanism of sorts. Protections are intended to be
 * event-based (ie: X messages in a period of time, or posting X events).
 *
 * Protections are guaranteed to be run before redaction handlers.
 */
export interface Protection {
  readonly description: ProtectionDescription;
  readonly requiredEventPermissions: string[];
  readonly requiredPermissions: string[];

  /*
   * Handle a single timeline event from a protected room, to decide if we need to
   * respond to it. This should not be used to detect changes to room state,
   * for that see @see {@link Protection['handleStateChange']}.
   */
  handleTimelineEvent?(
    room: MatrixRoomID,
    event: RoomEvent
  ): Promise<ActionResult<void>>;

  handlePolicyChange?(
    revision: PolicyListRevision,
    changes: PolicyRuleChange[]
  ): Promise<ActionResult<void>>;

  handleMembershipChange?(
    revision: RoomMembershipRevision,
    changes: MembershipChange[]
  ): Promise<ActionResult<void>>;

  /**
   * Handle a change to the room state within a protected room.
   * @param revision A RoomStateRevision with the current revision of all the room's state.
   * @param changes Any changes since the previous revision.
   */
  handleStateChange?(
    revision: RoomStateRevision,
    changes: StateChange[]
  ): Promise<ActionResult<void>>;
}

export class AbstractProtection
  implements Omit<Protection, 'handleEvent' | 'handlePolicyChange'>
{
  protected constructor(
    public readonly description: ProtectionDescription,
    protected readonly consequenceProvider: ConsequenceProvider,
    protected readonly protectedRoomsSet: ProtectedRoomsSet,
    private readonly clientEventPermissions: string[],
    private readonly clientPermissions: string[]
  ) {
    // nothing to do.
  }

  public get requiredEventPermissions(): string[] {
    return [
      ...this.clientEventPermissions,
      ...this.consequenceProvider.requiredEventPermissions,
    ];
  }

  public get requiredPermissions(): string[] {
    return [
      ...this.clientPermissions,
      ...this.consequenceProvider.requiredPermissions,
    ];
  }
}

const PROTECTIONS = new Map<string, ProtectionDescription>();

export function registerProtection(description: ProtectionDescription): void {
  if (PROTECTIONS.has(description.name)) {
    throw new TypeError(
      `There is already a protection registered with the name ${description.name}`
    );
  }
  PROTECTIONS.set(description.name, description);
}

export function findProtection(
  name: string
): ProtectionDescription | undefined {
  return PROTECTIONS.get(name);
}

export function describeProtection({
  name,
  description,
  factory,
  defaultSettings = {},
}: {
  name: string;
  description: string;
  factory: ProtectionDescription['factory'];
  defaultSettings?: Record<string, unknown>;
}) {
  registerProtection({
    name,
    description,
    factory,
    defaultSettings,
  });
}
