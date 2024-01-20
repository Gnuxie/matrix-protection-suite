/**
 * Copyright (C) 2023-2024 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import EventEmitter from 'events';
import {
  RoomStateRevision,
  RoomStateRevisionIssuer,
  StateChange,
} from './StateRevisionIssuer';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StateTrackingMeta } from './StateTrackingMeta';

export class StubRoomStateRevisionIssuer
  extends EventEmitter
  implements RoomStateRevisionIssuer
{
  public constructor(
    public currentRevision: RoomStateRevision,
    public readonly room: MatrixRoomID,
    public trackingMeta: StateTrackingMeta
  ) {
    super();
  }

  updateForEvent(): void {
    // nothing to do.
  }

  setTrackingMeta(trackingMeta: StateTrackingMeta): void {
    this.trackingMeta = trackingMeta;
  }
  unregisterListeners(): void {
    // nothing to unregister
  }

  reviseRevision(changes: StateChange[]): void {
    const previousRevision = this.currentRevision;
    this.currentRevision = this.currentRevision.reviseFromChanges(changes);
    this.emit('revision', this.currentRevision, changes, previousRevision);
  }
}
