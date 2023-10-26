/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import EventEmitter from 'events';
import {
  RoomStateManager,
  RoomStateRevision,
  RoomStateRevisionIssuer,
} from './StateRevisionIssuer';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringEventID } from '../MatrixTypes/StringlyTypedMatrix';
import { StateTrackingMeta } from './StateTrackingMeta';
import { StandardRoomStateRevision } from './StandardRoomStateRevision';
import { ConstantPeriodEventBatch, EventBatch } from './EventBatch';
import { isError } from '../Interface/Action';
import { Logger } from '../Logging/Logger';

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
    private readonly roomStateManager: RoomStateManager,
    public trackingMeta: StateTrackingMeta
  ) {
    super();
    this.currentRevision = StandardRoomStateRevision.blankRevision(
      this.room,
      this.trackingMeta
    );
    this.batchCompleteCallback = this.createBatchedRevision.bind(this);
    this.currentBatch = new ConstantPeriodEventBatch(
      this.batchCompleteCallback,
      {}
    );
  }
  public setTrackingMeta(trackingMeta: StateTrackingMeta): void {
    this.trackingMeta = trackingMeta;
    this.currentRevision =
      this.currentRevision.reviseTrackingMeta(trackingMeta);
  }
  updateForEvent(event: { event_id: StringEventID }): void {
    if (this.currentRevision.hasEvent(event.event_id)) {
      return;
    }
    if (this.currentBatch.isFinished()) {
      this.currentBatch = new ConstantPeriodEventBatch(
        this.batchCompleteCallback,
        {}
      );
    }
    this.currentBatch.addEvent(event);
  }

  private async createBatchedRevision(): Promise<void> {
    const currentRoomStateResult = await this.roomStateManager.getRoomState(
      this.room,
      this.trackingMeta
    );
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
