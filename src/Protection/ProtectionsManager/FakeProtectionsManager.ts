// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Ok } from '@gnuxie/typescript-result';
import { FakeProtectionsConfig } from '../ProtectionsConfig/FakeProtectionsConfig';
import { StandardProtectionCapabilityProviderSetConfig } from '../ProtectionsConfig/ProtectionCapabilityProviderSetConfig/StandardProtectionCapabilityProviderSetConfig';
import { MjolnirProtectionSettingsConfig } from '../ProtectionsConfig/ProtectionSettingsConfig/MjolnirProtectionSettingsConfig';
import { StandardProtectionsManager } from './StandardProtectionsManager';
import { FakePersistentConfigBackend } from '../../Interface/FakePersistentMatrixData';

export class FakeProtectionsManager extends StandardProtectionsManager {
  constructor() {
    super(
      new FakeProtectionsConfig(),
      new StandardProtectionCapabilityProviderSetConfig(function () {
        return Ok(new FakePersistentConfigBackend({}));
      }),
      new MjolnirProtectionSettingsConfig(function () {
        return Ok(new FakePersistentConfigBackend({}));
      })
    );
  }
}
