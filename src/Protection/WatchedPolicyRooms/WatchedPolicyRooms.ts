// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { MatrixRoomID } from '@the-draupnir-project/matrix-basic-types';
import {
  PolicyListRevision,
  PolicyRoomRevision,
} from '../../PolicyList/PolicyListRevision';
import { Result } from '@gnuxie/typescript-result';
import { PropagationType } from '../PolicyListConfig/PolicyListConfig';
import { PolicyListRevisionIssuer } from '../../PolicyList/PolicyListRevisionIssuer';

export type WatchedPolicyRoom = {
  readonly room: MatrixRoomID;
  readonly propagation: PropagationType;
  readonly revision: PolicyRoomRevision;
};

export interface WatchedPolicyRooms {
  readonly currentRevision: PolicyListRevision;
  readonly revisionIssuer: PolicyListRevisionIssuer;
  watchPolicyRoomDirectly(room: MatrixRoomID): Promise<Result<void>>;
  unwatchPolicyRoom(room: MatrixRoomID): Promise<Result<void>>;
  unregisterListeners(): void;
  readonly allRooms: WatchedPolicyRoom[];
  findPolicyRoomFromShortcode(shortcode: string): WatchedPolicyRoom | undefined;
  /**
   * Provide an external way to add virtual policy lists for reversing hashed policies.
   * Please remember that when filtering policies from watched lists, you will also have to apply
   * the same filtering to the virtual policy list and filter by the source room id.
   *
   * These virtual policy revision issuers will usually form a circular dependency
   * with the revision issuer associated with the set of all watched policy rooms.
   *
   * hmm ideally we'd be able to abstract away the datastore component entirely
   * of the room one and just add that to stop this being shit bleh.
   * Otherwise we're going to have really weird dependency management
   * when we need to decomission this policy list revision issuer when
   * the draupnir gets disposed.
   *
   * We'll have to just split the part that stores rooms and finds new
   * rooms with the revision issuer that also has the circular dependency
   */
  watchHashReversingPolicyList(issuer: PolicyListRevisionIssuer): void;
  unwatchHashReversingPolicyList(issuer: PolicyListRevisionIssuer): void;
}
