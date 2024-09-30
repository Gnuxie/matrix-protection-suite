// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Type } from '@sinclair/typebox';
import { describeConfig } from '../../Config/describeConfig';
import { StringRoomIDSchema } from '../../MatrixTypes/StringlyTypedMatrix';
import { EDStatic } from '../../Interface/Static';

export const MjolnirProtectedRoomsDescription = describeConfig({
  schema: Type.Object({
    rooms: Type.Array(StringRoomIDSchema, { default: [], uniqueItems: true }),
  }),
});

export type MjolnirProtectedRoomsConfigEvent = EDStatic<
  typeof MjolnirProtectedRoomsDescription.schema
>;
