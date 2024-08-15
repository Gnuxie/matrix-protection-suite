// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 - 2021 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { StringEventID } from '@the-draupnir-project/matrix-basic-types';
import { Logger } from '../Logging/Logger';

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
