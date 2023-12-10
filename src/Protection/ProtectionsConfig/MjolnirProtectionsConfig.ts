/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019, 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 *
 * However, this file is modified and the modifications in this file
 * are NOT distributed, contributed, committed, or licensed under the Apache License.
 */

import { StaticDecode, Type } from '@sinclair/typebox';
import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import {
  Protection,
  ProtectionDescription,
  findProtection,
} from '../Protection';
import { ProtectionsConfig } from './ProtectionsConfig';
import { Value } from '../../Interface/Value';
import { StateEvent } from '../../MatrixTypes/Events';
import {
  MatrixAccountData,
  MatrixStateData,
} from '../../Interface/PersistentMatrixData';
import {
  BasicConsequenceProvider,
  ConsequenceProvider,
  ConsequenceProviderDescription,
  DEFAULT_CONSEQUENCE_PROVIDER,
  findConsequenceProvider,
} from '../Consequence/Consequence';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import { UnknownSettings } from '../ProtectionSettings/ProtectionSetting';

// FIXME: In the future we will have to find a way of persisting ConsequenceProviders.
// A boring way is by naming them like protections and just matching the provider name to the protection name.

export type MjolnirEnabledProtectionsEvent = StaticDecode<
  typeof MjolnirEnabledProtectionsEvent
>;
export const MjolnirEnabledProtectionsEvent = Type.Object({
  enabled: Type.Array(Type.String()),
});
Value.Compile(MjolnirEnabledProtectionsEvent);

export const MjolnirEnabledProtectionsEventType =
  'org.matrix.mjolnir.enabled_protections';

export const MjolnirProtectionSettingsEventType = 'org.matrix.mjolnir.setting';

export type MjolnirProtectionSettingsEventContent = StaticDecode<
  typeof MjolnirProtectionSettingsEventContent
>;

export const MjolnirProtectionSettingsEventContent = Type.Record(
  Type.String(),
  Type.Unknown()
);

export type MjolnirProtectionSettingsEvent = StaticDecode<
  typeof MjolnirProtectionSettingsEvent
>;

export const MjolnirProtectionSettingsEvent = Type.Composite([
  Type.Omit(StateEvent(MjolnirProtectionSettingsEventContent), ['type']),
  Type.Object({
    type: Type.Literal(MjolnirProtectionSettingsEventType),
  }),
]);

type ProtectionFailedToStartCB = (
  Error: ActionError,
  ProtectionDescription?: ProtectionDescription
) => Promise<void>;

