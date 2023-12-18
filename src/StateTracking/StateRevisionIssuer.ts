/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

// TODO
// - We need to be able to inform listenres about changes to state
//   without necessarily caching the entire state.
//   This can be done by keeping just the event id and state key/type combo
//   and comparing as new state comes in.
// - Not sure whether this or downstream components should decide to cache or not
//   probably both as an option, with a runtime option to cache state
//   (for protections) or ignore state of certain types, or simply
//   inform of changes.
// - e.g. SetMembership only needs to be informed of changes because it caches
//   state within RoomMembershipRevisions
//   this probably means that the room members manager needs to be incorperated
//   into the room state manager.
// - so what does that mean for policy list revisions?
//   i think PolicyRule needs the event anyways so it doesn't matter if it caches
//   or informs.
// - IMPORTANT
//   because we are always lagging behind for up to date state deltas ie
//   1. https://github.com/matrix-org/matrix-spec/issues/262
//   2. https://github.com/matrix-org/matrix-spec/issues/1209
//   We have to make a distinction for member joins etc between
//   timeline events and state changes so that we can still give
//   consumers chance to react in an attack.
// FIXME: All MatrixTypes should have their StaticDecode type and not their
//        raw undecoded types.

import { ActionResult } from '../Interface/Action';
import { StateEvent } from '../MatrixTypes/Events';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringEventID } from '../MatrixTypes/StringlyTypedMatrix';
import { ChangeType } from '../PolicyList/PolicyRuleChange';
import { StateTrackingMeta, TrackedStateEvent } from './StateTrackingMeta';

export interface StateRevision {
  readonly allState: TrackedStateEvent[];
  readonly trackingMeta: StateTrackingMeta;
  getStateEvent(type: string, key: string): TrackedStateEvent | undefined;
  getStateEventsOfType(type: string): TrackedStateEvent[];
  hasEvent(eventID: StringEventID): boolean;
  reviseFromChanges(changes: StateChange[]): StateRevision;
  reviseTrackingMeta(trackingMeta: StateTrackingMeta): StateRevision;
}

export interface RoomStateRevision extends StateRevision {
  room: MatrixRoomID;
  changesFromState(state: StateEvent[]): StateChange[];
  reviseFromState(state: StateEvent[]): RoomStateRevision;
  reviseTrackingMeta(trackingMeta: StateTrackingMeta): RoomStateRevision;
  reviseFromChanges(changes: StateChange[]): RoomStateRevision;
}

export interface StateChange<
  EventSchema extends TrackedStateEvent = TrackedStateEvent
> {
  readonly changeType: ChangeType;
  readonly eventType: EventSchema['type'];
  readonly state: EventSchema;
  /**
   * The previous state that has been changed. Only (and always) provided when the change type is `ChangeType.Removed` or `Modified`.
   * This will be a copy of the same event as `event` when a redaction has occurred and this will show its unredacted state.
   */
  readonly previousState?: EventSchema;
}

export type StateRevisionListener<
  Revision extends StateRevision = StateRevision
> = (
  nextRevision: Revision,
  changes: StateChange[],
  previousRevision: Revision
) => void;

export declare interface StateRevisionIssuer {
  readonly currentRevision: StateRevision;
  readonly trackingMeta: StateTrackingMeta;
  setTrackingMeta(trackingMeta: StateTrackingMeta): void;
  on(event: 'revision', listener: StateRevisionListener): this;
  off(...args: Parameters<StateRevisionIssuer['on']>): this;
  emit(event: 'revision', ...args: Parameters<StateRevisionListener>): boolean;
  unregisterListeners(): void;
}

export declare interface RoomStateRevisionIssuer extends StateRevisionIssuer {
  readonly currentRevision: RoomStateRevision;
  readonly room: MatrixRoomID;
  updateForEvent({ event_id }: { event_id: StringEventID }): void;
  on(
    event: 'revision',
    listener: StateRevisionListener<RoomStateRevision>
  ): this;
  off(...args: Parameters<RoomStateRevisionIssuer['on']>): this;
  emit(
    event: 'revision',
    ...args: Parameters<StateRevisionListener<RoomStateRevision>>
  ): boolean;
}

export interface RoomStateManager {
  getRoomStateRevisionIssuer(
    room: MatrixRoomID
  ): Promise<ActionResult<RoomStateRevisionIssuer>>;

  getRoomState(room: MatrixRoomID): Promise<ActionResult<StateEvent[]>>;
}

/**
 *    * Handle a timeline event from a client.
 * Currently there are no reliable ways of informing clients about changes to room state
 * so we have to refresh our cache every time we see a state event in the timeline.
 * 1. https://github.com/matrix-org/matrix-spec/issues/262
 * 2. https://github.com/matrix-org/matrix-spec/issues/1209
 */
