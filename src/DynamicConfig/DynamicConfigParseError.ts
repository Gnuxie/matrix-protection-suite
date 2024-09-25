// Copyright 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Err, ResultError } from '@gnuxie/typescript-result';
import { DynamicConfigPropertyValidationError } from './DynamicConfigPropertyValidationError';
import {
  DynamicConfigDescription,
  UnknownConfig,
} from './DynamicConfigDescription';

export type DynamicConfigParseError =
  | DynamicConfigPropertyErrors
  | DynamicConfigJSONError;

export type DynamicConfigJSONErrorOptions = {
  cause: ResultError | null;
};

export class DynamicConfigJSONError extends ResultError {
  public readonly cause: ResultError | null;
  constructor(
    message: string,
    public readonly json: string,
    options: DynamicConfigJSONErrorOptions
  ) {
    super(message);
    this.cause = options.cause;
  }

  public static Result(message: string, options: DynamicConfigJSONErrorOptions & { json: string }) {
    return Err(new DynamicConfigJSONError(message, options.json, options));
  }
}

export class DynamicConfigPropertyErrors extends ResultError {
  constructor(
    message: string,
    public readonly config: DynamicConfigDescription<UnknownConfig<string>>,
    public readonly proprties: DynamicConfigPropertyValidationError[]
  ) {
    super(message);
  }

  public static Result(
    message: string,
    options: { config: DynamicConfigDescription<UnknownConfig<string>>; properties: DynamicConfigPropertyValidationError[] }
  ) {
    return Err(new DynamicConfigPropertyErrors(message, options.config, options.properties));
  }
}
