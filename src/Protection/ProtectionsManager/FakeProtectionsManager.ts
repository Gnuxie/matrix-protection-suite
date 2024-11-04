// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Ok } from '@gnuxie/typescript-result';
import { FakeProtectionsConfig } from '../ProtectionsConfig/FakeProtectionsConfig';
import { StandardProtectionCapabilityProviderSetConfig } from '../ProtectionsConfig/ProtectionCapabilityProviderSetConfig/StandardProtectionCapabilityProviderSetConfig';
import { MjolnirProtectionSettingsConfig } from '../ProtectionsConfig/ProtectionSettingsConfig/MjolnirProtectionSettingsConfig';
import { StandardProtectionsManager } from './StandardProtectionsManager';
import { FakePersistentConfigBackend } from '../../Interface/FakePersistentMatrixData';
import { StandardPersistentConfigData } from '../../Config/PersistentConfigData';
import { describeConfig } from '../../Config/describeConfig';
import { Type } from '@sinclair/typebox';

export class FakeProtectionsManager extends StandardProtectionsManager {
  constructor() {
    super(
      new FakeProtectionsConfig(),
      new StandardProtectionCapabilityProviderSetConfig(),
      new MjolnirProtectionSettingsConfig(function () {
        const backend = new FakePersistentConfigBackend({});
        return Ok(
          new StandardPersistentConfigData(
            describeConfig({
              schema: Type.Object({}, { additionalProperties: true }),
            }),
            backend
          )
        );
      })
    );
  }
}
