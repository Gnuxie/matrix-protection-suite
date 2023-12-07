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

import { ActionResult, Ok } from '../../Interface/Action';

export type UnknownSettings<Key extends string> = Record<string | Key, unknown>;

export interface ProtectionSetting<
  Key extends string,
  TSettings extends UnknownSettings<Key>
> {
  readonly key: Key;
  setValue(settings: TSettings, value: unknown): ActionResult<TSettings>;
  toJSON(settings: TSettings): unknown;
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
}

export interface CollectionProtectionSetting<
  Key extends string,
  TSettings extends UnknownSettings<Key> = UnknownSettings<Key>
> extends ProtectionSetting<Key, TSettings> {
  addItem(settings: TSettings, value: unknown): ActionResult<TSettings>;
  removeItem(settings: TSettings, value: unknown): ActionResult<TSettings>;
}
