// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { TSchema } from '@sinclair/typebox';

const CAPABILITY_INTERFACES = new Map<string, CapabilityInterfaceDescription>();

export type CapabilityInterfaceDescription = {
  name: string;
  description: string;
  schema: TSchema;
};

export function registerCapabilityInterface(
  description: CapabilityInterfaceDescription
): void {
  if (CAPABILITY_INTERFACES.has(description.name)) {
    throw new TypeError(
      `There is already an interface called ${description.name}`
    );
  }
  CAPABILITY_INTERFACES.set(description.name, description);
}

export function findCapabilityInterface(
  name: string
): CapabilityInterfaceDescription | undefined {
  return CAPABILITY_INTERFACES.get(name);
}

export function describeCapabilityInterface(
  description: CapabilityInterfaceDescription
): CapabilityInterfaceDescription {
  registerCapabilityInterface(description);
  return description;
}
