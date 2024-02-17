// Copyright 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2018 New Vector Ltd
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from matrix-spec
// https://github.com/matrix-org/matrix-spec
// </text>

import { Static, Type } from '@sinclair/typebox';
import { StateEvent } from './Events';
import { registerDefaultDecoder } from './EventDecoder';
import { Value } from '../Interface/Value';

export type ServerACLContent = Static<typeof ServerACLContent>;
export const ServerACLContent = Type.Optional(
  Type.Object({
    allow_ip_literals: Type.Optional(
      Type.Boolean({
        description:
          'True to allow server names that are IP address literals. False to\ndeny. Defaults to true if missing or otherwise not a boolean.\n\nThis is strongly recommended to be set to `false` as servers running\nwith IP literal names are strongly discouraged in order to require\nlegitimate homeservers to be backed by a valid registered domain name.',
      })
    ),
    allow: Type.Optional(
      Type.Array(Type.String(), {
        description:
          'The server names to allow in the room, excluding any port information.\nEach entry is interpreted as a [glob-style pattern](/appendices#glob-style-matching).\n\n**This defaults to an empty list when not provided, effectively disallowing\nevery server.**',
      })
    ),
    deny: Type.Optional(
      Type.Array(Type.String(), {
        description:
          'The server names to disallow in the room, excluding any port information.\nEach entry is interpreted as a [glob-style pattern](/appendices#glob-style-matching).\n\nThis defaults to an empty list when not provided.',
      })
    ),
  })
);

export type ServerACLEvent = Static<typeof ServerACLEvent>;
export const ServerACLEvent = Type.Composite([
  StateEvent(ServerACLContent),
  Type.Object({
    state_key: Type.Optional(
      Type.String({ description: 'A zero-length string.', pattern: '^$' })
    ),
    type: Type.Literal('m.room.server_acl'),
  }),
]);

registerDefaultDecoder('m.room.server_acl', (event) =>
  Value.Decode(ServerACLEvent, event)
);
