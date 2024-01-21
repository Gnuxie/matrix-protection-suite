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
import { StateEvent } from '../MatrixTypes/Events';

export class FakeRoomStateRevisionIssuer
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

  // this is a method specifically for the fake side of the implementation.
  // ideally, we'd have some way to define the different side as a mixin.
  // and then only allow access to that side through a mirror for that side.
  reviseRevision(changes: StateChange[]): void {
    const previousRevision = this.currentRevision;
    this.currentRevision = this.currentRevision.reviseFromChanges(changes);
    this.emit('revision', this.currentRevision, changes, previousRevision);
  }

  // this method is also on the Fake side.
  reviseFromState(state: StateEvent[]): void {
    const changes = this.currentRevision.changesFromState(state);
    this.reviseRevision(changes);
  }

  // also on the Fake side.
  appendState(state: StateEvent[]): void {
    // FIXME:
    // so it's at this moment that we find out that TrackedStateEvent is a bit
    // weird. And the arguments to StateChange and reviseFromState etc should
    // accept the tracked version. Ultimatley though I think the tracked
    // state event is an optimizaiton that costs us more than we gain.
    // so we should consider removing it entirely.
    this.reviseFromState([
      ...(this.currentRevision.allState as StateEvent[]),
      ...state,
    ]);
  }
}
