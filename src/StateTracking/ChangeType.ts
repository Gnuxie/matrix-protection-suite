// Copyright 2022 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 - 2021 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { StateEvent } from '../MatrixTypes/Events';

export enum ChangeType {
  /** A new event was added, with no previous room state for this type-key pair. */
  Added = 'ADDED',
  /** There are multiple ways for state to be removed.
   * 1. A redaction was sent for an existing state event that is being tracked.
   * 2. A state event with empty content was sent for a tracked type-key pair.
   */
  Removed = 'REMOVED',
  /**
   * There is an existing state event for this type-key pair that does not share
   * the same event_id.
   */
  Modified = 'MODIFIED',
}

/**
 * Calculate the change in the room state.
 * @param event A new event for a state type-key pair.
 * @param existingState Any known existing state event for the type-key pair.
 * @returns How the state was changed or null if the state is unchanged.
 */
export function calculateStateChange(
  event: StateEvent,
  existingState?: StateEvent
): ChangeType | null {
  if (Object.keys(event.content).length === 0) {
    if (existingState !== undefined) {
      return ChangeType.Removed;
    } else {
      return null; // we weren't tracking anything here, nothing has changed.
    }
  } else if (existingState === undefined) {
    return ChangeType.Added;
  } else if (existingState.event_id === event.event_id) {
    if (
      Object.keys(event.content).length !==
      Object.keys(existingState.content).length
    ) {
      return ChangeType.Modified; // could have been a protected redaction e.g. m.room.member
    } else {
      return null; // it's the same event, and it is intact.
    }
  } else {
    return ChangeType.Modified;
  }
}
