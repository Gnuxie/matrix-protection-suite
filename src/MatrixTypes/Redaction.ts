// Copyright 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2018 New Vector Ltd
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from matrix-spec
// https://github.com/matrix-org/matrix-spec
// </text>

import { StaticDecode, Type } from '@sinclair/typebox';
import { RoomEvent } from './Events';
import { StringEventID } from './StringlyTypedMatrix';
import { registerDefaultDecoder } from './EventDecoder';
import { Value } from '../Interface/Value';

export type RedactionContent = StaticDecode<typeof RedactionContent>;
export const RedactionContent = Type.Object({
  redacts: Type.Optional(
    Type.Union([StringEventID], {
      description:
        'The event ID that was redacted. Required for, and present starting in, room version 11. This is protected from redaction.',
    })
  ),
  reason: Type.Optional(
    Type.String({ description: 'The reason for the redaction, if any.' })
  ),
});

export type Redaction = StaticDecode<typeof Redaction>;
export const Redaction = Type.Composite([
  Type.Omit(RoomEvent(RedactionContent), ['type']),
  Type.Object({
    redacts: Type.Optional(
      Type.Union([StringEventID], {
        description:
          'Required for, and only present in, room versions 1 - 10. The event ID that was redacted. This is not protected from redaction and can be removed in room versions prior to v11.',
      })
    ),
    type: Type.Literal('m.room.redaction'),
  }),
]);

export function redactionTargetEvent(
  event: Redaction
): StringEventID | undefined {
  return event.redacts ?? event.content.redacts;
}

registerDefaultDecoder('m.room.redaction', (event) =>
  Value.Decode(Redaction, event)
);
