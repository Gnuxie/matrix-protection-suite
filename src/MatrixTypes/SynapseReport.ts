/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * https://matrix-org.github.io/synapse/latest/admin_api/event_reports.html
 */

import { StaticDecode, Type } from '@sinclair/typebox';
import {
  StringEventID,
  StringRoomID,
  StringUserID,
} from './StringlyTypedMatrix';

export type SynapseReport = StaticDecode<typeof SynapseReport>;
export const SynapseReport = Type.Object({
  id: Type.Integer({
    description: 'ID of event report.',
  }),
  room_id: StringRoomID,
  name: Type.String({
    description:
      'The ID of the room in which the event being reported is located.',
  }),
  event_id: StringEventID,
  sender: StringUserID,
  reason: Type.Optional(
    Type.Union([Type.Null(), Type.String()], {
      description:
        'Comment made by the user_id in this report. May be blank or null.',
    })
  ),
});
