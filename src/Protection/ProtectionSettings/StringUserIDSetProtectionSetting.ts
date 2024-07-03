// Copyright 2022 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

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
  TSettings extends Record<string, unknown> & Record<Key, Set<StringUserID>>,
> extends SetProtectionSetting<Key, TSettings> {
  public constructor(key: Key) {
    super(key);
  }

  public addItem(settings: TSettings, value: unknown): ActionResult<TSettings> {
    if (typeof value !== 'string' || !isStringUserID(value)) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
