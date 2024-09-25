// Copyright 2022 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { StandardDynamicConfigDescription } from '../../DynamicConfig/StandardDynamicConfigDescription';
import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import { ProtectionSetting, UnknownSettings } from './ProtectionSetting';

export interface ProtectionSettings<
  TSettings extends UnknownSettings<string> = UnknownSettings<string>,
> {
  defaultSettings: TSettings;
  settingDescriptions: ProtectionSetting<string, TSettings>[];
  setValue(
    settings: TSettings,
    key: keyof TSettings,
    value: unknown
  ): ActionResult<TSettings>;
  getDescription(key: string): ProtectionSetting<string, TSettings> | undefined;
  parseSettings(settings: unknown): ActionResult<TSettings>;
  toJSON(settings: TSettings): Record<string, unknown>;
}

export class StandardProtectionSettings<
  TSettings extends UnknownSettings<string> = UnknownSettings<string>,
> extends StandardDynamicConfigDescription implements  ProtectionSettings<TSettings>
{
  public get defaultSettings() {
    return this.defaultValues as TSettings;
  };

  public get settingDescriptions() {
    return this.valueDescriptions as ProtectionSetting<string, TSettings>[];
  }
  parseSettings(settings: unknown): ActionResult<TSettings> {
    return this.parseConfig(settings) as ActionResult<TSettings>;
  }
}
