// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Err, ResultError } from '@gnuxie/typescript-result';

export class ConfigParseError extends ResultError {
  constructor(
    message: string,
    public readonly errors: ConfigPropertyError[]
  ) {
    super(message);
  }

  public static Result(
    message: string,
    options: { errors: ConfigPropertyError[] }
  ) {
    return Err(new ConfigParseError(message, options.errors));
  }
}

// This doesn't have to appear just during parsing, it can appear
// later on while processing the configuration file to display a problem
// with a particular property.
export class ConfigPropertyError extends ResultError {
  constructor(
    message: string,
    public readonly path: string,
    public readonly value: unknown
  ) {
    super(message);
  }

  public static Result(
    message: string,
    options: { path: string; value: unknown }
  ) {
    return Err(new ConfigPropertyError(message, options.path, options.value));
  }
}
