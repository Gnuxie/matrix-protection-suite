// Copyright 2022 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { Result } from '@gnuxie/typescript-result';
import { UnknownConfig } from './DynamicConfigDescription';
import { DynamicConfigPropertyValidationError } from './DynamicConfigPropertyValidationError';

export interface DynamicConfigProperty<
  Key extends string,
  TConfig extends UnknownConfig<Key>,
> {
  readonly key: Key;
  setValue(settings: TConfig, value: unknown): Result<TConfig, DynamicConfigPropertyValidationError>;
  parseValue(
    value: unknown
  ): Result<TConfig[Key], DynamicConfigPropertyValidationError>;
  toJSON(settings: TConfig): unknown;
  isCollectionProperty(): this is CollectionConfigProperty<Key, TConfig>;
}

export interface CollectionConfigProperty<
  Key extends string,
  TConfig extends UnknownConfig<Key> = UnknownConfig<Key>,
> extends DynamicConfigProperty<Key, TConfig> {
  addItem(settings: TConfig, value: unknown): Result<TConfig>;
  removeItem(settings: TConfig, value: unknown): Result<TConfig>;
}
