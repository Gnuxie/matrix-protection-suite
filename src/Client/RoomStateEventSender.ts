// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult } from '../Interface/Action';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import {
  StringEventID,
  StringRoomID,
} from '../MatrixTypes/StringlyTypedMatrix';

export interface RoomStateEventSender {
  sendStateEvent(
    room: MatrixRoomID | StringRoomID,
    stateType: string,
    stateKey: string,
    content: Record<string, unknown>
  ): Promise<ActionResult<StringEventID>>;
}
