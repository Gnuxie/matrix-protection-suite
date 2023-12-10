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
    this.enabledProtections.delete(protection.name);
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
    const defaultConsequenceProvider = findConsequenceProvider(
      DEFAULT_CONSEQUENCE_PROVIDER
    );
    if (defaultConsequenceProvider === undefined) {
      throw new TypeError(`Cannot find the ${DEFAULT_CONSEQUENCE_PROVIDER}`);
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
      const startResult = this.startProtection(
        protectionDescription,
        defaultConsequenceProvider.factory(context),
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
}
