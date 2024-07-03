// Copyright 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { ActionResult, Ok, isError } from '../../Interface/Action';
import { ProtectionDescription } from '../Protection';
import {
  ProtectionFailedToStartCB,
  ProtectionsManager,
} from './ProtectionsManager';
import { MatrixStateData } from '../../Interface/PersistentMatrixData';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import { UnknownSettings } from '../ProtectionSettings/ProtectionSetting';
import { AbstractProtectionsManager as AbstractProtectionsManager } from './FakeProtectionsManager';
import { CapabilityProviderSet } from '../Capability/CapabilitySet';
import { MjolnirProtectionSettingsEventContent } from '../ProtectionsConfig/MjolnirEnabledProtectionsEvent';
import { ProtectionsConfig } from '../ProtectionsConfig/ProtectionsConfig';

// FIXME: In the future we will have to find a way of persisting ConsequenceProviders.
// A boring way is by naming them like protections and just matching the provider name to the protection name.

export class StandardProtectionsManager<Context = unknown>
  extends AbstractProtectionsManager<Context>
  implements ProtectionsManager<Context>
{
  public constructor(
    private readonly protectionsConfig: ProtectionsConfig,
    private readonly protectionSettingsStore: MatrixStateData<MjolnirProtectionSettingsEventContent>
  ) {
    super();
  }

  public async addProtection(
    protectionDescription: ProtectionDescription,
    capabilities: CapabilityProviderSet,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context
  ): Promise<ActionResult<void>> {
    const startResult = this.startProtection(
      protectionDescription,
      capabilities,
      protectedRoomsSet,
      context
    );
    if (isError(startResult)) {
      return startResult;
    }
    const storeResult = await this.protectionsConfig.enableProtection(
      protectionDescription,
      capabilities
    );
    return storeResult;
  }

  public async removeProtection(
    protection: ProtectionDescription
  ): Promise<ActionResult<void>> {
    const storeResult = await this.protectionsConfig.disableProtection(
      protection.name
    );
    if (isError(storeResult)) {
      return storeResult;
    }
    super.removeProtectionSync(protection);
    return Ok(undefined);
  }

  private startProtection(
    protectionDescription: ProtectionDescription,
    capabilities: CapabilityProviderSet,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context
  ): ActionResult<void> {
    const settings = this.protectionSettingsStore.requestStateContent(
      protectionDescription.name
    );
    const protectionResult = super.addProtectionSync(
      protectionDescription,
      capabilities,
      protectedRoomsSet,
      context,
      settings ?? protectionDescription.protectionSettings.defaultSettings
    );
    if (isError(protectionResult)) {
      return protectionResult;
    }
    return Ok(undefined);
  }

  public async loadProtections(
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    protectionFailedToStart: ProtectionFailedToStartCB
  ): Promise<ActionResult<void>> {
    if (this.allProtections.length > 0) {
      throw new TypeError('This can only be used at startup');
    }
    for (const {
      protectionDescription,
    } of this.protectionsConfig.getKnownEnabledProtections()) {
      const capabilityProviderSet = await this.getCapabilityProviderSet(
        protectionDescription
      );
      if (isError(capabilityProviderSet)) {
        await protectionFailedToStart(
          capabilityProviderSet.error.elaborate(
            `Couldn't find the capability provider set for ${protectionDescription.name}`
          ),
          protectionDescription.name
        );
        continue;
      }
      const startResult = this.startProtection(
        protectionDescription,
        capabilityProviderSet.ok,
        protectedRoomsSet,
        context
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

  public async changeProtectionSettings<
    TSettings extends UnknownSettings<string> = UnknownSettings<string>,
    TProtectionDescription extends ProtectionDescription<
      Context,
      TSettings
    > = ProtectionDescription<Context, TSettings>,
  >(
    protectionDescription: TProtectionDescription,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    settings: TSettings
  ): Promise<ActionResult<void>> {
    const changeResult = await super.changeProtectionSettings(
      protectionDescription,
      protectedRoomsSet,
      context,
      settings
    );
    if (isError(changeResult)) {
      return changeResult;
    }
    return await this.protectionSettingsStore.storeStateContent(
      protectionDescription.name,
      protectionDescription.protectionSettings.toJSON(settings)
    );
  }

  public async getProtectionSettings<
    TSettings extends UnknownSettings<string> = UnknownSettings<string>,
  >(
    protectionDescription: ProtectionDescription<Context, TSettings>
  ): Promise<ActionResult<TSettings>> {
    const rawSettings = this.protectionSettingsStore.requestStateContent(
      protectionDescription.name
    );
    const parsedSettings =
      protectionDescription.protectionSettings.parseSettings(rawSettings);
    if (isError(parsedSettings)) {
      return parsedSettings.elaborate(
        `The protection settings currently stored for the protection named ${protectionDescription.name} are invalid.`
      );
    }
    return Ok(parsedSettings.ok);
  }
}
