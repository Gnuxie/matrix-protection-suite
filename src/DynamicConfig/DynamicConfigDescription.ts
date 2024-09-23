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
import { DynamicConfigProperty } from './DynamicConfigProperty';
import { DynamicConfigParseError } from './DynamicConfigParseError';

export type UnknownConfig<Key extends string> = Record<string | Key, unknown>;

export interface DynamicConfigDescription<
  TConfig extends UnknownConfig<string>,
> {
  defaultValues: TConfig;
  valueDescriptions: DynamicConfigProperty<string, TConfig>[];
  setValue(
    settings: TConfig,
    key: keyof TConfig,
    value: unknown
  ): Result<TConfig>;
  getDescription(
    key: string
  ): DynamicConfigProperty<string, TConfig> | undefined;
  parseConfig(config: unknown): Result<TConfig, DynamicConfigParseError>;
  toJSON(settings: TConfig): Record<string, unknown>;
}
