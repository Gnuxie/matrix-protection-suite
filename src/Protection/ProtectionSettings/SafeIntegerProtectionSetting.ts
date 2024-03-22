// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { ActionError, ActionResult } from '../../Interface/Action';
import {
  AbstractProtectionSetting,
  ProtectionSetting,
  UnknownSettings,
} from './ProtectionSetting';

export class SafeIntegerProtectionSetting<
    Key extends string,
    TSettings extends UnknownSettings<Key> & Record<Key, number>
  >
  extends AbstractProtectionSetting<Key, TSettings>
  implements ProtectionSetting<Key, TSettings>
{
  public constructor(
    key: Key,
    public readonly min?: number,
    public readonly max?: number
  ) {
    super(key);
  }

  public setValue(
    settings: TSettings,
    value: unknown
  ): ActionResult<TSettings> {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
      return ActionError.Result(
        // Not sure how we should serlialize this yet.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `The value ${value} for the setting ${String(
          this.key
        )} is not a safe integer`
      );
    } else if (this.min !== undefined && this.min > value) {
      return ActionError.Result(
        `The value ${value} for the setting ${String(
          this.key
        )} is less than the minimum ${this.min}`
      );
    } else if (this.max !== undefined && this.max < value) {
      return ActionError.Result(
        `The value ${value} for the setting ${String(
          this.key
        )} is greater than the maximum ${this.max}`
      );
    } else {
      return this.setParsedValue(settings, value as TSettings[Key]);
    }
  }

  public toJSON(settings: TSettings): unknown {
    return settings[this.key];
  }
}
