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
import { RoomResolver } from './RoomResolver';

export interface RoomJoiner extends RoomResolver {
  joinRoom(
    room: MatrixRoomReference | StringRoomID | StringRoomAlias
  ): Promise<ActionResult<MatrixRoomID>>;
}
