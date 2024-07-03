// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { DescriptionMeta } from '../DescriptionMeta';
import { findCapabilityContextGlue } from './CapabilityContextGlue';
import { findCapabilityInterface } from './CapabilityInterface';
import {
  Capability,
  CapabilityProviderDescription,
} from './CapabilityProvider';

export interface CapabilityRendererDescription<
  TCapabilityInterface = unknown,
  Context = unknown,
> extends Omit<CapabilityProviderDescription<Context>, 'factory'> {
  factory(
    protectionDescription: DescriptionMeta,
    context: Context,
    provider: TCapabilityInterface
  ): Capability;
}

const RENDERER_DESCRIPTIONS = new Map<string, CapabilityRendererDescription>();

export function registerCapabilityRenderer(
  description: CapabilityRendererDescription
): void {
  if (RENDERER_DESCRIPTIONS.has(description.name)) {
    throw new TypeError(
      `There is already a capability renderer named ${description.name}`
    );
  }
  RENDERER_DESCRIPTIONS.set(description.name, description);
}

export function findCapabilityRenderer<
  TCapabilityInterface = unknown,
  Context = unknown,
>(
  name: string
): CapabilityRendererDescription<TCapabilityInterface, Context> | undefined {
  return RENDERER_DESCRIPTIONS.get(name);
}

export function describeCapabilityRenderer<
  TCapabilityInterface = unknown,
  Context = unknown,
>({
  name,
  description,
  interface: interfaceName,
  factory,
}: {
  name: string;
  description: string;
  interface: string;
  factory: CapabilityRendererDescription<
    TCapabilityInterface,
    Context
  >['factory'];
}): void {
  const entry = findCapabilityInterface(interfaceName);
  if (entry === undefined) {
    throw new TypeError(
      `Cannot find a CapabilityInterface named ${interfaceName}`
    );
  }
  registerCapabilityRenderer({
    name,
    description,
    interface: entry,
    factory,
  });
}

export function wrapCapabilityProviderInRenderer<Context = unknown>(
  protectionDescription: DescriptionMeta,
  context: Context,
  capabilityProviderDescription: CapabilityProviderDescription<Context>
): Capability {
  const rendererDescription = findCapabilityRenderer(
    capabilityProviderDescription.name
  );
  if (rendererDescription === undefined) {
    throw new TypeError(
      `Cannot find a renderer for the capability provider named ${capabilityProviderDescription.name}`
    );
  }
  const glue = findCapabilityContextGlue(capabilityProviderDescription.name);
  const capabilityProvider =
    glue === undefined
      ? capabilityProviderDescription.factory(protectionDescription, context)
      : glue.glueMethod(
          protectionDescription,
          context,
          capabilityProviderDescription
        );
  return rendererDescription.factory(
    protectionDescription,
    context,
    capabilityProvider
  );
}
