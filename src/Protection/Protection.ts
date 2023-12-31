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
import { EventReport } from '../Reporting/EventReport';
import { MembershipChange } from '../StateTracking/MembershipChange';
import { RoomMembershipRevision } from '../StateTracking/MembershipRevision';
import {
  RoomStateRevision,
  StateChange,
} from '../StateTracking/StateRevisionIssuer';
import {
  BasicConsequenceProvider,
  ConsequenceProvider,
} from './Consequence/Consequence';
import { ProtectedRoomsSet } from './ProtectedRoomsSet';
import {
  ProtectionSetting,
  UnknownSettings,
} from './ProtectionSettings/ProtectionSetting';
import {
  ProtectionSettings,
  StandardProtectionSettings,
} from './ProtectionSettings/ProtectionSettings';

/**
 * The typical constructor for a protection.
 * Doesn't have to be used, @see {@link ProtetctionFactoryMethod}.
 */
export interface ProtectionConstructor<
  Context = unknown,
  TSettings = Record<string, unknown>
> {
  /**
   * @param description The description for the protection being constructed.
   * @param consequenceProvider The consequence provider that should be used for this protection.
   * @param protectedRoomsSet The protected rooms that the constructed protection will reside within
   * and be informed of events within.
   * @param context This is a client specified argument, for example the draupnir project
   * will use the Draupnir instance that the `ProtectedRoomsSet` resides within here.
   * Not necessary and use should be avoided.
   * @param options The settings for this protection as fetched from a persistent store or
   * the description's default settings.
   */
  new (
    description: ProtectionDescription,
    consequenceProvider: BasicConsequenceProvider,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    options: TSettings
  ): Protection;
}
/**
 * @param description The description for the protection being constructed.
 * @param consequenceProvider The consequence provider that should be used for this protection.
 * @param protectedRoomsSet The protected rooms that the constructed protection will reside within
 * and be informed of events within.
 * @param context This is a client specified argument, for example the draupnir project
 * will use the Draupnir instance that the `ProtectedRoomsSet` resides within here.
 * Not necessary and use should be avoided.
 * @param settings The settings for this protection as fetched from a persistent store or
 * the description's default settings.
 */
export type ProtectionFactoryMethod<
  Context = unknown,
  TSettings extends Record<string, unknown> = Record<string, unknown>,
  ConsequenceProviderInterface extends ConsequenceProvider = BasicConsequenceProvider
> = (
  description: ProtectionDescription<Context, TSettings>,
  consequenceProvider: ConsequenceProviderInterface,
  protectedRoomsSet: ProtectedRoomsSet,
  context: Context,
  settings: TSettings
) => ActionResult<Protection>;

/**
 * This is a description of a protection, which is used
 * to create protections in a facory method dynamically.
 */
export interface ProtectionDescription<
  Context = unknown,
  TSettings extends UnknownSettings<string> = UnknownSettings<string>,
  ConsequenceProviderInterface extends ConsequenceProvider = BasicConsequenceProvider
> {
  readonly name: string;
  readonly description: string;
  readonly factory: ProtectionFactoryMethod<
    Context,
    TSettings,
    ConsequenceProviderInterface
  >;
  readonly protectionSettings: ProtectionSettings<TSettings>;
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

  handleEventReport?(report: EventReport): Promise<ActionResult<void>>;
}

export class AbstractProtection implements Protection {
  protected constructor(
    public readonly description: ProtectionDescription,
    protected readonly consequenceProvider: BasicConsequenceProvider,
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

export function registerProtection<
  Context = unknown,
  TSettings extends Record<string, unknown> = Record<string, unknown>,
  ConsequenceProviderInterface extends ConsequenceProvider = BasicConsequenceProvider
>(
  description: ProtectionDescription<
    Context,
    TSettings,
    ConsequenceProviderInterface
  >
): void {
  if (PROTECTIONS.has(description.name)) {
    throw new TypeError(
      `There is already a protection registered with the name ${description.name}`
    );
  }
  PROTECTIONS.set(
    description.name,
    description as ProtectionDescription<
      unknown,
      Record<string, unknown>,
      ConsequenceProvider
    >
  );
}

export function findProtection(
  name: string
): ProtectionDescription | undefined {
  return PROTECTIONS.get(name);
}

export function describeProtection<
  Context = unknown,
  TSettings extends Record<string, unknown> = Record<string, unknown>,
  ConsequenceProviderInterface extends ConsequenceProvider = BasicConsequenceProvider
>({
  name,
  description,
  factory,
  protectionSettings = new StandardProtectionSettings<TSettings>(
    {} as Record<keyof TSettings, ProtectionSetting<string, TSettings>>,
    {} as TSettings
  ),
}: {
  name: string;
  description: string;
  factory: ProtectionDescription<
    Context,
    TSettings,
    ConsequenceProviderInterface
  >['factory'];
  protectionSettings?: ProtectionSettings<TSettings>;
}) {
  registerProtection({
    name,
    description,
    factory,
    protectionSettings,
  });
}

export function getAllProtections(): IterableIterator<ProtectionDescription> {
  return PROTECTIONS.values();
}
