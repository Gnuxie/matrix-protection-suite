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
  CapabilityProviderDescription,
  findCapabilityProvider,
} from '../Capability/CapabilityProvider';
import { wrapCapabilityProviderInRenderer } from '../Capability/CapabilityRenderer';
import {
  BasicConsequenceProvider,
  DEFAULT_CONSEQUENCE_PROVIDER,
} from '../Capability/Consequence';
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
    Protection
  >();

  protected addProtectionSync(
    protectionDescription: ProtectionDescription,
    capabilityProviderDescription: CapabilityProviderDescription,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    settings: UnknownSettings<string>
  ): ActionResult<void> {
    const consequenceProvider = wrapCapabilityProviderInRenderer(
      protectionDescription,
      context,
      capabilityProviderDescription
    );
    const protectionResult = protectionDescription.factory(
      protectionDescription,
      consequenceProvider as BasicConsequenceProvider,
      protectedRoomsSet,
      context,
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

  public async getConsequenceProviderDescriptionForProtection<
    TProtectionDescription extends ProtectionDescription<Context> = ProtectionDescription<Context>
  >(
    _protectionDescription: TProtectionDescription
  ): Promise<ActionResult<CapabilityProviderDescription>> {
    const defaultConsequenceProvider = findCapabilityProvider(
      DEFAULT_CONSEQUENCE_PROVIDER
    );
    if (defaultConsequenceProvider === undefined) {
      throw new TypeError(`Cannot find the ${DEFAULT_CONSEQUENCE_PROVIDER}`);
    }
    return Ok(defaultConsequenceProvider);
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
    const capabilityProviderDescription =
      await this.getConsequenceProviderDescriptionForProtection(
        protectionDescription as ProtectionDescription
      );
    if (isError(capabilityProviderDescription)) {
      return capabilityProviderDescription.elaborate(
        `Couldn't find a consequence provider for the protection ${protectionDescription.name}`
      );
    }
    const capabilityProvider = wrapCapabilityProviderInRenderer(
      protectionDescription,
      context,
      capabilityProviderDescription.ok
    );
    const newProtection = protectionDescription.factory(
      protectionDescription,
      capabilityProvider as BasicConsequenceProvider,
      protectedRoomsSet,
      context,
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
        newProtection.ok
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
    capabilityProviderDescription: CapabilityProviderDescription<unknown>,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context
  ): Promise<ActionResult<void>> {
    return super.addProtectionSync(
      protectionDescription,
      capabilityProviderDescription,
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