export class MjolnirProtectionsConfig<Context = unknown>
  implements ProtectionsConfig<Context>
{
  private readonly enabledProtections = new Map<
    /** protection name */ string,
    Protection
  >();

  public constructor(
    private readonly enabledProtectionsStore: MatrixAccountData<MjolnirEnabledProtectionsEvent>,
    private readonly protectionSettingsStore: MatrixStateData<MjolnirProtectionSettingsEventContent>
  ) {
    // nothing to do;
  }

  private stopProtectionWithoutPersisting(
    protectionDescription: ProtectionDescription
  ): void {
    this.enabledProtections.delete(protectionDescription.name);
  }

  public async addProtection(
    protectionDescription: ProtectionDescription,
    consequenceProvider: ConsequenceProviderDescription,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context
  ): Promise<ActionResult<void>> {
    const startResult = this.startProtection(
      protectionDescription,
      consequenceProvider.factory(context),
      protectedRoomsSet,
      context
    );
    if (isError(startResult)) {
      return startResult;
    }
    const storeResult = await this.enabledProtectionsStore.storeAccountData({
      enabled: [...this.enabledProtections.keys()],
    });
    return storeResult;
  }
  public async removeProtection(
    protection: ProtectionDescription
  ): Promise<ActionResult<void>> {
    this.stopProtectionWithoutPersisting(protection);
    const storeResult = await this.enabledProtectionsStore.storeAccountData({
      enabled: [...this.enabledProtections.keys()],
    });
    return storeResult;
  }

  public get allProtections() {
    return [...this.enabledProtections.values()];
  }

  private startProtection(
    protectionDescription: ProtectionDescription,
    consequenceProvider: ConsequenceProvider,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context
  ): ActionResult<void> {
    const settings = this.protectionSettingsStore.requestStateContent(
      protectionDescription.name
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

  public async loadProtections(
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    protectionFailedToStart: ProtectionFailedToStartCB
  ): Promise<ActionResult<void>> {
    if (this.enabledProtections.size > 0) {
      throw new TypeError('This can only be used at startup');
    }
    const enabledProtectionsResult =
      await this.enabledProtectionsStore.requestAccountData();
    if (isError(enabledProtectionsResult)) {
      return enabledProtectionsResult;
    }
    for (const protectionName of enabledProtectionsResult.ok?.enabled ?? []) {
      const protectionDescription = findProtection(protectionName);
      if (protectionDescription === undefined) {
        await protectionFailedToStart(
          new ActionError(
            `Couldn't find a protection named ${protectionName} so it cannot be started.`
          )
        );
        continue;
      }
      const consequenceProvider =
        await this.getConsequenceProviderDescriptionForProtection(
          protectionDescription
        );
      if (isError(consequenceProvider)) {
        await protectionFailedToStart(
          new ActionError(
            `Couldn't find the consequence provider for ${protectionDescription.name}`
          )
        );
        continue;
      }
      const startResult = this.startProtection(
        protectionDescription,
        consequenceProvider.ok.factory(context),
        protectedRoomsSet,
        context
      );
      if (isError(startResult)) {
        await protectionFailedToStart(startResult.error, protectionDescription);
        continue;
      }
    }
    return Ok(undefined);
  }

  public async getConsequenceProviderDescriptionForProtection<
    TProtectionDescription extends ProtectionDescription<Context> = ProtectionDescription<Context>
  >(
    _protectionDescription: TProtectionDescription
  ): Promise<ActionResult<ConsequenceProviderDescription>> {
    const defaultConsequenceProvider = findConsequenceProvider(
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
    const consequenceProviderDescription =
      await this.getConsequenceProviderDescriptionForProtection(
        protectionDescription as ProtectionDescription
      );
    if (isError(consequenceProviderDescription)) {
      return consequenceProviderDescription.addContext(
        `Couldn't find a consequence provider for the protection ${protectionDescription.name}`
      );
    }
    const newProtection = protectionDescription.factory(
      protectionDescription,
      consequenceProviderDescription.ok.factory(
        context
      ) as BasicConsequenceProvider,
      protectedRoomsSet,
      context,
      settings
    );
    if (isError(newProtection)) {
      return newProtection.addContext(
        `Couldn't create the protection from these settings, are they correct?`
      );
    }
    const enabledProtection = this.enabledProtections.get(
      protectionDescription.name
    );
    if (enabledProtection !== undefined) {
      this.stopProtectionWithoutPersisting(
        protectionDescription as ProtectionDescription
      );
      this.enabledProtections.set(
        newProtection.ok.description.name,
        newProtection.ok
      );
    }
    return await this.protectionSettingsStore.storeStateContent(
      protectionDescription.name,
      protectionDescription.protectionSettings.toJSON(settings)
    );
  }

  public async getProtectionSettings<
    TSettings extends UnknownSettings<string> = UnknownSettings<string>
  >(
    protectionDescription: ProtectionDescription<Context, TSettings>
  ): Promise<ActionResult<TSettings>> {
    const rawSettings = this.protectionSettingsStore.requestStateContent(
      protectionDescription.name
    );
    const parsedSettings =
      protectionDescription.protectionSettings.parseSettings(rawSettings);
    if (isError(parsedSettings)) {
      return parsedSettings.addContext(
        `The protection settings currently stored for the protection named ${protectionDescription.name} are invalid.`
      );
    }
    return Ok(parsedSettings.ok);
  }

  public isEnabledProtection(
    protectionDescription: ProtectionDescription
  ): boolean {
    return this.enabledProtections.has(protectionDescription.name);
  }
}
