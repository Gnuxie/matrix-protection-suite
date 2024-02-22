// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult } from '../Interface/Action';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import {
  StringEventID,
  StringRoomID,
} from '../MatrixTypes/StringlyTypedMatrix';

export interface RoomEventRedacter {
  redactEvent(
    room: MatrixRoomID | StringRoomID,
    eventID: StringEventID,
    reason?: string
  ): Promise<ActionResult<StringEventID>>;
}
