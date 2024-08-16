// Copyright (C) 2023-2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import EventEmitter from 'events';
import {
  RoomStateManager,
  RoomStateRevision,
  RoomStateRevisionIssuer,
  StateChange,
} from './StateRevisionIssuer';
import { StandardRoomStateRevision } from './StandardRoomStateRevision';
import { ConstantPeriodEventBatch, EventBatch } from './EventBatch';
import { isError } from '../Interface/Action';
import { Logger } from '../Logging/Logger';
import { RoomEvent, StateEvent } from '../MatrixTypes/Events';
import { Redaction, redactionTargetEvent } from '../MatrixTypes/Redaction';
import { calculateStateChange } from './StateChangeType';
import { MatrixRoomID } from '@the-draupnir-project/matrix-basic-types';

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
  updateForEvent(event: StateEvent): void {
    if (this.currentRevision.hasEvent(event.event_id)) {
      return;
    }
    const existingState = this.currentRevision.getStateEvent(
      event.type,
      event.state_key
    );
    if (existingState === undefined) {
      this.createRevisionFromChanges([
        {
          changeType: calculateStateChange(event, existingState),
          eventType: event.type,
          state: event,
        },
      ]);
    } else {
      // state already exists for the type+key combo
      // we need to ask the homeserver to determine how state has changed
      this.addEventToBatch(event);
    }
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

  private createRevisionFromChanges(changes: StateChange[]): void {
    const previousRevision = this.currentRevision;
    this.currentRevision = this.currentRevision.reviseFromChanges(changes);
    this.emit('revision', this.currentRevision, changes, previousRevision);
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
    const changes = this.currentRevision.changesFromState(
      currentRoomStateResult.ok
    );
    this.createRevisionFromChanges(changes);
  }
  unregisterListeners(): void {
    // nothing to do.
  }
}
