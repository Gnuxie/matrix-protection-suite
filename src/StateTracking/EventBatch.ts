/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019-2021 The Matrix.org Foundation C.I.C.

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

import { Logger } from '../Logging/Logger';
import { StringEventID } from '../MatrixTypes/StringlyTypedMatrix';

const log = new Logger('EventBatch');

function logBatchCompleteCallbackError(e: unknown): void {
  log.error('Caught an exception from the callback for an event batch', e);
}

type EventWithID = { event_id: StringEventID };

export interface EventBatch<E extends EventWithID = EventWithID> {
  addEvent({ event_id }: E): void;
  isFinished(): boolean;
  batchCompleteCallback: (events: E[]) => Promise<void>;
}

export class ConstantPeriodEventBatch<E extends EventWithID = EventWithID>
  implements EventBatch<E>
{
  private readonly waitPeriodMS: number;
  private events = new Map<StringEventID, E>();
  private isBatchComplete = false;
  private isWaiting = false;
  constructor(
    public readonly batchCompleteCallback: EventBatch['batchCompleteCallback'],
    { waitPeriodMS = 200 }
  ) {
    this.waitPeriodMS = waitPeriodMS;
  }

  public isFinished(): boolean {
    return this.isBatchComplete;
  }

  public addEvent(event: E): void {
    if (this.isFinished()) {
      throw new TypeError(
        'Something tried adding an event to a completed EventBatch'
      );
    }
    if (this.events.has(event.event_id)) {
      return;
    }
    this.events.set(event.event_id, event);
    if (!this.isWaiting) {
      // spawn off the timer to call the callback.
      this.startCallbackTimer();
    }
  }

  private startCallbackTimer(): void {
    if (this.isWaiting) {
      throw new TypeError('The callback timer is being started more than once');
    }
    this.isWaiting = true;
    setTimeout(this.completeBatch.bind(this), this.waitPeriodMS);
  }

  private completeBatch(): void {
    this.isBatchComplete = true;
    this.batchCompleteCallback([...this.events.values()]).catch(
      logBatchCompleteCallbackError
    );
  }
}
