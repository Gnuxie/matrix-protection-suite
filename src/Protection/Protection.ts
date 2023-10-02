/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019 The Matrix.org Foundation C.I.C.

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

import { ActionResult } from '../Interface/Action';
import { RoomEvent } from '../MatrixTypes/Events';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import { PolicyRuleChange } from '../PolicyList/PolicyRuleChange';
import { ConsequenceProvider } from './Consequence';

/**
 * Represents a protection mechanism of sorts. Protections are intended to be
 * event-based (ie: X messages in a period of time, or posting X events).
 *
 * Protections are guaranteed to be run before redaction handlers.
 */
export interface Protection {
  readonly name: string;
  readonly description: string;
  readonly requiredEventPermissions: string[];
  readonly requiredPermissions: string[];

  /*
   * Handle a single event from a protected room, to decide if we need to
   * respond to it
   */
  handleEvent(
    room: MatrixRoomID,
    event: RoomEvent
  ): Promise<ActionResult<void>>;

  /**
   * I mean for this to work, we need to setup the aggregation data types.
   */
  handlePolicyChange(
    revision: PolicyListRevision,
    changes: PolicyRuleChange[]
  ): Promise<ActionResult<void>>;
}

export class AbstractProtection
  implements Omit<Protection, 'handleEvent' | 'handlePolicyChange'>
{
  protected constructor(
    public readonly name: string,
    public readonly description: string,
    protected readonly consequenceProvider: ConsequenceProvider,
    private readonly clientEventPermissions: string[],
    private readonly clientPermissions: string[]
  ) {
    // nothing to do.
  }

  public get requiredEventPermissions(): string[] {
    return [
      ...this.clientEventPermissions,
      ...this.consequenceProvider.requiredEventPermissions,
    ];
  }

  public get requiredPermissions(): string[] {
    return [
      ...this.clientPermissions,
      ...this.consequenceProvider.requiredPermissions,
    ];
  }
}
