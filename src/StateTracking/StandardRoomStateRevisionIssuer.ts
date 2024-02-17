// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import EventEmitter from 'events';
import {
  RoomStateManager,
  RoomStateRevision,
  RoomStateRevisionIssuer,
} from './StateRevisionIssuer';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StandardRoomStateRevision } from './StandardRoomStateRevision';
import { ConstantPeriodEventBatch, EventBatch } from './EventBatch';
import { isError } from '../Interface/Action';
import { Logger } from '../Logging/Logger';
import { RoomEvent, StateEvent } from '../MatrixTypes/Events';
import { Redaction, redactionTargetEvent } from '../MatrixTypes/Redaction';

const log = new Logger('StandardRoomStateRevisionIssuer');

export class StandardRoomStateRevisionIssuer
  extends EventEmitter
  implements RoomStateRevisionIssuer
{
  public currentRevision: RoomStateRevision;
  private currentBatch: ConstantPeriodEventBatch;
  private batchCompleteCallback: EventBatch['batchCompleteCallback'];
  constructor(
    public readonly room: MatrixRoomID,
    private readonly getRoomState: RoomStateManager['getRoomState'],
    initialState: StateEvent[]
  ) {
    super();
    this.currentRevision = StandardRoomStateRevision.blankRevision(
      this.room
    ).reviseFromState(initialState);
    this.batchCompleteCallback = this.createBatchedRevision.bind(this);
    this.currentBatch = new ConstantPeriodEventBatch(
      this.batchCompleteCallback,
      {}
    );
  }

  private addEventToBatch(event: RoomEvent): void {
    if (this.currentBatch.isFinished()) {
      this.currentBatch = new ConstantPeriodEventBatch(
        this.batchCompleteCallback,
        {}
      );
    }
    this.currentBatch.addEvent(event);
  }
  updateForEvent(event: RoomEvent): void {
    if (this.currentRevision.hasEvent(event.event_id)) {
      return;
    }
    this.addEventToBatch(event);
  }

  updateForRedaction(event: Redaction): void {
    const targetEvent = redactionTargetEvent(event);
    if (targetEvent === undefined) {
      log.warn(
        `Someone has been redacting redaction events, interesting`,
        targetEvent
      );
      return;
    }
    if (!this.currentRevision.hasEvent(targetEvent)) {
      return;
    }
    this.addEventToBatch(event);
  }

  private async createBatchedRevision(): Promise<void> {
    const currentRoomStateResult = await this.getRoomState(this.room);
    if (isError(currentRoomStateResult)) {
      log.error(
        `Unable to fetch state from the room ${this.room.toPermalink()}.`,
        currentRoomStateResult.error
      );
      return;
    }
    const previousRevision = this.currentRevision;
    const changes = this.currentRevision.changesFromState(
      currentRoomStateResult.ok
    );
    this.currentRevision = this.currentRevision.reviseFromChanges(changes);
    this.emit('revision', this.currentRevision, changes, previousRevision);
  }
  unregisterListeners(): void {
    // nothing to do.
  }
}
