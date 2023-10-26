/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from matrix-spec
 * https://github.com/matrix-org/matrix-spec
 * which included the following license notice:
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
