// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import { ProtectionSetting, UnknownSettings } from './ProtectionSetting';

export interface ProtectionSettings<
  TSettings extends UnknownSettings<string> = UnknownSettings<string>
> {
  defaultSettings: TSettings;
  descriptions: Record<keyof TSettings, ProtectionSetting<string, TSettings>>;
  setValue(
    settings: TSettings,
    key: keyof TSettings,
    value: unknown
  ): ActionResult<TSettings>;

  parseSettings(settings: unknown): ActionResult<TSettings>;
  toJSON(settings: TSettings): Record<string, unknown>;
}

export class StandardProtectionSettings<
  TSettings extends UnknownSettings<string> = UnknownSettings<string>
> implements ProtectionSettings<TSettings>
{
  public constructor(
    public readonly descriptions: Record<
      keyof TSettings,
      ProtectionSetting<string, TSettings>
    >,
    public readonly defaultSettings: TSettings
  ) {
    // nothing to do.
  }

  public setValue(
    settings: TSettings,
    key: keyof TSettings,
    value: unknown
  ): ActionResult<TSettings> {
    const protectionSetting = this.descriptions[key];
    if (protectionSetting === undefined) {
      return ActionError.Result(
        `There is no setting available to set with the key ${String(key)}`
      );
    }
    return protectionSetting.setValue(settings, value);
  }

  parseSettings(settings: unknown): ActionResult<TSettings> {
    if (typeof settings !== 'object' || settings === null) {
      return ActionError.Result(`The settings are corrupted.`);
    }
    let parsedSettings = this.defaultSettings;
    for (const setting of Object.values(this.descriptions)) {
      if (setting.key in settings) {
        const result = setting.setValue(
          parsedSettings,
          (settings as TSettings)[setting.key]
        );
        if (isError(result)) {
          return result;
        } else {
          parsedSettings = result.ok;
        }
      }
    }
    return Ok(parsedSettings);
  }

  toJSON(settings: TSettings): Record<string, unknown> {
    return Object.entries(this.descriptions).reduce(
      (acc, [key, setting]) => ({ [key]: setting.toJSON(settings), ...acc }),
      {}
    );
  }
}
