// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Type } from '@sinclair/typebox';
import { ActionResult } from '../../../Interface/Action';
import { PolicyListRevision } from '../../../PolicyList/PolicyListRevision';
import { CapabilityMethodSchema } from './CapabilityMethodSchema';
import { describeCapabilityInterface } from '../CapabilityInterface';
import { Capability } from '../CapabilityProvider';
import { RoomSetResult } from './RoomSetResult';
import { StringRoomID } from '@the-draupnir-project/matrix-basic-types';

export type ResultForServerInSetMap = Map<StringRoomID, ActionResult<void>>;

export interface ServerConsequences extends Capability {
  /**
   * Take a consequence against a server in a room.
   * Returns true if the consequence was enacted or false if the consequence was
   * already in effect (like the server already being in the room's deny ACL).
   */
  consequenceForServersInRoom(
    roomID: StringRoomID,
    revision: PolicyListRevision
  ): Promise<ActionResult<boolean>>;
  consequenceForServersInRoomSet(
    revision: PolicyListRevision
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
