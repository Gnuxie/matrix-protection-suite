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

export type ResultForServerInSetMap = Map<StringRoomID, ActionResult<void>>;

// FIXME:
// should the set even be given as an argument from the set functions?
// shouldn't the capability be able to destructure it from the context?
// weird, because how the hell is a protection supposed to be able to do
// anything without the protected rooms set? idk seems weird
// well they're suppsoed to be able to do queries through another capability
// so we should be true to that.
export interface ServerConsequences extends Capability {
  consequenceForServerInRoom(
    roomID: StringRoomID,
    revision: PolicyListRevision
  ): Promise<ActionResult<void>>;
  consequenceForServerInRoomSet(
    revision: PolicyListRevision
  ): Promise<ActionResult<ResultForServerInSetMap>>;
  unbanServerFromRoomSet(
    serverName: string,
    reason: string
  ): Promise<ActionResult<ResultForServerInSetMap>>;
}
export const ServerConsequences = Type.Composite([
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
