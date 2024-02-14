// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult } from '../Interface/Action';
import {
  MatrixRoomID,
  MatrixRoomReference,
} from '../MatrixTypes/MatrixRoomReference';
import {
  StringRoomAlias,
  StringRoomID,
} from '../MatrixTypes/StringlyTypedMatrix';

export interface RoomResolver {
  resolveRoom(
    room: MatrixRoomReference | StringRoomAlias | StringRoomID
  ): Promise<ActionResult<MatrixRoomID>>;
}
