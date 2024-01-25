/**
 * Copyright (C) 2022-2024 Gnuxie <Gnuxie@protonmail.com>
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

import { StateEvent } from '../MatrixTypes/Events';
import { StringEventID } from '../MatrixTypes/StringlyTypedMatrix';

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
  existingState?: { event_id: StringEventID }
): ChangeType | null {
  if (event.unsigned?.redacted_because !== undefined) {
    if (existingState !== undefined) {
      return ChangeType.Removed;
    } else {
      return null; // we weren't tracking anything here, nothing has changed.
    }
  } else if (Object.keys(event.content).length === 0) {
    if (existingState !== undefined) {
      return ChangeType.Removed;
    } else {
      return null; // we weren't tracking anything here, nothing has changed.
    }
  } else if (existingState === undefined) {
    return ChangeType.Added;
  } else if (existingState.event_id === event.event_id) {
    return null; // it's the same event, and it is intact.
  } else {
    return ChangeType.Modified;
  }
}
