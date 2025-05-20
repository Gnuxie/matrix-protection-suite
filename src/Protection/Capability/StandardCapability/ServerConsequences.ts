// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Type } from '@sinclair/typebox';
import { ActionResult } from '../../../Interface/Action';
import { CapabilityMethodSchema } from './CapabilityMethodSchema';
import { describeCapabilityInterface } from '../CapabilityInterface';
import { Capability } from '../CapabilityProvider';
import { RoomSetResult } from './RoomSetResult';
import { StringRoomID } from '@the-draupnir-project/matrix-basic-types';
import { PolicyListRevisionIssuer } from '../../../PolicyList/PolicyListRevisionIssuer';

export type ResultForServerInSetMap = Map<StringRoomID, ActionResult<void>>;

// How do we gate this then?
// 1. Take a policyListRevisionIssuer as the argument
// 2. Require everything to go through an internal per room queue
// 3. a. There has to be a queue exectuor unfortunatley that takes things off the map
//    It can do so concurrently but f'knows how we make it configurable.
//    b. We probably can actually make it configurable and just expose it as
//       an argument.

/**
 * This started as a generic capability provider to serve as an example
 * for others. But it really isn't generic at all and is quite specific
 * to the serverBanSynchronisation protection and server ACL.
 */
export interface ServerConsequences extends Capability {
  /**
   * Take a consequence against a server in a room.
   * Returns true if the consequence was enacted or false if the consequence was
   * already in effect (like the server already being in the room's deny ACL).
   */
  consequenceForServersInRoom(
    roomID: StringRoomID,
    revisionIssuer: PolicyListRevisionIssuer
  ): Promise<ActionResult<boolean>>;
  consequenceForServersInRoomSet(
    revisionIssuer: PolicyListRevisionIssuer
  ): Promise<ActionResult<RoomSetResult>>;
  unbanServerFromRoomSet(
    serverName: string,
    reason: string
  ): Promise<ActionResult<RoomSetResult>>;
}
export const ServerConsequences = Type.Intersect([
  Type.Object({
    consequenceForServersInRoom: CapabilityMethodSchema,
    consequenceForServersInRoomSet: CapabilityMethodSchema,
    unbanServerFromRoomSet: CapabilityMethodSchema,
  }),
  Capability,
]);

describeCapabilityInterface({
  name: 'ServerConsequences',
  description: 'Capabilities for taking consequences against a server',
  schema: ServerConsequences,
});
