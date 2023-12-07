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
import { CollectionProtectionSetting } from './ProtectionSetting';
import { Value } from '../../Interface/Value';
import { SetProtectionSetting } from './SetProtectionSetting';

type StringArray = DecodeType<typeof StringArray>;
const StringArray = Type.Array(Type.String());

export class StringSetProtectionSetting<
    Key extends string,
    TSettings extends Record<string | Key, unknown> & Record<Key, Set<string>>
  >
  extends SetProtectionSetting<Key, TSettings>
  implements CollectionProtectionSetting<Key, TSettings>
{
  public constructor(key: Key) {
    super(key);
  }
  addItem(settings: TSettings, value: unknown): ActionResult<TSettings> {
    if (typeof value !== 'string') {
      return ActionError.Result(
        `String set was given an unknown value ${value}`
      );
    }
    return super.addItem(settings, value);
  }
  removeItem(settings: TSettings, value: unknown): ActionResult<TSettings> {
    if (typeof value !== 'string') {
      return ActionError.Result(
        `String set was given an unknown value ${value}`
      );
    }
    return super.removeItem(settings, value);
  }
  setValue(settings: TSettings, value: unknown): ActionResult<TSettings> {
    const result = Value.Decode(StringArray, value);
    if (isError(result)) {
      return result;
    } else {
      return super.setValue(settings, result.ok);
    }
  }
}
