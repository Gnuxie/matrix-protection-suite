/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { StaticDecode } from '@sinclair/typebox';
import { ActionResult } from '../Interface/Action';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { MembershipEvent } from '../MatrixTypes/MembershipEvent';
import { RoomMembershipRevisionIssuer } from './MembershipRevisionIssuer';

// NOTE: This isn't going to be used to query about a set of rooms
//       a propagator version of the revision should be used for that.
export interface RoomMembershipManager {
  getRoomMembershipRevisionIssuer(
    room: MatrixRoomID
  ): Promise<ActionResult<RoomMembershipRevisionIssuer>>;

  getRoomMembershipEvents(
    room: MatrixRoomID
  ): Promise<ActionResult<StaticDecode<typeof MembershipEvent>[]>>;
}
