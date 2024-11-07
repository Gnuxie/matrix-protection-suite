// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { TObject } from '@sinclair/typebox';
import { ProtectionDescription } from '../../Protection';
import { ProtectionSettingsConfig } from './ProtectionSettingsConfig';
import { Result, isError } from '@gnuxie/typescript-result';
import { PersistentConfigData } from '../../../Config/PersistentConfigData';
import { UnknownConfig } from '../../../Config/ConfigDescription';

export type MakePersistentConfigBackendForMjolnirProtectionSettings = (
  protectionDescription: ProtectionDescription
) => Result<PersistentConfigData>;

export class MjolnirProtectionSettingsConfig
  implements ProtectionSettingsConfig
{
  public constructor(
    private readonly makePersistentConfigBackend: MakePersistentConfigBackendForMjolnirProtectionSettings
  ) {
    // nothing to do mare.
  }
  public async storeProtectionSettings(
    protectionDescription: ProtectionDescription,
    settings: Record<string, unknown>
  ): Promise<Result<void>> {
    const persistentConfigData = this.makePersistentConfigBackend(
      protectionDescription
    );
    if (isError(persistentConfigData)) {
      return persistentConfigData;
    }
    return await persistentConfigData.ok.saveConfig(settings);
  }
  public async getProtectionSettings<
    TConfigSchema extends TObject = UnknownConfig,
  >(
    protectionDescription: ProtectionDescription
  ): Promise<Result<TConfigSchema>> {
    const persistentConfigData = this.makePersistentConfigBackend(
      protectionDescription
    );
    if (isError(persistentConfigData)) {
      return persistentConfigData;
    }
    return (await persistentConfigData.ok.requestConfig()) as Result<TConfigSchema>;
  }
}
