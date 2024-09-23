// Copyright 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ResultError } from '@gnuxie/typescript-result';
import { DynamicConfigProperty } from './DynamicConfigProperty';
import { UnknownConfig } from './DynamicConfigDescription';

export type DynamicConfigPropertyValidationErrorOptions = {
  index: number | null;
  cause: ResultError | null;
};

export class DynamicConfigPropertyValidationError extends ResultError {
  public readonly index: number | null;
  public readonly cause: ResultError | null;
  constructor(
    message: string,
    public readonly configProperty: DynamicConfigProperty<
      string,
      UnknownConfig<string>
    >,
    options: DynamicConfigPropertyValidationErrorOptions
  ) {
    super(message);
    this.index = options.index;
    this.cause = options.cause;
  }
}
