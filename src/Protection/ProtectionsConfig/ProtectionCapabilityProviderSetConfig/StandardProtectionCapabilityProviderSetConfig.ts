// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Ok, Result, isError } from '@gnuxie/typescript-result';
import { CapabilityProviderSet } from '../../Capability/CapabilitySet';
import { ProtectionDescription } from '../../Protection';
import { ProtectionCapabilityProviderSetConfig } from './ProtectionCapabilityProviderSetConfig';
import {
  PersistentConfigBackend,
  StandardPersistentConfigData,
} from '../../../Config/PersistentConfigData';
import { describeConfig } from '../../../Config/describeConfig';
import { Type } from '@sinclair/typebox';
import { findCapabilityProvider } from '../../Capability/CapabilityProvider';
import { EDStatic } from '../../../Interface/Static';
import { Logger } from '../../../Logging/Logger';

const log = new Logger('StandardProtectionCapabilityProviderSetConfig');

const CapabilityProviderConfig = Type.Object({
  capability_provider_name: Type.String(),
});
type CapabilityProviderConfig = EDStatic<typeof CapabilityProviderConfig>;

const CapabilityProviderSetConfigDescription = describeConfig({
  schema: Type.Object({}, { additionalProperties: CapabilityProviderConfig }),
});

export type MakePersistentConfigBackendForStandardCapabilityProviderSetConfig =
  (
    protectionDescription: ProtectionDescription
  ) => Result<PersistentConfigBackend>;

export class StandardProtectionCapabilityProviderSetConfig
  implements ProtectionCapabilityProviderSetConfig
{
  public constructor(
    private readonly makePersistentConfigBackend: MakePersistentConfigBackendForStandardCapabilityProviderSetConfig
  ) {
    // nothing to do mare.
  }
  public async storeActivateCapabilityProviderSet(
    protectionDescription: ProtectionDescription,
    capabilityproviderSet: CapabilityProviderSet
  ): Promise<Result<void>> {
    const persistentConfigBackend = this.makePersistentConfigBackend(
      protectionDescription
    );
    if (isError(persistentConfigBackend)) {
      return persistentConfigBackend;
    }
    const persistentConfigData = new StandardPersistentConfigData(
      CapabilityProviderSetConfigDescription,
      persistentConfigBackend.ok
    );
    let config = {};
    for (const [capabilityName, capabilityProvider] of Object.entries(
      capabilityproviderSet
    )) {
      config = {
        ...config,
        [capabilityName]: { capability_provider_name: capabilityProvider.name },
      };
    }
    return await persistentConfigData.saveConfig(config);
  }
  public async getCapabilityProviderSet<
    TProtectionDescription extends
      ProtectionDescription = ProtectionDescription,
  >(
    protectionDescription: TProtectionDescription
  ): Promise<Result<CapabilityProviderSet>> {
    const persistentConfigData = this.makePersistentConfigBackend(
      protectionDescription
    );
    if (isError(persistentConfigData)) {
      return persistentConfigData;
    }
    const result = await persistentConfigData.ok.requestConfig();
    if (isError(result)) {
      return result;
    }
    if (result.ok === undefined) {
      return Ok(protectionDescription.defaultCapabilities);
    }
    const capabilityProviderSet = {
      ...protectionDescription.defaultCapabilities,
    };
    for (const [capabilityName, capabilityProviderConfig] of Object.entries(
      result.ok as Record<string, CapabilityProviderConfig>
    )) {
      const providerDescription = findCapabilityProvider(
        capabilityProviderConfig.capability_provider_name
      );
      // drats, this should really be a config use error but it's a bitch because
      // we don't eagerly load all the capability configs to create this config,
      // so it is failing late and bad if we use it here.
      if (providerDescription === undefined) {
        log.error(
          `Unable to find a capability provider for ${capabilityProviderConfig.capability_provider_name} in the protection ${protectionDescription.name}, so using the default for the ${capabilityName}`
        );
        continue;
      }
      capabilityProviderSet[capabilityName] = providerDescription;
    }
    return Ok(capabilityProviderSet);
  }
}
