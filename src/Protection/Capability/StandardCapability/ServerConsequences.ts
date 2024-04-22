// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Type } from '@sinclair/typebox';
import { ActionResult } from '../../../Interface/Action';
import { StringRoomID } from '../../../MatrixTypes/StringlyTypedMatrix';
import { PolicyListRevision } from '../../../PolicyList/PolicyListRevision';
import { CapabilityMethodSchema } from './CapabilityMethodSchema';
import { describeCapabilityInterface } from '../CapabilityInterface';
import { Capability } from '../CapabilityProvider';
import { RoomSetResult } from './RoomSetResult';

export type ResultForServerInSetMap = Map<StringRoomID, ActionResult<void>>;

export interface ServerConsequences extends Capability {
  consequenceForServerInRoom(
    roomID: StringRoomID,
    revision: PolicyListRevision
  ): Promise<ActionResult<void>>;
  consequenceForServerInRoomSet(
    revision: PolicyListRevision
  ): Promise<ActionResult<RoomSetResult>>;
  unbanServerFromRoomSet(
    serverName: string,
    reason: string
  ): Promise<ActionResult<RoomSetResult>>;
}
export const ServerConsequences = Type.Intersect([
  Type.Object({
    consequenceForUserInRoom: CapabilityMethodSchema,
    consequenceForUserInRoomSet: CapabilityMethodSchema,
    unbanUserFromRoomSet: CapabilityMethodSchema,
  }),
  Capability,
]);

describeCapabilityInterface({
  name: 'ServerConsequences',
  description: 'Capabilities for taking consequences against a server',
  schema: ServerConsequences,
});
