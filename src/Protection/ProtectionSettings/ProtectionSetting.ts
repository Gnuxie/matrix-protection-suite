// Copyright (C) 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { ActionResult, Ok } from '../../Interface/Action';

export type UnknownSettings<Key extends string> = Record<string | Key, unknown>;

export interface ProtectionSetting<
  Key extends string,
  TSettings extends UnknownSettings<Key>
> {
  readonly key: Key;
  setValue(settings: TSettings, value: unknown): ActionResult<TSettings>;
  toJSON(settings: TSettings): unknown;
  isCollectionSetting(): this is CollectionProtectionSetting<Key, TSettings>;
}

export class AbstractProtectionSetting<
  Key extends string,
  TSettings extends UnknownSettings<Key> = UnknownSettings<Key>
> {
  protected constructor(public readonly key: keyof TSettings & Key) {
    // nothing to do.
  }
  public setParsedValue(settings: TSettings, value: TSettings[Key]) {
    const clone = structuredClone(settings);
    clone[this.key] = value;
    return Ok(clone);
  }
  public isCollectionSetting() {
    return false;
  }
}

export interface CollectionProtectionSetting<
  Key extends string,
  TSettings extends UnknownSettings<Key> = UnknownSettings<Key>
> extends ProtectionSetting<Key, TSettings> {
  addItem(settings: TSettings, value: unknown): ActionResult<TSettings>;
  removeItem(settings: TSettings, value: unknown): ActionResult<TSettings>;
}
