// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import {
  StringEventID,
  StringRoomID,
} from '@the-draupnir-project/matrix-basic-types';
import { ActionResult } from '../Interface/Action';
import { RoomEvent } from '../MatrixTypes/Events';
import { PaginationError, StreamPaginationOptions } from './Pagination';

export interface RoomEventRelationsOptions<ChunkItem>
  extends StreamPaginationOptions<ChunkItem> {
  relationType?: string;
  eventType?: string;
}

export interface RoomEventRelationsGetter {
  forEachRelation<ChunkItem = RoomEvent>(
    roomID: StringRoomID,
    eventID: StringEventID,
    options: RoomEventRelationsOptions<ChunkItem>
  ): Promise<ActionResult<void, PaginationError>>;
}
