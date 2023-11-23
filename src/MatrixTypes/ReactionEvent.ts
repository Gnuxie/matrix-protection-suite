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

import { StaticDecode, Type } from '@sinclair/typebox';
import { StringEventID } from './StringlyTypedMatrix';
import { RoomEvent } from './Events';

export type ReactionContent = StaticDecode<typeof ReactionContent>;
export const ReactionContent = Type.Object({
  ['m.relates_to']: Type.Optional(
    Type.Object({
      rel_type: Type.Optional(Type.Union([Type.Literal('m.annotation')])),
      event_id: StringEventID,
      key: Type.Optional(
        Type.String({
          description:
            'The reaction being made, usually an emoji.\n\nIf this is an emoji, it should include the unicode emoji\npresentation selector (`\\uFE0F`) for codepoints which allow it\n(see the [emoji variation sequences\nlist](https://www.unicode.org/Public/UCD/latest/ucd/emoji/emoji-variation-sequences.txt)).',
          example: '👍',
        })
      ),
    })
  ),
});

export type ReactionEvent = StaticDecode<typeof ReactionEvent>;
export const ReactionEvent = Type.Composite([
  Type.Omit(RoomEvent(Type.Unknown()), ['content', 'type']),
  Type.Object({
    content: Type.Optional(ReactionContent),
    type: Type.Literal('m.reaction'),
  }),
]);
