// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult } from '../../Interface/Action';
import {
  AbstractProtectionSetting,
  CollectionProtectionSetting,
} from './ProtectionSetting';

export class SetProtectionSetting<
    Key extends string,
    TSettings extends Record<string | Key, unknown> & Record<Key, Set<unknown>>
  >
  extends AbstractProtectionSetting<Key, TSettings>
  implements CollectionProtectionSetting<Key, TSettings>
{
  public constructor(key: Key & keyof TSettings) {
    super(key);
  }
  addItem(settings: TSettings, value: unknown): ActionResult<TSettings> {
    const setting = settings[this.key];
    return this.setValue(settings, [...setting, value]);
  }
  removeItem(settings: TSettings, value: unknown): ActionResult<TSettings> {
    const oldSetting = settings[this.key];
    const newSetting = new Set([...oldSetting]);
    newSetting.delete(value);
    return this.setParsedValue(settings, newSetting as TSettings[Key]);
  }
  setValue(settings: TSettings, value: unknown[]): ActionResult<TSettings> {
    return this.setParsedValue(settings, new Set(value) as TSettings[Key]);
  }

  toJSON(settings: TSettings): unknown {
    return [...settings[this.key]];
  }
  public isCollectionSetting(): this is CollectionProtectionSetting<
    Key,
    TSettings
  > {
    return true;
  }
}
