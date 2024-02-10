// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { RoomEvent } from '../MatrixTypes/Events';
import {
  StringEventID,
  StringRoomID,
  StringUserID,
} from '../MatrixTypes/StringlyTypedMatrix';

export interface EventReport {
  event_id: StringEventID;
  room_id: StringRoomID;
  sender: StringUserID;
  reason?: string;
  event: RoomEvent;
  received_ts?: number;
}
