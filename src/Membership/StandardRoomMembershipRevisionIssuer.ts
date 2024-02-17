// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import EventEmitter from 'events';
import { RoomMembershipRevisionIssuer } from './MembershipRevisionIssuer';
import { RoomMembershipRevision } from './MembershipRevision';
import { RoomMembershipManager } from './RoomMembershipManager';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringEventID } from '../MatrixTypes/StringlyTypedMatrix';
import { Logger } from '../Logging/Logger';
import { isError } from '../Interface/Action';
import {
  ConstantPeriodEventBatch,
  EventBatch,
} from '../StateTracking/EventBatch';

const log = new Logger('StandardRoomMembershipRevisionIssuer');

export class StandardRoomMembershipRevisionIssuer
  extends EventEmitter
  implements RoomMembershipRevisionIssuer
{
  private currentBatch: ConstantPeriodEventBatch;
  private batchCompleteCallback: EventBatch['batchCompleteCallback'];
  constructor(
    public readonly room: MatrixRoomID,
    public currentRevision: RoomMembershipRevision,
    private readonly roomMembershipManager: RoomMembershipManager
  ) {
    super();
    this.batchCompleteCallback = this.createBatchedRevision.bind(this);
    this.currentBatch = new ConstantPeriodEventBatch(
      this.batchCompleteCallback,
      {}
    );
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
    const currentRoomMembershipResult =
      await this.roomMembershipManager.getRoomMembershipEvents(this.room);
    if (isError(currentRoomMembershipResult)) {
      log.error(
        `Unable to fetch members from the room ${this.room.toPermalink()}.`,
        currentRoomMembershipResult.error
      );
      return;
    }
    const previousRevision = this.currentRevision;
    const changes = this.currentRevision.changesFromMembership(
      currentRoomMembershipResult.ok
    );
    this.currentRevision = this.currentRevision.reviseFromChanges(changes);
    this.emit('revision', this.currentRevision, changes, previousRevision);
  }

  public unregisterListeners(): void {
    // nothing to do.
  }
}
