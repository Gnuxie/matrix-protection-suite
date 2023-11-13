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

import { Static, StaticDecode, Type } from '@sinclair/typebox';
import { RoomEvent } from './Events';

export type MessageContent = Static<typeof MessageContent>;
export const MessageContent = Type.Object({
  body: Type.String({
    description: 'The textual representation of this message.',
  }),
  msgtype: Type.String({
    description: 'The type of message, e.g. `m.image`, `m.text`',
  }),
});

export type TextMessageContent = Static<typeof TextMessageContent>;
export const TextMessageContent = Type.Object({
  body: Type.String({ description: 'The body of the message.' }),
  msgtype: Type.Literal('m.text'),
  format: Type.Optional(
    Type.String({
      description:
        'The format used in the `formatted_body`. Currently only\n`org.matrix.custom.html` is supported.',
    })
  ),
  formatted_body: Type.Optional(
    Type.String({
      description:
        'The formatted version of the `body`. This is required if `format`\nis specified.',
    })
  ),
});

export type NoticeMessageContent = Static<typeof NoticeMessageContent>;
export const NoticeMessageContent = Type.Object({
  body: Type.String({ description: 'The notice text to send.' }),
  msgtype: Type.Literal('m.notice'),
  format: Type.Optional(
    Type.String({
      description:
        'The format used in the `formatted_body`. Currently only\n`org.matrix.custom.html` is supported.',
    })
  ),
  formatted_body: Type.Optional(
    Type.String({
      description:
        'The formatted version of the `body`. This is required if `format`\nis specified.',
    })
  ),
});

// TODO:
// Somewhat annoyed. This isn't going to cut it and I don't know if parsing messages
// this way will make sense in the long run.
// Instead we need for each event a way of listing all event fields that contain
// text that should be scanned. And probably split by format in the case of
// org.matrix.custom.html.
// Well, at least that is the case for any component that needs to scan.
export type RoomMessage = StaticDecode<typeof RoomMessage>;
export const RoomMessage = Type.Composite([
  Type.Omit(RoomEvent(Type.Unknown()), ['content', 'type']),
  Type.Object({
    content: Type.Optional(
      Type.Union([TextMessageContent, NoticeMessageContent, Type.Unknown()])
    ),
    type: Type.Literal('m.room.message'),
  }),
]);
