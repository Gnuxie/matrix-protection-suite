// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { TObject, TProperties, TSchema } from '@sinclair/typebox';
import { EDStatic } from '../Interface/Static';
import { Ok, Result } from '@gnuxie/typescript-result';
import { Value as TBValue } from '@sinclair/typebox/value';
import { ConfigParseError, ConfigPropertyError } from './ConfigParseError';
import { ConfigMirror, StandardConfigMirror } from './ConfigMirror';

type StaticProperties<T extends TSchema, P extends unknown[] = []> = (T & {
  params: P;
})['params'];

export type UnknownProperties<T extends TSchema> = {
  [K in keyof StaticProperties<T>]: unknown;
};

export type ConfigPropertyDescription = {
  path: string;
  name: string;
  description: string | undefined;
  default: unknown;
};

export type ConfigDescription<TConfigSchema extends TObject> = {
  readonly schema: TConfigSchema;
  parseConfig(
    config: unknown
  ): Result<EDStatic<TConfigSchema>, ConfigParseError>;
  parseJSONConfig(config: unknown): Result<UnknownProperties<TConfigSchema>>;
  properties(): ConfigPropertyDescription[];
  getPropertyDescription(key: string): ConfigPropertyDescription;
  toMirror(): ConfigMirror<TConfigSchema>;
  getDefaultConfig(): EDStatic<TConfigSchema>;
};

export class StandardConfigDescription<TConfigSchema extends TObject>
  implements ConfigDescription<TConfigSchema>
{
  constructor(public readonly schema: TConfigSchema) {}

  public parseConfig(
    config: unknown
  ): Result<EDStatic<TConfigSchema>, ConfigParseError> {
    // withDefaults will be fine as long as no one defaults with post-transformed values.
    const withDefaults = TBValue.Default(this.schema, config);
    const errors = [...TBValue.Errors(this.schema, withDefaults)];
    if (errors.length > 0) {
      return ConfigParseError.Result('Unable to parse this config', {
        errors: errors.map(
          (error) =>
            new ConfigPropertyError(error.message, error.path, error.value)
        ),
      });
    } else {
      return Ok(TBValue.Decode(this.schema, withDefaults));
    }
  }

  public parseJSONConfig(
    config: unknown
  ): Result<UnknownProperties<TConfigSchema>> {
    return Ok(config as UnknownProperties<TConfigSchema>);
  }

  public properties(): ConfigPropertyDescription[] {
    return Object.entries(this.schema.properties).map(([name, schema]) => ({
      name,
      path: '/' + name,
      description: schema.description,
      default: schema.default as unknown,
    }));
  }

  public getPropertyDescription(key: string): ConfigPropertyDescription {
    const schema = this.schema.properties[key as keyof TProperties];
    if (schema === undefined) {
      throw new TypeError(`Property ${key} does not exist on this schema`);
    }
    return {
      name: key,
      path: '/' + key,
      description: schema.description,
      default: schema.default as unknown,
    };
  }

  public toMirror(): ConfigMirror<TConfigSchema> {
    return new StandardConfigMirror(this);
  }
  public getDefaultConfig(): EDStatic<TConfigSchema> {
    return TBValue.Default(this.schema, {}) as EDStatic<TConfigSchema>;
  }
}
