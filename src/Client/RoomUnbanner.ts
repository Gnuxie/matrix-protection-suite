// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult } from '../Interface/Action';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';

export interface RoomUnbanner {
  unbanUser(
    room: MatrixRoomID | StringRoomID,
    userID: StringUserID,
    reason?: string
  ): Promise<ActionResult<void>>;
}
