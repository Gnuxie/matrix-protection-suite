// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Ok, Result, isError } from "@gnuxie/typescript-result";
import { AbstractDynamicConfigProperty } from "./AbstractDynamicConfigProperty";
import { UnknownConfig } from "./DynamicConfigDescription";
import { CollectionConfigProperty, DynamicConfigProperty } from "./DynamicConfigProperty";
import { DynamicConfigPropertyValidationError } from "./DynamicConfigPropertyValidationError";

export class SetDynamicConfigProperty<
    Key extends string,
    TConfig extends UnknownConfig<string> & Record<Key, Set<unknown>>,
  >
  extends AbstractDynamicConfigProperty<Key, TConfig>
  implements CollectionConfigProperty<Key, TConfig>, DynamicConfigProperty<Key, TConfig>
{
  public constructor(key: Key & keyof TConfig) {
    super(key);
  }
  addItem(settings: TConfig, value: unknown): Result<TConfig> {
    const setting = settings[this.key];
    return this.setValue(settings, [...setting, value]);
  }
  removeItem(settings: TConfig, value: unknown): Result<TConfig> {
    const oldSetting = settings[this.key];
    const newSetting = new Set([...oldSetting]);
    newSetting.delete(value);
    return this.setParsedValue(settings, newSetting as TConfig[Key]);
  }
  setValue(settings: TConfig, value: unknown[]) {
    const result = this.parseValue(value);
    if (isError(result)) {
      return result;
    }
    return this.setParsedValue(settings, new Set(value) as TConfig[Key]);
  }

  parseValue(value: unknown): Result<TConfig[Key], DynamicConfigPropertyValidationError> {
    return Ok(value as TConfig[Key]);
  }

  toJSON(settings: TConfig): unknown {
    return [...settings[this.key]];
  }
  public isCollectionSetting(): this is CollectionConfigProperty<
    Key,
    TConfig
  > {
    return true;
  }
}
