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
  public async getCapabilityProviderSet<
    TProtectionDescription extends
      ProtectionDescription = ProtectionDescription,
  >(
    protectionDescription: TProtectionDescription
  ): Promise<Result<CapabilityProviderSet>> {
    return Ok(protectionDescription.defaultCapabilities);
  }
}
