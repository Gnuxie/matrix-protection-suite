// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Ok, Result } from '@gnuxie/typescript-result';
import { CapabilityProviderSet } from '../../Capability/CapabilitySet';
import { ProtectionDescription } from '../../Protection';
import { ProtectionCapabilityProviderSetConfig } from './ProtectionCapabilityProviderSetConfig';

export class StandardProtectionCapabilityProviderSetConfig
  implements ProtectionCapabilityProviderSetConfig
{
  private readonly activeProviders = new Map<string, CapabilityProviderSet>();
  public async storeActivateCapabilityProviderSet(
    protectionDescription: ProtectionDescription,
    capabilityproviderSet: CapabilityProviderSet
  ): Promise<Result<void>> {
    this.activeProviders.set(protectionDescription.name, capabilityproviderSet);
    return Ok(undefined);
  }
  public async getCapabilityProviderSet<
    TProtectionDescription extends
      ProtectionDescription = ProtectionDescription,
  >(
    protectionDescription: TProtectionDescription
  ): Promise<Result<CapabilityProviderSet>> {
    return Ok(
      this.activeProviders.get(protectionDescription.name) ??
        protectionDescription.defaultCapabilities
    );
  }
}
