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

import { EventEmitter } from 'stream';
import { PolicyRoomRevision } from './PolicyListRevision';
import { PolicyRoomRevisionIssuer } from './PolicyListRevisionIssuer';
import { PolicyListManager } from './PolicyListManger';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { isError } from '../Interface/Action';
import { Logger } from '../Logging/Logger';

const log = new Logger('StandardPolicyRoomRevisionIssuer');

export class StandardPolicyRoomRevisionIssuer
  extends EventEmitter
  implements PolicyRoomRevisionIssuer
{
  private readonly batcher: RevisionBatcher;
  constructor(
    public readonly room: MatrixRoomID,
    public currentRevision: PolicyRoomRevision,
    policyListManager: PolicyListManager
  ) {
    super();
    this.batcher = new RevisionBatcher(this, policyListManager);
  }

  updateForEvent(eventId: string, _eventType: string): void {
    // FIXME: technically, it is possible that we can be informed about a redaction
    // that we already know about, as revisions don't yet keep hold of redactions
    // that make up the current revision.
    if (this.currentRevision.hasEvent(eventId)) {
      return;
    }
    this.batcher.addToBatch(eventId);
  }

  public unregisterListeners(): void {
    // nothing to do.
  }
}

/**
 * Helper class that emits a batch event on a `PolicyList` when it has made a batch
 * out of the Matrix events given to `addToBatch` via `updateForEvent`.
 * The `RevisionBatcher` will then call `list.update()` on the associated `PolicyList` once it has finished batching events.
 */
class RevisionBatcher {
  // Whether we are waiting for more events to form a batch.
  private isWaiting = false;
  // The latest (or most recent) event we have received.
  private latestEventId: string | null = null;
  private readonly waitPeriodMS = 200; // 200ms seems good enough.
  private readonly maxWaitMS = 3000; // 3s is long enough to wait while batching.
  // Events that the batcher has been informed of
  private batchedEvents = new Set<string /* event id */>();

  constructor(
    private readonly policyListRevisionIssuer: StandardPolicyRoomRevisionIssuer,
    private readonly policyListManager: PolicyListManager
  ) {}

  /**
   * Reset the state for the next batch.
   */
  private reset() {
    this.latestEventId = null;
    this.isWaiting = false;
    this.batchedEvents.clear();
  }

  /**
   * Checks if any more events have been added to the current batch since
   * the previous iteration, then keep waiting up to `this.maxWait`, otherwise stop
   * and emit a batch.
   * @param eventId The id of the first event for this batch.
   */
  private async checkBatch(eventId: string): Promise<void> {
    const start = Date.now();
    do {
      await new Promise((resolve) => setTimeout(resolve, this.waitPeriodMS));
    } while (
      Date.now() - start < this.maxWaitMS &&
      this.latestEventId !== eventId
    );
    this.reset();
    // batching finished, update the associated list.
    await this.createBatchedRevision();
  }

  /**
   * Adds an event to the batch.
   * @param eventId The event to inform the batcher about.
   */
  public addToBatch(eventId: string): void {
    if (this.batchedEvents.has(eventId)) {
      return;
    }
    this.latestEventId = eventId;
    this.batchedEvents.add(eventId);
    if (this.isWaiting) {
      return;
    }
    this.isWaiting = true;
    // We 'spawn' off here after performing the checks above
    // rather than before (ie if `addToBatch` was async) because
    // `banListTest` showed that there were 100~ ACL events per protected room
    // as compared to just 5~ by doing this. Not entirely sure why but it probably
    // has to do with queuing up `n event` tasks on the event loop that exaust scheduling
    // (so the latency between them is percieved as much higher by
    // the time they get checked in `this.checkBatch`, thus batching fails).
    this.checkBatch(eventId);
  }

  private async createBatchedRevision(): Promise<void> {
    const roomID = this.policyListRevisionIssuer.room;
    const policyRuleEventsResult =
      await this.policyListManager.getPolicyRuleEvents(roomID);
    if (isError(policyRuleEventsResult)) {
      log.error(
        `Unable to fetch policy rule events for ${roomID.toPermalink()}, this is really bad if this error is persistent`
      );
      return;
    }
    const nextRevision =
      this.policyListRevisionIssuer.currentRevision.reviseFromState(
        policyRuleEventsResult.ok
      );
    const previousRevision = this.policyListRevisionIssuer.currentRevision;
    const changes = previousRevision.changesFromState(
      policyRuleEventsResult.ok
    );
    this.policyListRevisionIssuer.currentRevision = nextRevision;
    this.policyListRevisionIssuer.emit(
      'revision',
      nextRevision,
      changes,
      previousRevision
    );
  }
}
