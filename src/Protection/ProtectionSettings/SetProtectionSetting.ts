/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { ActionResult } from '../../Interface/Action';
import {
  AbstractProtectionSetting,
  CollectionProtectionSetting,
} from './ProtectionSetting';

export class SetProtectionSetting<
    TSettings extends Record<string, Set<unknown>>
  >
  extends AbstractProtectionSetting<TSettings>
  implements CollectionProtectionSetting<TSettings>
{
  public constructor(key: string) {
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
    return this.setParsedValue(
      settings,
      newSetting as TSettings[keyof TSettings]
    );
  }
  setValue(settings: TSettings, value: unknown[]): ActionResult<TSettings> {
    return this.setParsedValue(
      settings,
      new Set(value) as TSettings[keyof TSettings]
    );
  }

  toJSON(settings: TSettings): unknown {
    return [...settings[this.key]];
  }
}