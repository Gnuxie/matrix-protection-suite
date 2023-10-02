/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import {
  MatrixRoomID,
  MatrixRoomReference,
} from '../MatrixTypes/MatrixRoomReference';
import { RoomCreateOptions } from '../MatrixTypes/CreateRoom';
import { ActionResult } from '../Interface/Action';
import { PolicyRuleEvent } from '../MatrixTypes/PolicyEvents';
import { PolicyRoomRevisionIssuer } from './PolicyListRevisionIssuer';
import { PolicyListEditor } from './PolicyListEditor';

export interface PolicyListManager {
  createList(
    shortcode: string,
    invite: string[],
    createRoomOptions: RoomCreateOptions
  ): Promise<ActionResult<MatrixRoomReference>>;

  getPolicyRoomRevisionIssuer(
    room: MatrixRoomID
  ): Promise<ActionResult<PolicyRoomRevisionIssuer>>;

  getListEditor(room: MatrixRoomID): Promise<ActionResult<PolicyListEditor>>;

  getPolicyRuleEvents(
    room: MatrixRoomReference
  ): Promise<ActionResult<PolicyRuleEvent[]>>;
}
