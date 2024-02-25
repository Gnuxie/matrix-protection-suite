// Copyright 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { ActionResult, isError, Ok } from '../../Interface/Action';
import {
  CapabilityProviderSet,
  initializeCapabilitySet,
} from '../Capability/CapabilitySet';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import { Protection, ProtectionDescription } from '../Protection';
import { UnknownSettings } from '../ProtectionSettings/ProtectionSetting';
import {
  ProtectionFailedToStartCB,
  ProtectionsConfig,
} from './ProtectionsConfig';

export class AbstractProtectionsConfig<Context = unknown>
  implements
    Omit<
      ProtectionsConfig,
      | 'addProtection'
      | 'removeProtection'
      | 'loadProtections'
      | 'getProtectionSettings'
    >
{
  private readonly enabledProtections = new Map<
    /** protection name */ string,
    Protection<ProtectionDescription>
  >();

  protected addProtectionSync(
    protectionDescription: ProtectionDescription,
    capabilityDescriptions: CapabilityProviderSet,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    settings: UnknownSettings<string>
  ): ActionResult<void> {
    const capabilities = initializeCapabilitySet(
      protectionDescription,
      capabilityDescriptions,
      context
    );
    const protectionResult = protectionDescription.factory(
      protectionDescription,
      protectedRoomsSet,
      context,
      capabilities,
      settings ?? protectionDescription.protectionSettings.defaultSettings
    );
    if (isError(protectionResult)) {
      return protectionResult;
    }
    const protection = protectionResult.ok;
    this.enabledProtections.set(protection.description.name, protection);
    return Ok(undefined);
  }

  protected removeProtectionSync(
    protectionDescription: ProtectionDescription
  ): void {
    this.enabledProtections.delete(protectionDescription.name);
  }

  public get allProtections() {
    return [...this.enabledProtections.values()];
  }

  public async getCapabilityProviderSet<
    TProtectionDescription extends ProtectionDescription<Context> = ProtectionDescription<Context>
  >(
    protectionDescription: TProtectionDescription
  ): Promise<ActionResult<CapabilityProviderSet>> {
    // we haven't worked out how config is going to work yet.
    return Ok(protectionDescription.defaultCapabilities);
  }

  public async changeProtectionSettings<
    TSettings extends UnknownSettings<string> = UnknownSettings<string>,
    TProtectionDescription extends ProtectionDescription<
      Context,
      TSettings
    > = ProtectionDescription<Context, TSettings>
  >(
    protectionDescription: TProtectionDescription,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    settings: TSettings
  ): Promise<ActionResult<void>> {
    const capabilityProviderSet = await this.getCapabilityProviderSet(
      protectionDescription as ProtectionDescription
    );
    if (isError(capabilityProviderSet)) {
      return capabilityProviderSet.elaborate(
        `Couldn't find a consequence provider for the protection ${protectionDescription.name}`
      );
    }
    const capabilities = initializeCapabilitySet(
      protectionDescription,
      capabilityProviderSet.ok,
      context
    );
    const newProtection = protectionDescription.factory(
      protectionDescription,
      protectedRoomsSet,
      context,
      capabilities,
      settings
    );
    if (isError(newProtection)) {
      return newProtection.elaborate(
        `Couldn't create the protection from these settings, are they correct?`
      );
    }
    const enabledProtection = this.enabledProtections.get(
      protectionDescription.name
    );
    if (enabledProtection !== undefined) {
      this.removeProtectionSync(protectionDescription as ProtectionDescription);
      this.enabledProtections.set(
        newProtection.ok.description.name,
        newProtection.ok as Protection<ProtectionDescription>
      );
    }
    return Ok(undefined);
  }

  public isEnabledProtection(
    protectionDescription: ProtectionDescription
  ): boolean {
    return this.enabledProtections.has(protectionDescription.name);
  }
}

export type StubProtectionSettingsMap = Map<
  string /*protection name*/,
  UnknownSettings<string>
>;

export class FakeProtectionsConfig<Context = unknown>
  extends AbstractProtectionsConfig<Context>
  implements ProtectionsConfig
{
  public constructor(
    private readonly settings: StubProtectionSettingsMap = new Map()
  ) {
    super();
  }

  private getSetting<
    TSettings extends UnknownSettings<string> = UnknownSettings<string>
  >(
    description: ProtectionDescription<Context, TSettings>
  ): UnknownSettings<string> {
    const setting = this.settings.get(description.name);
    if (setting === undefined) {
      return description.protectionSettings.defaultSettings;
    } else {
      return setting;
    }
  }

  public async addProtection(
    protectionDescription: ProtectionDescription,
    capabilityProviderSet: CapabilityProviderSet,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context
  ): Promise<ActionResult<void>> {
    return super.addProtectionSync(
      protectionDescription,
      capabilityProviderSet,
      protectedRoomsSet,
      context,
      this.getSetting(protectionDescription)
    );
  }
  public async removeProtection(
    protection: ProtectionDescription
  ): Promise<ActionResult<void>> {
    super.removeProtectionSync(protection);
    return Ok(undefined);
  }
  public async loadProtections(
    _protectedRoomsSet: ProtectedRoomsSet,
    _context: unknown,
    _protectionFailedToStart: ProtectionFailedToStartCB
  ): Promise<ActionResult<void>> {
    // do nothing.
    return Ok(undefined);
  }
  public async getProtectionSettings<
    TSettings extends UnknownSettings<string> = UnknownSettings<string>
  >(
    protectionDescription: ProtectionDescription<Context, TSettings>
  ): Promise<ActionResult<TSettings>> {
    return Ok(this.getSetting(protectionDescription) as TSettings);
  }
}
