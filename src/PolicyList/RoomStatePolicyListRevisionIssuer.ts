// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import EventEmitter from 'events';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import {
  RoomStateRevision,
  RoomStateRevisionIssuer,
  StateChange,
  StateRevisionListener,
} from '../StateTracking//StateRevisionIssuer';
import { PolicyRoomRevisionIssuer } from './PolicyListRevisionIssuer';
import {
  MJOLNIR_SHORTCODE_EVENT_TYPE,
  MjolnirShortcodeEvent,
  PolicyRoomRevision,
} from './PolicyListRevision';
import { ALL_RULE_TYPES, PolicyRuleEvent } from '../MatrixTypes/PolicyEvents';
import { PowerLevelsEvent } from '../MatrixTypes/PowerLevels';
import { StateEvent } from '../MatrixTypes/Events';
import { Redaction } from '../MatrixTypes/Redaction';

/**
 * An implementation of the {@link RoomMembershipRevisionIssuer} that
 * uses the {@link RoomStateRevisionIssuer}.
 */
export class RoomStatePolicyRoomRevisionIssuer
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
    const stateRevision = roomStateRevisionIssuer.currentRevision;
    const powerLevels = stateRevision.getStateEvent<PowerLevelsEvent>(
      'm.room.power_levels',
      ''
    );
    if (powerLevels !== undefined) {
      this.currentRevision =
        this.currentRevision.reviseFromPowerLevels(powerLevels);
    }
    const shortcodeEvent = stateRevision.getStateEvent<MjolnirShortcodeEvent>(
      MJOLNIR_SHORTCODE_EVENT_TYPE,
      ''
    );
    if (shortcodeEvent !== undefined) {
      this.currentRevision =
        this.currentRevision.reviseFromShortcode(shortcodeEvent);
    }
    this.currentRevision = this.currentRevision.reviseFromState(
      stateRevision.getStateEventsOfTypes(ALL_RULE_TYPES)
    );
    this.stateRevisionListener = this.listener.bind(this);
    this.roomStateRevisionIssuer.on('revision', this.stateRevisionListener);
  }

  updateForStateEvent(event: StateEvent): void {
    if (this.currentRevision.hasEvent(event.event_id)) {
      return;
    }
    this.roomStateRevisionIssuer.updateForEvent(event);
  }

  updateForRedactionEvent(event: Redaction): void {
    this.roomStateRevisionIssuer.updateForRedaction(event);
  }

  private listener(
    _stateRevision: RoomStateRevision,
    stateChanges: StateChange[]
  ) {
    const previousRevision = this.currentRevision;
    const policyEvents = stateChanges
      .filter((change) => ALL_RULE_TYPES.includes(change.eventType))
      .map((change) => change.state) as PolicyRuleEvent[];
    const policyChanges = this.currentRevision.changesFromState(policyEvents);
    const powerLevelsChange = stateChanges.find(
      (change) => change.eventType === 'm.room.power_levels'
    );
    if (policyChanges.length > 0) {
      this.currentRevision = previousRevision.reviseFromChanges(policyChanges);
    }
    if (powerLevelsChange !== undefined) {
      this.currentRevision = this.currentRevision.reviseFromPowerLevels(
        powerLevelsChange.state as unknown as PowerLevelsEvent
      );
    }
    const shortcodeChange = stateChanges.find(
      (change) => change.eventType === MJOLNIR_SHORTCODE_EVENT_TYPE
    );
    if (shortcodeChange !== undefined) {
      this.currentRevision = this.currentRevision.reviseFromShortcode(
        shortcodeChange.state as unknown as MjolnirShortcodeEvent
      );
    }
    if (this.currentRevision.revisionID !== previousRevision.revisionID) {
      this.emit(
        'revision',
        this.currentRevision,
        policyChanges,
        previousRevision
      );
    }
  }

  public unregisterListeners(): void {
    this.roomStateRevisionIssuer.off('revision', this.stateRevisionListener);
  }
}
