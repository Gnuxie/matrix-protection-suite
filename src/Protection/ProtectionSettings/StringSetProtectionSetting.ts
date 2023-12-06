/**
 * Copyright (C) 2022 Gnuxie <Gnuxie@protonmail.com>
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

import { DecodeType, Type } from '@sinclair/typebox';
import { ActionError, ActionResult, isError } from '../../Interface/Action';
import {
  AbstractProtectionSetting,
  CollectionProtectionSetting,
} from './ProtectionSetting';
import { Value } from '../../Interface/Value';

type StringArray = DecodeType<typeof StringArray>;
const StringArray = Type.Array(Type.String());

export class StringSetProtectionSetting<
    TSettings extends Record<string, Set<string>>
  >
  extends AbstractProtectionSetting<TSettings>
  implements CollectionProtectionSetting<TSettings>
{
  public constructor(key: string) {
    super(key);
  }
  addItem(settings: TSettings, value: unknown): ActionResult<TSettings> {
    if (typeof value !== 'string') {
      return ActionError.Result(
        `String set was given an unknown value ${value}`
      );
    }
    const setting = settings[this.key];
    return this.setValue(settings, [...setting, value]);
  }
  removeItem(settings: TSettings, value: unknown): ActionResult<TSettings> {
    if (typeof value !== 'string') {
      return ActionError.Result(
        `String set was given an unknown value ${value}`
      );
    }
    const oldSetting = settings[this.key];
    const newSetting = new Set([...oldSetting]);
    newSetting.delete(value);
    return this.setParsedValue(
      settings,
      newSetting as TSettings[keyof TSettings]
    );
  }
  setValue(settings: TSettings, value: unknown): ActionResult<TSettings> {
    const result = Value.Decode(StringArray, value);
    if (isError(result)) {
      return result;
    } else {
      return this.setParsedValue(
        settings,
        new Set(result.ok) as TSettings[keyof TSettings]
      );
    }
  }

  toJSON(settings: TSettings): unknown {
    return [...settings[this.key]];
  }
}
