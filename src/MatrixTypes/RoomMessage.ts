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

export type ThumbnailInfo = Static<typeof ThumbnailInfo>;
export const ThumbnailInfo = Type.Object({
  h: Type.Optional(
    Type.Number({
      description:
        'The intended display height of the image in pixels. This may\ndiffer from the intrinsic dimensions of the image file.',
    })
  ),
  w: Type.Optional(
    Type.Number({
      description:
        'The intended display width of the image in pixels. This may\ndiffer from the intrinsic dimensions of the image file.',
    })
  ),
  mimetype: Type.Optional(
    Type.String({
      description: 'The mimetype of the image, e.g. `image/jpeg`.',
    })
  ),
  size: Type.Optional(
    Type.Number({ description: 'Size of the image in bytes.' })
  ),
});

export type ImageInfo = Static<typeof ImageInfo>;
export const ImageInfo = Type.Object({
  h: Type.Optional(
    Type.Number({
      description:
        'The intended display height of the image in pixels. This may\ndiffer from the intrinsic dimensions of the image file.',
    })
  ),
  w: Type.Optional(
    Type.Number({
      description:
        'The intended display width of the image in pixels. This may\ndiffer from the intrinsic dimensions of the image file.',
    })
  ),
  mimetype: Type.Optional(
    Type.String({
      description: 'The mimetype of the image, e.g. `image/jpeg`.',
    })
  ),
  size: Type.Optional(
    Type.Number({ description: 'Size of the image in bytes.' })
  ),
  thumbnail_url: Type.Optional(
    Type.String({
      description:
        'The URL (typically [`mxc://` URI](/client-server-api/#matrix-content-mxc-uris)) to a thumbnail of the image.\nOnly present if the thumbnail is unencrypted.',
    })
  ),
  thumbnail_file: Type.Optional(Type.Unknown()),
  thumbnail_info: Type.Optional(ThumbnailInfo),
});

export type ImageMessageContent = Static<typeof ImageMessageContent>;
export const ImageMessageContent = Type.Object({
  body: Type.String({
    description:
      "A textual representation of the image. This could be the alt text of the image, the filename of the image, or some kind of content description for accessibility e.g. 'image attachment'.",
  }),
  info: Type.Optional(ImageInfo),
  msgtype: Type.Literal('m.image'),
  url: Type.Optional(
    Type.String({
      description:
        'Required if the file is unencrypted. The URL (typically [`mxc://` URI](/client-server-api/#matrix-content-mxc-uris))\nto the image.',
    })
  ),
  file: Type.Optional(Type.Unknown()),
});

export type VideoMessageContent = Static<typeof VideoMessageContent>;
export const VideoMessageContent = Type.Object({
  body: Type.String({
    description:
      "A description of the video e.g. 'Gangnam style', or some kind of content description for accessibility e.g. 'video attachment'.",
  }),
  info: Type.Optional(
    Type.Object({
      duration: Type.Optional(
        Type.Number({
          description: 'The duration of the video in milliseconds.',
        })
      ),
      h: Type.Optional(
        Type.Number({ description: 'The height of the video in pixels.' })
      ),
      w: Type.Optional(
        Type.Number({ description: 'The width of the video in pixels.' })
      ),
      mimetype: Type.Optional(
        Type.String({
          description: 'The mimetype of the video e.g. `video/mp4`.',
        })
      ),
      size: Type.Optional(
        Type.Number({ description: 'The size of the video in bytes.' })
      ),
      thumbnail_url: Type.Optional(
        Type.String({
          description:
            'The URL (typically [`mxc://` URI](/client-server-api/#matrix-content-mxc-uris)) to an image thumbnail of\nthe video clip. Only present if the thumbnail is unencrypted.',
        })
      ),
      thumbnail_file: Type.Optional(Type.Unknown()),
      thumbnail_info: Type.Optional(ThumbnailInfo),
    })
  ),
  msgtype: Type.Literal('m.video'),
  url: Type.Optional(
    Type.String({
      description:
        'Required if the file is unencrypted. The URL (typically [`mxc://` URI](/client-server-api/#matrix-content-mxc-uris))\nto the video clip.',
    })
  ),
  file: Type.Optional(Type.Unknown()),
});

// TODO:
// Somewhat annoyed. This isn't going to cut it and I don't know if parsing messages
// this way will make sense in the long run.
// Instead we need for each event a way of listing all event fields that contain
// text that should be scanned. And probably split by format in the case of
// org.matrix.custom.html.
// So basically a wrapper class, whose instances are made by extracting
// extensible event fields from every event
// and makes them available to the consumer.
// and it'll have to do the same for m.room.message.
// Thanks guys.
export type RoomMessage = StaticDecode<typeof RoomMessage>;
export const RoomMessage = Type.Composite([
  Type.Omit(RoomEvent(Type.Unknown()), ['content', 'type']),
  Type.Object({
    content: Type.Optional(
      Type.Union([
        TextMessageContent,
        NoticeMessageContent,
        ImageMessageContent,
        VideoMessageContent,
      ])
    ),
    type: Type.Literal('m.room.message'),
  }),
]);
