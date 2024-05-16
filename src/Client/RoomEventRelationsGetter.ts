// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult } from '../Interface/Action';
import { RoomEvent } from '../MatrixTypes/Events';
import {
  StringEventID,
  StringRoomID,
} from '../MatrixTypes/StringlyTypedMatrix';
import {
  PaginationOptions,
  StreamPaginationError,
  StreamPaginationOptions,
} from './Pagination';

export interface RoomEventRelationsOptions extends PaginationOptions {
  relationType?: string;
  eventType?: string;
}

export interface RoomEventRelationsGetter<ChunkItem = RoomEvent> {
  forEachRelation(
    roomID: StringRoomID,
    eventID: StringEventID,
    options: StreamPaginationOptions<ChunkItem>
  ): Promise<ActionResult<void, StreamPaginationError>>;
}
