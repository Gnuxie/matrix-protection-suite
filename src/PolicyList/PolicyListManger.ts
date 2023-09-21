/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { MatrixRoomReference } from '../MatrixTypes/MatrixRoomReference';
import { RoomCreateOptions } from '../MatrixTypes/CreateRoom';
import { ActionResult } from '../Interface/Action';
import { PolicyList } from './PolicyList';

export interface PolicyListManager {
  createList(
    shortcode: string,
    invite: string[],
    createRoomOptions: RoomCreateOptions
  ): Promise<ActionResult<MatrixRoomReference>>;

  getList(room: MatrixRoomReference): Promise<ActionResult<PolicyList>>;
}
