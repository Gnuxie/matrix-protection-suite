// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { ActionResult } from '../Interface/Action';
import { RoomEvent } from '../MatrixTypes/Events';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import { PolicyRuleChange } from '../PolicyList/PolicyRuleChange';
import { EventReport } from '../Reporting/EventReport';
import { MembershipChange } from '../Membership/MembershipChange';
import { RoomMembershipRevision } from '../Membership/MembershipRevision';
import {
  RoomStateRevision,
  StateChange,
} from '../StateTracking/StateRevisionIssuer';
import { ProtectedRoomsSet } from './ProtectedRoomsSet';
import {
  ProtectionSetting,
  UnknownSettings,
} from './ProtectionSettings/ProtectionSetting';
import {
  ProtectionSettings,
  StandardProtectionSettings,
} from './ProtectionSettings/ProtectionSettings';
import {
  CapabilityInterfaceSet,
  CapabilityProviderSet,
  CapabilitySet,
  GenericCapabilityDescription,
  capabilitySetEventPermissions,
  capabilitySetPermissions,
} from './Capability/CapabilitySet';
import { findCapabilityInterfaceSet } from './Capability/CapabilityInterface';
import { findCapabilityProviderSet } from './Capability/CapabilityProvider';

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
  TCapabilitySet extends CapabilitySet = CapabilitySet
> = (
  description: ProtectionDescription<Context, TSettings, TCapabilitySet>,
  protectedRoomsSet: ProtectedRoomsSet,
  context: Context,
  capabilities: TCapabilitySet,
  settings: TSettings
) => ActionResult<
  Protection<ProtectionDescription<Context, TSettings, TCapabilitySet>>
>;

/**
 * This is a description of a protection, which is used
 * to create protections in a facory method dynamically.
 */
export interface ProtectionDescription<
  Context = unknown,
  TSettings extends UnknownSettings<string> = UnknownSettings<string>,
  TCapabilitySet extends CapabilitySet = CapabilitySet
> {
  readonly name: string;
  readonly description: string;
  readonly capabilities: CapabilityInterfaceSet<TCapabilitySet>;
  readonly factory: ProtectionFactoryMethod<Context, TSettings, TCapabilitySet>;
  readonly protectionSettings: ProtectionSettings<TSettings>;
  readonly defaultCapabilities: CapabilityProviderSet<TCapabilitySet>;
}

/**
 * Represents a protection mechanism of sorts. Protections are intended to be
 * event-based (ie: X messages in a period of time, or posting X events).
 *
 * Protections are guaranteed to be run before redaction handlers.
 */
export interface Protection<TProtectionDescription> {
  readonly description: TProtectionDescription;
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

export class AbstractProtection<TProtectionDescription>
  implements Protection<TProtectionDescription>
{
  protected constructor(
    public readonly description: TProtectionDescription,
    protected readonly capabilitySet: CapabilitySet,
    protected readonly protectedRoomsSet: ProtectedRoomsSet,
    private readonly clientEventPermissions: string[],
    private readonly clientPermissions: string[]
  ) {
    // nothing to do.
  }

  public get requiredEventPermissions(): string[] {
    return [
      ...this.clientEventPermissions,
      ...capabilitySetEventPermissions(this.capabilitySet),
    ];
  }

  public get requiredPermissions(): string[] {
    return [
      ...this.clientPermissions,
      ...capabilitySetPermissions(this.capabilitySet),
    ];
  }
}

const PROTECTIONS = new Map<string, ProtectionDescription>();

export function registerProtection<
  Context = unknown,
  TSettings extends UnknownSettings<string> = UnknownSettings<string>,
  TCapabilitySet extends CapabilitySet = CapabilitySet
>(
  description: ProtectionDescription<Context, TSettings, TCapabilitySet>
): ProtectionDescription<Context, TSettings, TCapabilitySet> {
  if (PROTECTIONS.has(description.name)) {
    throw new TypeError(
      `There is already a protection registered with the name ${description.name}`
    );
  }
  PROTECTIONS.set(description.name, description as ProtectionDescription);
  return description;
}

export function findProtection(
  name: string
): ProtectionDescription | undefined {
  return PROTECTIONS.get(name);
}

export function describeProtection<
  TCapabilitySet extends CapabilitySet = CapabilitySet,
  Context = unknown,
  TSettings extends Record<string, unknown> = Record<string, unknown>
>({
  name,
  description,
  capabilityInterfaces,
  defaultCapabilities,
  factory,
  protectionSettings = new StandardProtectionSettings<TSettings>(
    {} as Record<keyof TSettings, ProtectionSetting<string, TSettings>>,
    {} as TSettings
  ),
}: {
  name: string;
  description: string;
  factory: ProtectionDescription<Context, TSettings, TCapabilitySet>['factory'];
  capabilityInterfaces: GenericCapabilityDescription<TCapabilitySet>;
  defaultCapabilities: GenericCapabilityDescription<TCapabilitySet>;
  protectionSettings?: ProtectionSettings<TSettings>;
}): ProtectionDescription<Context, TSettings, TCapabilitySet> {
  const capabilityInterfaceSet =
    findCapabilityInterfaceSet(capabilityInterfaces);
  const defaultCapabilitySet = findCapabilityProviderSet(defaultCapabilities);
  const protectionDescription = {
    name,
    description,
    capabilities: capabilityInterfaceSet,
    defaultCapabilities: defaultCapabilitySet,
    factory,
    protectionSettings,
  };
  registerProtection(protectionDescription);
  return protectionDescription;
}

export function getAllProtections(): IterableIterator<ProtectionDescription> {
  return PROTECTIONS.values();
}
