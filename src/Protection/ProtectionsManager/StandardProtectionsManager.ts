// Copyright 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { Ok, Result, isError } from '@gnuxie/typescript-result';
import {
  CapabilityProviderSet,
  initializeCapabilitySet,
} from '../Capability/CapabilitySet';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import { Protection, ProtectionDescription } from '../Protection';
import {
  ProtectionFailedToStartCB,
  ProtectionsManager,
} from './ProtectionsManager';
import { ProtectionSettingsConfig } from '../ProtectionsConfig/ProtectionSettingsConfig/ProtectionSettingsConfig';
import { ProtectionCapabilityProviderSetConfig } from '../ProtectionsConfig/ProtectionCapabilityProviderSetConfig/ProtectionCapabilityProviderSetConfig';
import { ProtectionsConfig } from '../ProtectionsConfig/ProtectionsConfig';
import { Logger } from '../../Logging/Logger';
import { TObject } from '@sinclair/typebox';
import { EDStatic } from '../../Interface/Static';
import { UnknownConfig } from '../../Config/ConfigDescription';

const log = new Logger('StandardProtectionsManager');

// FIXME: Dialemma, if we want to be able to change protection settings
// or dry run protections with dummy capabilities, we need to know whether
// the protection has external resources that will conflict.
// So for example, a webserver or something like that, we need to make sure that
// both protections can run at the same time. This would mean duplicating
// the listeners for a webserver and we need to warn protections about this
// in the documentation.

