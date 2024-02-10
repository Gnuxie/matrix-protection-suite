// Copyright 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0

// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir

import { StaticDecode, Type } from '@sinclair/typebox';
import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import { ProtectionDescription, findProtection } from '../Protection';
import {
  ProtectionFailedToStartCB,
  ProtectionsConfig,
} from './ProtectionsConfig';
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
          ),
          protectionName
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
          ),
          protectionName
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
        await protectionFailedToStart(
          startResult.error,
          protectionName,
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
