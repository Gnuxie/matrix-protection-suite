// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import {
  Evaluate,
  StaticDecode,
  TArray,
  TObject,
  TProperties,
} from '@sinclair/typebox';
import { ConfigDescription } from './ConfigDescription';
import { EDStatic } from '../Interface/Static';
import { ConfigPropertyError } from './ConfigParseError';
import { Ok, Result } from '@gnuxie/typescript-result';
import { Value as TBValue } from '@sinclair/typebox/value';

export interface ConfigMirror<TSchema extends TObject> {
  readonly description: ConfigDescription<TSchema>;
  setValue(
    config: EDStatic<TSchema>,
    key: keyof EDStatic<TSchema>,
    value: unknown
  ): Result<EDStatic<TSchema>, ConfigPropertyError>;
  addItem(
    config: EDStatic<TSchema>,
    key: keyof EDStatic<TSchema>,
    value: unknown
  ): Result<EDStatic<TSchema>, ConfigPropertyError>;
  // needed for when additionalProperties is true.
  removeProperty<TKey extends string>(
    key: TKey,
    config: Record<TKey, unknown>
  ): Record<TKey, unknown>;
  removeItem<TKey extends string>(
    config: Record<TKey, unknown[]>,
    key: TKey,
    index: number
  ): Record<TKey, unknown[]>;
  filterItems<TKey extends string>(
    config: Record<TKey, unknown[]>,
    key: TKey,
    callbackFn: Parameters<Array<unknown>['filter']>[0]
  ): Record<TKey, unknown[]>;
}

export class StandardConfigMirror<TSchema extends TObject>
  implements ConfigMirror<TSchema>
{
  public constructor(public readonly description: ConfigDescription<TSchema>) {
    // nothing to do.
  }
  setValue(
    config: Evaluate<StaticDecode<TSchema>>,
    key: keyof Evaluate<StaticDecode<TSchema>>,
    value: unknown
  ): Result<Evaluate<StaticDecode<TSchema>>, ConfigPropertyError> {
    const schema = this.description.schema.properties[key as keyof TProperties];
    if (schema === undefined) {
      throw new TypeError(
        `Property ${key.toString()} does not exist in schema`
      );
    }
    const errors = [...TBValue.Errors(schema, value)];
    if (errors[0] !== undefined) {
      return ConfigPropertyError.Result(errors[0].message, {
        path: `/${key.toString()}`,
        value,
        description: this.description as never,
      });
    }
    const newConfig = {
      ...config,
      [key]: TBValue.Decode(schema, value),
    };
    return Ok(newConfig as EDStatic<TSchema>);
  }
  private addUnparsedItem(
    config: Evaluate<StaticDecode<TSchema>>,
    key: keyof Evaluate<StaticDecode<TSchema>>,
    value: unknown
  ): Evaluate<StaticDecode<TSchema>> {
    const schema = this.description.schema.properties[key as keyof TProperties];
    if (schema === undefined) {
      throw new TypeError(
        `Property ${key.toString()} does not exist in schema`
      );
    }
    if (!('items' in schema)) {
      throw new TypeError(`Property ${key.toString()} is not an array`);
    }
    const isSet = 'uniqueItems' in schema && schema.uniqueItems === true;
    if (isSet) {
      const set = new Set(config[key] as unknown[]);
      set.add(TBValue.Decode((schema as TArray).items, value));
      return {
        ...config,
        [key]: [...set],
      };
    } else {
      return {
        ...config,
        [key]: [...(config[key] as unknown[]), TBValue.Decode(schema, value)],
      };
    }
  }
  addItem(
    config: Evaluate<StaticDecode<TSchema>>,
    key: keyof Evaluate<StaticDecode<TSchema>>,
    value: unknown
  ): Result<Evaluate<StaticDecode<TSchema>>, ConfigPropertyError> {
    const schema = this.description.schema.properties[key as keyof TProperties];
    if (schema === undefined) {
      throw new TypeError(
        `Property ${key.toString()} does not exist in schema`
      );
    }
    const currentItems = config[key];
    if (!Array.isArray(currentItems)) {
      throw new TypeError(`Property ${key.toString()} is not an array`);
    }
    const errors = [
      ...TBValue.Errors(schema, [...(config[key] as unknown[]), value]),
    ];
    if (errors[0] !== undefined) {
      return ConfigPropertyError.Result(errors[0].message, {
        path: `/${key.toString()}${errors[0].path}`,
        value,
        description: this.description as never,
      });
    }
    return Ok(this.addUnparsedItem(config, key, value));
  }
  removeProperty<TKey extends string>(
    key: TKey,
    config: Record<TKey, unknown>
  ): Record<string, unknown> {
    return Object.entries(config).reduce<Record<string, unknown>>(
      (acc, [k, v]) => {
        if (k !== key) {
          acc[k as TKey] = v;
        }
        return acc;
      },
      {}
    );
  }
  removeItem<TKey extends string>(
    config: Record<TKey, unknown[]>,
    key: TKey,
    index: number
  ): Record<TKey, unknown[]> {
    return {
      ...config,
      [key]: config[key].filter((_, i) => i !== index),
    };
  }

  filterItems<TKey extends string>(
    config: Record<TKey, unknown[]>,
    key: TKey,
    callbackFn: Parameters<Array<unknown>['filter']>[0]
  ): Record<TKey, unknown[]> {
    return {
      ...config,
      [key]: config[key].filter(callbackFn),
    };
  }
}
