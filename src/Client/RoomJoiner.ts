// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import {
  MatrixRoomID,
  MatrixRoomReference,
  StringRoomAlias,
  StringRoomID,
} from '@the-draupnir-project/matrix-basic-types';
import { ActionResult } from '../Interface/Action';
import { RoomResolver } from './RoomResolver';

export interface RoomJoiner extends RoomResolver {
  joinRoom(
    room: MatrixRoomReference | StringRoomID | StringRoomAlias
  ): Promise<ActionResult<MatrixRoomID>>;
}
