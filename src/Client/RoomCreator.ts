// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult } from '../Interface/Action';
import { RoomCreateOptions } from '../MatrixTypes/CreateRoom';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';

export interface RoomCreator {
  createRoom(options: RoomCreateOptions): Promise<ActionResult<MatrixRoomID>>;
}
