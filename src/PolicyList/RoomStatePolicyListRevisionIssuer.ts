/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import EventEmitter from 'events';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringEventID } from '../MatrixTypes/StringlyTypedMatrix';
import {
  RoomStateRevision,
  RoomStateRevisionIssuer,
  StateChange,
  StateRevisionListener,
} from '../StateTracking//StateRevisionIssuer';
import { PolicyRoomRevisionIssuer } from './PolicyListRevisionIssuer';
import { PolicyRoomRevision } from './PolicyListRevision';
import { ALL_RULE_TYPES, PolicyRuleEvent } from '../MatrixTypes/PolicyEvents';

/**
 * An implementation of the {@link RoomMembershipRevisionIssuer} that
 * uses the {@link RoomStateRevisionIssuer}.
 */
export class RoomStateMembershipRevisionIssuer
  extends EventEmitter
  implements PolicyRoomRevisionIssuer
{
  private readonly stateRevisionListener: StateRevisionListener<RoomStateRevision>;
  constructor(
    public readonly room: MatrixRoomID,
    public currentRevision: PolicyRoomRevision,
    private readonly roomStateRevisionIssuer: RoomStateRevisionIssuer
  ) {
    super();
    this.stateRevisionListener = this.listener.bind(this);
    this.roomStateRevisionIssuer.on('revision', this.stateRevisionListener);
  }

  updateForEvent(event: { event_id: StringEventID }): void {
    if (this.currentRevision.hasEvent(event.event_id)) {
      return;
    }
    this.roomStateRevisionIssuer.updateForEvent(event);
  }

  private listener(
    _stateRevision: RoomStateRevision,
    stateChanges: StateChange[]
  ) {
    const policyEvents = stateChanges
      .filter((change) => ALL_RULE_TYPES.includes(change.eventType))
      .map((change) => change.state) as PolicyRuleEvent[];
    const policyChanges = this.currentRevision.changesFromState(policyEvents);
    const previousRevision = this.currentRevision;
    this.currentRevision = previousRevision.reviseFromChanges(policyChanges);
    this.emit(
      'revision',
      this.currentRevision,
      policyChanges,
      previousRevision
    );
  }

  public unregisterListeners(): void {
    this.roomStateRevisionIssuer.off('revision', this.stateRevisionListener);
  }
}
