// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2019 - 2021 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

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
