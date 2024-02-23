// Copyright 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { DescriptionMeta } from '../DescriptionMeta';
import {
  CapabilityInterfaceDescription,
  findCapabilityInterface,
} from './CapabilityInterface';

/**
 * We don't want to give protections access to the capability provider
 * description, just in case they do something silly.
 */
export interface CapabilityProviderDescription<Context = unknown> {
  /** Used by the user to identify the description */
  name: string;
  description: string;
  interface: CapabilityInterfaceDescription;
  /**
   * Returns an instance of the provider.
   * @param protectionDescription A description of the protection that we are making the provider for.
   * Mostly so that the capability provider can audit the protection.
   * @param context Anything used to create the capability, usually the ProtectedRoomsSet context,
   * like Draupnir.
   */
  factory(
    protectionDescription: DescriptionMeta,
    context: Context
  ): CapabilityProvider;
}

export interface CapabilityProvider {
  readonly requiredPermissions: string[];
  readonly requiredEventPermissions: string[];
}

const PROVIDER_DESCRIPTIONS = new Map<string, CapabilityProviderDescription>();

export function registerCapabilityProvider(
  description: CapabilityProviderDescription
): void {
  if (PROVIDER_DESCRIPTIONS.has(description.name)) {
    throw new TypeError(
      `There is already a consequence provider named ${description.name}`
    );
  }
  PROVIDER_DESCRIPTIONS.set(description.name, description);
}

export function findCapabilityProvider<Context = unknown>(
  name: string
): CapabilityProviderDescription<Context> | undefined {
  return PROVIDER_DESCRIPTIONS.get(name);
}

export function describeCapabilityProvider<Context = unknown>({
  name,
  description,
  interface: interfaceName,
  factory,
}: {
  name: string;
  description: string;
  interface: string;
  factory(description: DescriptionMeta, context: Context): CapabilityProvider;
}): void {
  const entry = findCapabilityInterface(interfaceName);
  if (entry === undefined) {
    throw new TypeError(
      `Cannot find a CapabilityInterface named ${interfaceName}`
    );
  }
  registerCapabilityProvider({
    name,
    description,
    interface: entry,
    factory,
  });
}
