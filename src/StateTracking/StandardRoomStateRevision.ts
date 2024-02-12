// Copyright (C) 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 - 2021 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { ChangeType, calculateStateChange } from './ChangeType';
import { Revision } from '../PolicyList/Revision';
import { Map as PersistentMap } from 'immutable';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StateEvent } from '../MatrixTypes/Events';
import { RoomStateRevision, StateChange } from './StateRevisionIssuer';
import { Logger } from '../Logging/Logger';

const log = new Logger('StandardRoomStateRevision');

/**
 * A map interning rules by their rule type, and then their state key.
 */
type StateEventMap = PersistentMap<string, PersistentMap<string, StateEvent>>;

/**
 * A map interning rules by their event id.
 */
type StateEventByEventIDMap = PersistentMap<string /* event id */, StateEvent>;

/**
 * A standard implementation of a `PolicyListRevision` using immutable's persistent maps.
 */
export class StandardRoomStateRevision implements RoomStateRevision {
  /**
   * Use {@link StandardRoomStateRevision.blankRevision} to get started.
   * Only use this constructor if you are implementing a variant of PolicyListRevision.
   * @param revisionID A revision ID to represent this revision.
   * @param policyRules A map containing the rules for this revision by state type and then state key.
   * @param policyRuleByEventId A map containing the rules ofr this revision by event id.
   */
  public constructor(
    public readonly room: MatrixRoomID,
    public readonly revisionID: Revision,
    /**
     * A map of state events indexed first by state type and then state keys.
     */
    private readonly stateEvents: StateEventMap,
    /**
     * Allow us to detect whether we have updated the state for this event.
     */
    private readonly stateEventsByEventID: StateEventByEventIDMap
  ) {}

  /**
   * @returns An empty revision.
   */
  public static blankRevision(room: MatrixRoomID): StandardRoomStateRevision {
    return new StandardRoomStateRevision(
      room,
      new Revision(),
      PersistentMap(),
      PersistentMap()
    );
  }

  public isBlankRevision(): boolean {
    return this.stateEventsByEventID.isEmpty();
  }
  public get allState() {
    return [...this.stateEventsByEventID.values()];
  }
  public getStateEvent(type: string, key: string): StateEvent | undefined {
    return this.stateEvents.get(type)?.get(key);
  }
  public getStateEventsOfType(type: string) {
    const typeTable = this.stateEvents.get(type);
    if (typeTable) {
      return [...typeTable.values()];
    } else {
      return [];
    }
  }

  public reviseFromChanges(changes: StateChange[]): StandardRoomStateRevision {
    let nextStateEvents = this.stateEvents;
    let nextStateEventsByEventID = this.stateEventsByEventID;
    const setStateEvent = (change: StateChange): void => {
      const event = change.state;
      nextStateEvents = nextStateEvents.setIn(
        [event.type, event.state_key],
        event
      );
      if (change.previousState !== undefined) {
        nextStateEventsByEventID = nextStateEventsByEventID.delete(
          change.previousState.event_id
        );
      }
      nextStateEventsByEventID = nextStateEventsByEventID.set(
        event.event_id,
        event
      );
    };
    const removeStateEvent = (event: StateEvent): void => {
      nextStateEvents = nextStateEvents.deleteIn([event.type, event.state_key]);
      nextStateEventsByEventID = nextStateEventsByEventID.delete(
        event.event_id
      );
    };
    for (const change of changes) {
      if (
        change.changeType === ChangeType.Added ||
        change.changeType === ChangeType.Modified
      ) {
        setStateEvent(change);
      } else if (change.changeType === ChangeType.Removed) {
        if (change.previousState === undefined) {
          const message = `There should be previous state for an event that has been removed ${change.state.event_id}`;
          log.error(message, change);
          throw new TypeError(message);
        }
        removeStateEvent(change.previousState);
      }
    }
    return new StandardRoomStateRevision(
      this.room,
      new Revision(),
      nextStateEvents,
      nextStateEventsByEventID
    );
  }
  hasEvent(eventId: string): boolean {
    return this.stateEventsByEventID.has(eventId);
  }

  /**
   * Calculate the changes from this revision with a more recent set of state events.
   * Will only show the difference, if the set is the same then no changes will be returned.
   * @param state The state events that reflect a different revision of the list.
   * @returns Any changes between this revision and the new set of state events.
   */
  public changesFromState(state: StateEvent[]): StateChange[] {
    const changes: StateChange[] = [];
    for (const event of state) {
      const existingState = this.getStateEvent(event.type, event.state_key);

      const changeType = calculateStateChange(event, existingState);
      if (changeType !== null) {
        changes.push({
          eventType: event.type,
          changeType,
          state: event,
          ...(existingState ? { previousState: existingState } : {}),
        });
      }
    }
    return changes;
  }

  public reviseFromState(state: StateEvent[]): RoomStateRevision {
    const changes = this.changesFromState(state);
    return this.reviseFromChanges(changes);
  }
}
