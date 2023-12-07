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

import { StaticDecode, Type } from '@sinclair/typebox';
import { ActionError, ActionResult, isError } from '../../Interface/Action';
import {
  StringUserID,
  isStringUserID,
} from '../../MatrixTypes/StringlyTypedMatrix';
import { SetProtectionSetting } from './SetProtectionSetting';
import { Value } from '../../Interface/Value';

type StringUserIDArray = StaticDecode<typeof StringUserIDArray>;
const StringUserIDArray = Type.Array(StringUserID);

export class StringUserIDSetProtectionSettings<
  Key extends string,
  TSettings extends Record<string, unknown> & Record<Key, Set<StringUserID>>
> extends SetProtectionSetting<Key, TSettings> {
  public constructor(key: Key) {
    super(key);
  }

  public addItem(settings: TSettings, value: unknown): ActionResult<TSettings> {
    if (typeof value !== 'string' || !isStringUserID(value)) {
      return ActionError.Result(`${value} is not a valid matrix StringUserID`);
    }
    return super.addItem(settings, value);
  }

  public setValue(
    settings: TSettings,
    value: unknown[]
  ): ActionResult<TSettings> {
    const decodeResult = Value.Decode(StringUserIDArray, value);
    if (isError(decodeResult)) {
      return decodeResult;
    } else {
      return super.setValue(settings, decodeResult.ok);
    }
  }
}
