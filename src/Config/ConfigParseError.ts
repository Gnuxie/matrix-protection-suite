// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Err, ResultError } from '@gnuxie/typescript-result';
import { ConfigRecoveryOption } from './PersistentConfigData';

export class ConfigRecoverableError extends ResultError {
  public readonly recoveryOptions: ConfigRecoveryOption[] = [];

  addRecoveryOptions(options: ConfigRecoveryOption[]): this {
    this.recoveryOptions.push(...options);
    return this;
  }
}

// others that could be missing: Missing porperties, completely different schema?
// We call them problematic because we can get errors once they are used too rather
// than just during parsing.
export enum ConfigErrorDiagnosis {
  ProblematicValue = 'ProblematicValue',
  ProblematicArrayItem = 'ProblematicArrayItem',
}

export class ConfigParseError extends ConfigRecoverableError {
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
export class ConfigPropertyError extends ConfigRecoverableError {
  public readonly diagnosis: ConfigErrorDiagnosis;
  constructor(
    message: string,
    public readonly path: string,
    public readonly value: unknown
  ) {
    super(message);
    if (/\d+$/.test(path)) {
      this.diagnosis = ConfigErrorDiagnosis.ProblematicArrayItem;
    } else {
      this.diagnosis = ConfigErrorDiagnosis.ProblematicValue;
    }
  }

  public static Result(
    message: string,
    options: { path: string; value: unknown }
  ) {
    return Err(new ConfigPropertyError(message, options.path, options.value));
  }

  public toReadableString(): string {
    return `Property at ${this.path} has the following diagnosis: ${this.diagnosis}, problem: ${this.message}, and value: ${String(this.value)}`;
  }

  public itemIndex(): number {
    const match = this.path.match(/\/(\d+)$/)?.[1];
    if (match === undefined) {
      throw new TypeError('Invalid path was given to ConfigPropertyError');
    }
    return parseInt(match, 10);
  }

  public topLevelProperty(): string {
    const key = this.path.split('/')[1];
    if (key === undefined) {
      throw new TypeError('Invalid path was given to ConfigPropertyError');
    }
    return key;
  }
}

export class ConfigPropertyUseError extends ConfigPropertyError {
  constructor(
    message: string,
    path: string,
    value: unknown,
    public readonly cause: ResultError
  ) {
    super(message, path, value);
  }

  public static Result(
    message: string,
    options: { path: string; value: unknown; cause: ResultError }
  ) {
    return Err(
      new ConfigPropertyUseError(
        message,
        options.path,
        options.value,
        options.cause
      )
    );
  }

  public toReadableString(): string {
    return `${super.toReadableString()}\ncaused by: ${this.cause.toReadableString()}`;
  }
}
