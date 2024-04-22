// Copyright 2022 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { TDecodeType, Type } from '@sinclair/typebox';
import { ActionError, ActionResult, isError } from '../../Interface/Action';
import { CollectionProtectionSetting } from './ProtectionSetting';
import { Value } from '../../Interface/Value';
import { SetProtectionSetting } from './SetProtectionSetting';

type StringArray = TDecodeType<typeof StringArray>;
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
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `String set was given an unknown value ${value}`
      );
    }
    return super.addItem(settings, value);
  }
  removeItem(settings: TSettings, value: unknown): ActionResult<TSettings> {
    if (typeof value !== 'string') {
      return ActionError.Result(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
