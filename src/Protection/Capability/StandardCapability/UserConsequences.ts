// Copyright 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { Type } from '@sinclair/typebox';
import { describeCapabilityInterface } from '../CapabilityInterface';
import { CapabilityMethodSchema } from './CapabilityMethodSchema';
import {
  StringRoomID,
  StringUserID,
} from '../../../MatrixTypes/StringlyTypedMatrix';
import { ActionResult } from '../../../Interface/Action';
import { PolicyListRevision } from '../../../PolicyList/PolicyListRevision';
import { Capability } from '../CapabilityProvider';
import { RoomSetResult } from './RoomSetResult';

export type ResultForUserInSetMap = Map<StringUserID, RoomSetResult>;

export interface UserConsequences extends Capability {
  consequenceForUserInRoom(
    roomID: StringRoomID,
    user: StringUserID,
    reason: string
  ): Promise<ActionResult<void>>;
  consequenceForUserInRoomSet(
    revision: PolicyListRevision
  ): Promise<ActionResult<ResultForUserInSetMap>>;
  unbanUserFromRoomSet(
    userID: StringUserID,
    reason: string
  ): Promise<ActionResult<ResultForUserInSetMap>>;
}
export const UserConsequences = Type.Composite([
  Type.Object({
    consequenceForUserInRoom: CapabilityMethodSchema,
    consequenceForUserInRoomSet: CapabilityMethodSchema,
    unbanUserFromRoomSet: CapabilityMethodSchema,
  }),
  Capability,
]);

describeCapabilityInterface({
  name: 'UserConsequences',
  description: 'Capabilities for taking consequences against a user',
  schema: UserConsequences,
});
