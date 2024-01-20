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

import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringEventID } from '../MatrixTypes/StringlyTypedMatrix';
import { PolicyListRevision, PolicyRoomRevision } from './PolicyListRevision';
import { PolicyRuleChange } from './PolicyRuleChange';

export type RevisionListener = (
  nextRevision: PolicyListRevision,
  changes: PolicyRuleChange[],
  previousRevision: PolicyListRevision
) => void;

/**
 * A `PolicyListRevisionIssuer` is a convienant source for up to date revisions
 * for lists.
 * This is really important as issuers can scope what policies from the original
 * list/lists can consume by controlling what they emit.
 * They are a foundation for combining/propagating/aggregating policies from
 * different lists in arbirtrary ways.
 * For direct propagation @see {@link PolicyRoomRevisionIssuer}.
 */
export declare interface PolicyListRevisionIssuer {
  /**
   * The known most recent revision.
   */
  currentRevision: PolicyListRevision;
  /**
   * A listener for when a new revision has been issued.
   */
  on(event: 'revision', listener: RevisionListener): this;
  off(...args: Parameters<PolicyListRevisionIssuer['on']>): this;
  emit(event: 'revision', ...args: Parameters<RevisionListener>): boolean;
  /**
   * This is mostly used when PolicyListRevisionIssuer's have listeners
   * in other `PolicyListRevision` issuer's that need to be unregistered
   * to prevent a memory leak when this listener is uninterned.
   * If you know of a way of allowing the issuer's to be as flexible as they are
   * without this risk, then please tell me.
   */
  unregisterListeners(): void;
}

/**
 * A version of `PolicyListRevisionIssuer` that is exclusive to
 * the direct propagation of revisions from a Matrix room.
 */
export interface PolicyRoomRevisionIssuer extends PolicyListRevisionIssuer {
  currentRevision: PolicyRoomRevision;
  room: MatrixRoomID;
  /**
   * Inform the revision issuer of a new event from Matrix.
   */
  updateForEvent(event: { event_id: StringEventID }): void;
}
