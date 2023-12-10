/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import { ProtectionSetting, UnknownSettings } from './ProtectionSetting';

export interface ProtectionSettings<
  TSettings extends UnknownSettings<string> = UnknownSettings<string>
> {
  defaultSettings: TSettings;
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
    public readonly settingDescriptions: Record<
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
    const protectionSetting = this.settingDescriptions[key];
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
    for (const setting of Object.values(this.settingDescriptions)) {
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
    return Object.entries(this.settingDescriptions).reduce(
      (acc, [key, setting]) => ({ [key]: setting.toJSON(settings), ...acc }),
      {}
    );
  }
}
