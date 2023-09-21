/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from matrix-appservice-bridge
 * https://github.com/matrix-org/matrix-appservice-bridge
 * which included the following license notice:

Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 *
 * However, this file is modified and the modifications in this file
 * are NOT distributed, contributed, committed, or licensed under the Apache License.
 */

export interface ILoggerProvider {
  debug(moduleName: string, message: string, ...parts: unknown[]): void;
  info(moduleName: string, message: string, ...parts: unknown[]): void;
  warn(moduleName: string, message: string, ...parts: unknown[]): void;
  error(moduleName: string, message: string, ...parts: unknown[]): void;
}

class DumbConsoleLogger implements ILoggerProvider {
  debug(...parts: unknown[]): void {
    console.debug(...parts);
  }
  info(...parts: unknown[]): void {
    console.info(...parts);
  }
  warn(...parts: unknown[]): void {
    console.warn(...parts);
  }
  error(...parts: unknown[]): void {
    console.error(...parts);
  }
}

let globalLoggerProvider = new DumbConsoleLogger();

export class Logger implements ILoggerProvider {
  constructor(public readonly moduleName: string) {}

  public debug(message: string, ...parts: unknown[]): void {
    globalLoggerProvider.debug(this.moduleName, message, ...parts);
  }

  public info(message: string, ...parts: unknown[]): void {
    globalLoggerProvider.info(this.moduleName, message, ...parts);
  }

  public warn(message: string, ...parts: unknown[]): void {
    globalLoggerProvider.warn(this.moduleName, message, ...parts);
  }

  public error(message: string, ...parts: unknown[]): void {
    globalLoggerProvider.error(this.moduleName, message, ...parts);
  }
}

export function setGlobalLoggerProvider(provider: ILoggerProvider): void {
  globalLoggerProvider = provider;
}
