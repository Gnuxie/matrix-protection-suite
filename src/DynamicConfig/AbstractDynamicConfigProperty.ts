// Copyright (C) 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { Ok } from "@gnuxie/typescript-result";
import { UnknownConfig } from "./DynamicConfigDescription";
import { CollectionConfigProperty } from "./DynamicConfigProperty";

export class AbstractDynamicConfigProperty<
  Key extends string,
  TConfig extends UnknownConfig<Key> = UnknownConfig<Key>,
> {
  protected constructor(public readonly key: keyof TConfig & Key) {
    // nothing to do.
  }
  public setParsedValue(settings: TConfig, value: TConfig[Key]) {
    const clone = structuredClone(settings);
    clone[this.key] = value;
    return Ok(clone);
  }
  public isCollectionProperty(): this is CollectionConfigProperty<
    Key,
    TConfig
  > {
    return false;
  }
}