export class StandardProtectionsManager<Context = unknown>
  implements ProtectionsManager<Context>
{
  private readonly enabledProtections = new Map<
    /** protection name */ string,
    Protection<ProtectionDescription>
  >();
  public constructor(
    private readonly enabledProtectionsConfig: ProtectionsConfig,
    private readonly capabilityProviderSetConfig: ProtectionCapabilityProviderSetConfig,
    private readonly settingsConfig: ProtectionSettingsConfig
  ) {
    // nothing to do mare.
  }

  public get allProtections() {
    return [...this.enabledProtections.values()];
  }

  private async startProtection(
    protectionDescription: ProtectionDescription,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    {
      settings,
      capabilityProviderSet,
    }: {
      settings?: Record<string, unknown> | undefined;
      capabilityProviderSet?: CapabilityProviderSet | undefined;
    }
  ): Promise<Result<Protection<ProtectionDescription>>> {
    if (settings === undefined) {
      const settingsResult = await this.settingsConfig.getProtectionSettings(
        protectionDescription
      );
      if (isError(settingsResult)) {
        return settingsResult;
      }
      settings = settingsResult.ok;
    }
    if (capabilityProviderSet === undefined) {
      const capabilityProviders =
        await this.capabilityProviderSetConfig.getCapabilityProviderSet(
          protectionDescription
        );
      if (isError(capabilityProviders)) {
        return capabilityProviders.elaborate(
          `Couldn't find the capability provider set for ${protectionDescription.name}`
        );
      }
      capabilityProviderSet = capabilityProviders.ok;
    }
    const capabilities = initializeCapabilitySet(
      protectionDescription,
      capabilityProviderSet,
      context
    );
    const protectionResult = protectionDescription.factory(
      protectionDescription,
      protectedRoomsSet,
      context,
      capabilities,
      settings
    );
    if (isError(protectionResult)) {
      return protectionResult;
    }
    const enabledProtection = this.enabledProtections.get(
      protectionDescription.name
    );
    if (enabledProtection !== undefined) {
      this.removeProtectionWithoutStore(protectionDescription);
    }
    this.enabledProtections.set(
      protectionDescription.name,
      protectionResult.ok
    );
    return protectionResult;
  }

  public async addProtection(
    protectionDescription: ProtectionDescription,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context
  ): Promise<Result<void>> {
    const startResult = await this.startProtection(
      protectionDescription,
      protectedRoomsSet,
      context,
      {}
    );
    if (isError(startResult)) {
      return startResult;
    }
    const storeResult = await this.enabledProtectionsConfig.enableProtection(
      protectionDescription
    );
    return storeResult;
  }
  private removeProtectionWithoutStore(
    protectionDescription: ProtectionDescription
  ): void {
    const protection = this.enabledProtections.get(protectionDescription.name);
    this.enabledProtections.delete(protectionDescription.name);
    if (protection !== undefined) {
      try {
        protection.handleProtectionDisable?.();
      } catch (ex) {
        log.error(
          `Caught unhandled exception while disabling ${protectionDescription.name}:`,
          ex
        );
      }
    }
  }
  public async removeProtection(
    protection: ProtectionDescription
  ): Promise<Result<void>> {
    const storeResult = await this.enabledProtectionsConfig.disableProtection(
      protection.name
    );
    if (isError(storeResult)) {
      return storeResult;
    }
    this.removeProtectionWithoutStore(protection);
    return Ok(undefined);
  }
  public async loadProtections(
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    protectionFailedToStart: ProtectionFailedToStartCB
  ): Promise<Result<void>> {
    if (this.allProtections.length > 0) {
      throw new TypeError('This can only be used at startup');
    }
    for (const protectionDescription of this.enabledProtectionsConfig.getKnownEnabledProtections()) {
      const startResult = await this.startProtection(
        protectionDescription,
        protectedRoomsSet,
        context,
        {}
      );
      if (isError(startResult)) {
        await protectionFailedToStart(
          startResult.error,
          protectionDescription.name,
          protectionDescription
        );
        continue;
      }
    }
    return Ok(undefined);
  }
  public async changeProtectionSettings(
    protectionDescription: ProtectionDescription,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    settings: Record<string, unknown>
  ): Promise<Result<void>> {
    const result = await this.startProtection(
      protectionDescription,
      protectedRoomsSet,
      context,
      { settings }
    );
    if (isError(result)) {
      return result;
    }
    return await this.settingsConfig.storeProtectionSettings(
      protectionDescription,
      settings
    );
  }

  public async changeCapabilityProviderSet(
    protectionDescription: ProtectionDescription,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    capabilityProviderSet: CapabilityProviderSet
  ): Promise<Result<void>> {
    const result = await this.startProtection(
      protectionDescription,
      protectedRoomsSet,
      context,
      { capabilityProviderSet }
    );
    if (isError(result)) {
      return result;
    }
    return await this.capabilityProviderSetConfig.storeActivateCapabilityProviderSet(
      protectionDescription,
      capabilityProviderSet
    );
  }
  public async getCapabilityProviderSet(
    protectionDescription: ProtectionDescription
  ): Promise<Result<CapabilityProviderSet>> {
    return await this.capabilityProviderSetConfig.getCapabilityProviderSet(
      protectionDescription
    );
  }
  public async getProtectionSettings<
    TConfigSchema extends TObject = UnknownConfig,
  >(
    protectionDescription: ProtectionDescription
  ): Promise<Result<EDStatic<TConfigSchema>>> {
    return (await this.settingsConfig.getProtectionSettings(
      protectionDescription
    )) as Result<EDStatic<TConfigSchema>>;
  }
  isEnabledProtection(protectionDescription: ProtectionDescription): boolean {
    return this.enabledProtections.has(protectionDescription.name);
  }
  findEnabledProtection<TProtectionDescription extends ProtectionDescription>(
    name: string
  ): Protection<TProtectionDescription> | undefined {
    return this.enabledProtections.get(name) as
      | Protection<TProtectionDescription>
      | undefined;
  }
  withEnabledProtection<TProtectionDescription extends ProtectionDescription>(
    name: string,
    cb: (protection: Protection<TProtectionDescription>) => void
  ): void {
    const protection = this.findEnabledProtection(name);
    if (protection !== undefined) {
      cb(protection as Protection<TProtectionDescription>);
    }
  }
}
