// Copyright 2023 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2018 New Vector Ltd
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from matrix-spec
// https://github.com/matrix-org/matrix-spec
// </text>

import { Type } from '@sinclair/typebox';
import { StringEventID } from './StringlyTypedMatrix';
import { RoomEvent } from './Events';
import { registerDefaultDecoder } from './EventDecoder';
import { Value } from '../Interface/Value';
import { EDStatic } from '../Interface/Static';

export type ReactionContent = EDStatic<typeof ReactionContent>;
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

export type ReactionEvent = EDStatic<typeof ReactionEvent>;
export const ReactionEvent = Type.Intersect([
  Type.Omit(RoomEvent(Type.Unknown()), ['content', 'type']),
  Type.Object({
    content: Type.Optional(ReactionContent),
    type: Type.Literal('m.reaction'),
  }),
]);

registerDefaultDecoder('m.reaction', (event) =>
  Value.Decode(ReactionEvent, event)
);
