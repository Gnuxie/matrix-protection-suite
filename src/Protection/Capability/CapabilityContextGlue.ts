// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { DescriptionMeta } from '../DescriptionMeta';
import {
  Capability,
  CapabilityProviderDescription,
} from './CapabilityProvider';

const CAPABILITY_CONTEXT_GLUE = new Map<string, CapabilityContextGlue>();

/**
 * This is used to destructure contexts for capability providers that are
 * written for contexts that they don't understand.
 * For example, we provide standard capabilities in this library,
 * which won't be aware of the contexts that they eventually get used in.
 * Therefore, a client has to implement glue to destructure that context
 * for them.
 */
export type CapabilityContextGlue<Context = unknown> = {
  /** The name of the capability provider to provide glue for */
  name: string;
  glueMethod: (
    protectionDescription: DescriptionMeta,
    context: Context,
    capabilityProvider: CapabilityProviderDescription
  ) => Capability;
};

export function findCapabilityContextGlue(
  name: string
): CapabilityContextGlue | undefined {
  return CAPABILITY_CONTEXT_GLUE.get(name);
}

export function registerCapabilityContextGlue(
  glue: CapabilityContextGlue
): void {
  CAPABILITY_CONTEXT_GLUE.set(glue.name, glue);
}

export function describeCapabilityContextGlue(
  glue: CapabilityContextGlue
): void {
  registerCapabilityContextGlue(glue);
}
