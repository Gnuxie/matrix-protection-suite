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
import { ProtectionDescription, findProtection } from '../Protection';
import { ProtectionsConfig } from './ProtectionsConfig';
import { Value } from '../../Interface/Value';
import { StateEvent } from '../../MatrixTypes/Events';
import {
  MatrixAccountData,
  MatrixStateData,
} from '../../Interface/PersistentMatrixData';
import { ConsequenceProviderDescription } from '../Consequence/Consequence';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import { UnknownSettings } from '../ProtectionSettings/ProtectionSetting';
import { AbstractProtectionsConfig } from './FakeProtectionsConfig';
import {
  DRAUPNIR_SCHEMA_VERSION_KEY,
  SchemedDataManager,
} from '../../Interface/SchemedMatrixData';

// FIXME: In the future we will have to find a way of persisting ConsequenceProviders.
// A boring way is by naming them like protections and just matching the provider name to the protection name.

export type MjolnirEnabledProtectionsEvent = StaticDecode<
  typeof MjolnirEnabledProtectionsEvent
>;
export const MjolnirEnabledProtectionsEvent = Type.Object({
  enabled: Type.Array(Type.String()),
  [DRAUPNIR_SCHEMA_VERSION_KEY]: Type.Optional(Type.Number()),
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
  extends AbstractProtectionsConfig<Context>
  implements ProtectionsConfig<Context>
{
  public constructor(
    private readonly enabledProtectionsStore: MatrixAccountData<MjolnirEnabledProtectionsEvent>,
    private readonly protectionSettingsStore: MatrixStateData<MjolnirProtectionSettingsEventContent>,
    /**
     * It is necessary for some consumers to provide a way to enable/disable protections
     * based the version of software that is being loaded. For example Draupnir
     * needs to enable the `BanPropagationProtection` for users who are upgrading
     * from older versions & for those migrating from Mjolnir.
     * This should not be used to change the structure of the account data itself,
     * because this is supposed to be directly compatible with Mjolnir account data.
     */
    private readonly enabledProtectionsMigration?: SchemedDataManager<MjolnirEnabledProtectionsEvent>
  ) {
    super();
  }

  public async addProtection(
    protectionDescription: ProtectionDescription,
    consequenceProvider: ConsequenceProviderDescription,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context
  ): Promise<ActionResult<void>> {
    const startResult = this.startProtection(
      protectionDescription,
      consequenceProvider,
      protectedRoomsSet,
      context
    );
    if (isError(startResult)) {
      return startResult;
    }
    const storeResult = await this.storeEnabledProtections();
    return storeResult;
  }
  public async removeProtection(
    protection: ProtectionDescription
  ): Promise<ActionResult<void>> {
    super.removeProtectionSync(protection);
    const storeResult = await this.storeEnabledProtections();
    return storeResult;
  }

  private startProtection(
    protectionDescription: ProtectionDescription,
    consequenceProvider: ConsequenceProviderDescription,
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context
  ): ActionResult<void> {
    const settings = this.protectionSettingsStore.requestStateContent(
      protectionDescription.name
    );
    const protectionResult = super.addProtectionSync(
      protectionDescription,
      consequenceProvider,
      protectedRoomsSet,
      context,
      settings ?? protectionDescription.protectionSettings.defaultSettings
    );
    if (isError(protectionResult)) {
      return protectionResult;
    }
    return Ok(undefined);
  }

  private async requestEnabledProtectionsAndMigrate(): Promise<
    ActionResult<MjolnirEnabledProtectionsEvent>
  > {
    const rawDataResult =
      await this.enabledProtectionsStore.requestAccountData();
    if (isError(rawDataResult)) {
      return rawDataResult;
    }
    if (rawDataResult.ok === undefined) {
      const defaultProtections = {
        enabled: [],
      };
      if (this.enabledProtectionsMigration !== undefined) {
        return this.enabledProtectionsMigration.migrateData(defaultProtections);
      } else {
        return Ok(defaultProtections);
      }
    } else if (this.enabledProtectionsMigration !== undefined) {
      return await this.enabledProtectionsMigration.migrateData(
        rawDataResult.ok
      );
    } else {
      // TypeScript for some reason cannot narrow the union in type parameter based
      // on the narrowing of a porperty that uses that type parameter.
      // Remove the surrounding Ok() and return only rawDataResult to try it.
      return Ok(rawDataResult.ok);
    }
  }

  private async storeEnabledProtections(): Promise<ActionResult<void>> {
    return await this.enabledProtectionsStore.storeAccountData({
      enabled: this.allProtections.map(
        (protection) => protection.description.name
      ),
      ...(this.enabledProtectionsMigration === undefined
        ? {}
        : {
            [this.enabledProtectionsMigration.versionKey]:
              this.enabledProtectionsMigration.latestVersion,
          }),
    });
  }

  public async loadProtections(
    protectedRoomsSet: ProtectedRoomsSet,
    context: Context,
    protectionFailedToStart: ProtectionFailedToStartCB
  ): Promise<ActionResult<void>> {
    if (this.allProtections.length > 0) {
      throw new TypeError('This can only be used at startup');
    }
    const enabledProtectionsResult =
      await this.requestEnabledProtectionsAndMigrate();
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
        consequenceProvider.ok,
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
}
