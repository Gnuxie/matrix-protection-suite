/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from matrix-spec
 * https://github.com/matrix-org/matrix-spec
 * which included the following license notice:
Copyright 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 *
 * However, this file is modified and the modifications in this file
 * are NOT distributed, contributed, committed, or licensed under the Apache License.
 */

import { Static, Type } from '@sinclair/typebox';
import { StateEvent } from './Events';

export type PowerLevelsEventContent = Static<typeof PowerLevelsEventContent>;
export const PowerLevelsEventContent = Type.Optional(
  Type.Object({
    ban: Type.Optional(
      Type.Number({
        description:
          'The level required to ban a user. Defaults to 50 if unspecified.',
      })
    ),
    events: Type.Optional(Type.Record(Type.String(), Type.Number())),
    events_default: Type.Optional(
      Type.Number({
        description:
          'The default level required to send message events. Can be\noverridden by the `events` key.  Defaults to 0 if unspecified.',
      })
    ),
    invite: Type.Optional(
      Type.Number({
        description:
          'The level required to invite a user. Defaults to 0 if unspecified.',
      })
    ),
    kick: Type.Optional(
      Type.Number({
        description:
          'The level required to kick a user. Defaults to 50 if unspecified.',
      })
    ),
    redact: Type.Optional(
      Type.Number({
        description:
          'The level required to redact an event sent by another user. Defaults to 50 if unspecified.',
      })
    ),
    state_default: Type.Optional(
      Type.Number({
        description:
          'The default level required to send state events. Can be overridden\nby the `events` key. Defaults to 50 if unspecified.',
      })
    ),
    users: Type.Optional(Type.Record(Type.String(), Type.Number())),
    users_default: Type.Optional(
      Type.Number({
        description:
          'The power level for users in the room whose `user_id` is not mentioned in the `users` key. Defaults to 0 if\nunspecified.\n\n**Note**: When there is no `m.room.power_levels` event in the room, the room creator has\na power level of 100, and all other users have a power level of 0.     ',
      })
    ),
    notifications: Type.Optional(
      Type.Object(
        {
          room: Type.Optional(
            Type.Number({
              description:
                'The level required to trigger an `@room` notification. Defaults to 50 if unspecified.',
            })
          ),
        },
        { additionalProperties: Type.Number() }
      )
    ),
  })
);

export type PowerLevelsEvent = Static<typeof PowerLevelsEvent>;
export const PowerLevelsEvent = Type.Intersect([
  StateEvent(PowerLevelsEventContent),
  Type.Object({
    state_key: Type.Optional(
      Type.String({ description: 'A zero-length string.', pattern: '^$' })
    ),
    type: Type.Optional(Type.Union([Type.Literal('m.room.power_levels')])),
  }),
]);
