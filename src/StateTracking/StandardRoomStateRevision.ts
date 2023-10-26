/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019-2021 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 *
 * However, this file is modified and the modifications in this file
 * are NOT distributed, contributed, committed, or licensed under the Apache License.
 */

import { ChangeType } from '../PolicyList/PolicyRuleChange';
import { Revision } from '../PolicyList/Revision';
import { Map as PersistentMap } from 'immutable';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StateEvent } from '../MatrixTypes/Events';
import { RoomStateRevision, StateChange } from './StateRevisionIssuer';
import { StateTrackingMeta, TrackedStateEvent } from './StateTrackingMeta';

/**
 * A map interning rules by their rule type, and then their state key.
 */
type StateEventMap = PersistentMap<
  string,
  PersistentMap<string, TrackedStateEvent>
>;

/**
 * A map interning rules by their event id.
 */
type StateEventByEventIDMap = PersistentMap<
  string /* event id */,
  TrackedStateEvent
>;

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
    public readonly trackingMeta: StateTrackingMeta,
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
  public static blankRevision(
    room: MatrixRoomID,
    trackingMeta: StateTrackingMeta
  ): StandardRoomStateRevision {
    return new StandardRoomStateRevision(
      room,
      new Revision(),
      trackingMeta,
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
  public getStateEvent(
    type: string,
    key: string
  ): TrackedStateEvent | undefined {
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
    const setStateEvent = (event: TrackedStateEvent): void => {
      const typeTable = nextStateEvents.get(event.type) ?? PersistentMap();
      nextStateEvents = nextStateEvents.set(
        event.type,
        typeTable.set(event.type, event)
      );
      nextStateEventsByEventID = nextStateEventsByEventID.set(
        event.event_id,
        event
      );
    };
    const removeStateEvent = (event: TrackedStateEvent): void => {
      const typeTable = nextStateEvents.get(event.type);
      if (typeTable === undefined) {
        throw new TypeError(
          `Cannot find a rule for ${event.event_id}, this should be impossible`
        );
      }
      const deletedEvent = typeTable.get(event.state_key);
      nextStateEvents = nextStateEvents.set(
        event.type,
        typeTable.delete(event.state_key)
      );
      if (deletedEvent !== undefined) {
        nextStateEventsByEventID = nextStateEventsByEventID.delete(
          deletedEvent.event_id
        );
      }
    };
    for (const change of changes) {
      if (
        change.changeType === ChangeType.Added ||
        change.changeType === ChangeType.Modified
      ) {
        setStateEvent(change.state);
      } else if (change.changeType === ChangeType.Removed) {
        removeStateEvent(change.state);
      }
    }
    return new StandardRoomStateRevision(
      this.room,
      new Revision(),
      this.trackingMeta,
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

      const changeType: null | ChangeType = (() => {
        if (existingState === undefined) {
          return ChangeType.Added;
        } else if (existingState.event_id === event.event_id) {
          if (event.unsigned?.redacted_because) {
            return ChangeType.Removed;
          } else {
            // Nothing has changed.
            return null;
          }
        } else {
          // Then the policy has been modified in some other way, possibly 'soft' redacted by a new event with empty content...
          if (
            event.content !== undefined ||
            event.content === null ||
            (typeof event.content === 'object' &&
              Object.keys(event.content).length === 0)
          ) {
            return ChangeType.Removed;
          } else {
            return ChangeType.Modified;
          }
        }
      })();
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
  public reviseTrackingMeta(
    trackingMeta: StateTrackingMeta
  ): RoomStateRevision {
    return new StandardRoomStateRevision(
      this.room,
      this.revisionID,
      trackingMeta,
      this.stateEvents,
      this.stateEventsByEventID
    );
  }
}
