// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from matrix-protection-suite
// https://github.com/Gnuxie/matrix-protection-suite
// </text>

import { Type } from '@sinclair/typebox';
import { EDStatic } from '../../Interface/Static';
import {
  StringEventID,
  StringRoomID,
  StringUserID,
} from '@the-draupnir-project/matrix-basic-types';
import { RoomEvent } from '../../MatrixTypes/Events';
import { Value } from '../../Interface/Value';
import { isUndecodableEvent } from '../UndecodableEventContent';
import { UnsafeContentKey } from '../SafeMembershipEvent';
import { hasOwn } from './hasOwn';
import { StringUserIDSchema } from '../../MatrixTypes/StringlyTypedMatrix';

export enum MediaMixinTypes {
  Body = 'body',
  FormattedBody = 'formatted_body',
  MediaURL = 'mxc_url',
  ThumbnailURL = 'mxc_thumbnail_url',
  File = 'file',
  Mentions = 'm.mentions',
  Erroneous = 'erroneous',
}

export type MediaMixin =
  | ErroneousMediaMixin
  | BodyMediaMixin
  | FormattedBodyMediaMimxin
  | MediaURLMediaMixin
  | ThumbnailURLMediaMixin
  | FileMediaMixin
  | MentionsMediaMixin;

export type ErroneousMediaMixin = {
  attemptedMixinType: MediaMixinTypes;
  mixinType: MediaMixinTypes.Erroneous;
};

function ErroneousMixin(
  attemptedMixinType: Exclude<MediaMixinTypes, MediaMixinTypes.Erroneous>
): ErroneousMediaMixin {
  return {
    mixinType: MediaMixinTypes.Erroneous,
    attemptedMixinType,
  };
}

export type BodyMediaMixin = {
  mixinType: MediaMixinTypes.Body;
  body: string;
};

export function extractBodyMixin(
  content: Record<string, unknown>
): BodyMediaMixin | ErroneousMediaMixin | undefined {
  if (!hasOwn(content, 'body')) {
    return undefined;
  }
  if (typeof content.body === 'string') {
    return {
      mixinType: MediaMixinTypes.Body,
      body: content.body,
    };
  }
  return ErroneousMixin(MediaMixinTypes.Body);
}

export type FormattedBodyMediaMimxin = {
  mixinType: MediaMixinTypes.FormattedBody;
  formatted_body: string;
  format: string | undefined;
};

export function extractFormattedBodyMixin(
  content: Record<string, unknown>
): FormattedBodyMediaMimxin | ErroneousMediaMixin | undefined {
  if (!hasOwn(content, 'formatted_body')) {
    return undefined;
  }
  if (
    typeof content.formatted_body === 'string' &&
    hasOwn(content, 'format') &&
    typeof content.format === 'string'
  ) {
    return {
      mixinType: MediaMixinTypes.FormattedBody,
      formatted_body: content.formatted_body,
      format: content.format,
    };
  }
  return ErroneousMixin(MediaMixinTypes.FormattedBody);
}

export type FileMediaMixin = {
  mixinType: MediaMixinTypes.File;
  url: string;
  filename: string;
  caption: string | undefined;
};

const FileMediaMixinSchema = Type.Object({
  body: Type.Optional(Type.String()),
  file: Type.Object({
    url: Type.String(),
  }),
  filename: Type.Optional(Type.String()),
});

export function extractFileMixin(
  content: Record<string, unknown>
): FileMediaMixin | ErroneousMediaMixin | undefined {
  if (!hasOwn(content, 'file')) {
    return undefined;
  }
  if (Value.Check(FileMediaMixinSchema, content)) {
    const filename = content.filename ?? content.body;
    const caption =
      content.filename !== undefined && content.body !== content.filename
        ? content.body
        : undefined;
    if (filename === undefined) {
      // A filename is required
      return ErroneousMixin(MediaMixinTypes.File);
    }
    return {
      mixinType: MediaMixinTypes.File,
      filename,
      caption,
      url: content.file.url,
    };
  }
  return ErroneousMixin(MediaMixinTypes.File);
}

/**
 * We do not include the size or mimetype because those fields
 * are untrusted and not validated by homeservers or ANYONE.
 * We do not want someone to accidentally trust them.
 */
export type MediaURLMediaMixin = {
  mixinType: MediaMixinTypes.MediaURL;
  url: string;
};

export function extractMediaURLMixin(
  content: Record<string, unknown>
): MediaURLMediaMixin | ErroneousMediaMixin | undefined {
  if (!hasOwn(content, 'url')) {
    return undefined;
  }
  if (typeof content.url === 'string') {
    return {
      mixinType: MediaMixinTypes.MediaURL,
      url: content.url,
    };
  }
  return ErroneousMixin(MediaMixinTypes.MediaURL);
}

export type ThumbnailURLMediaMixin = {
  mixinType: MediaMixinTypes.ThumbnailURL;
  url: string;
};

export function extractThumbnailURLMixin(
  content: Record<string, unknown>
): ThumbnailURLMediaMixin | ErroneousMediaMixin | undefined {
  if (!hasOwn(content, 'thumbnail_url')) {
    return undefined;
  }
  if (typeof content.thumbnail_url === 'string') {
    return {
      mixinType: MediaMixinTypes.ThumbnailURL,
      url: content.thumbnail_url,
    };
  }
  return ErroneousMixin(MediaMixinTypes.ThumbnailURL);
}

export type MentionsMediaMixin = {
  mixinType: MediaMixinTypes.Mentions;
  user_ids: StringUserID[];
};

type MentionsContentSchema = EDStatic<typeof MentionsContentSchema>;
const MentionsContentSchema = Type.Object({
  'm.mentions': Type.Object({
    user_ids: Type.Optional(Type.Array(StringUserIDSchema)),
  }),
});

export function extractMentionsMixin(
  content: Record<string, unknown>
): MentionsMediaMixin | ErroneousMediaMixin | undefined {
  if (!hasOwn(content, 'm.mentions')) {
    return undefined;
  }
  if (Value.Check(MentionsContentSchema, content)) {
    if (content['m.mentions']['user_ids'] === undefined) {
      return undefined;
    }
    return {
      mixinType: MediaMixinTypes.Mentions,
      user_ids: content['m.mentions'].user_ids,
    };
  }
  return ErroneousMixin(MediaMixinTypes.Mentions);
}

export function extractMixinsFromContent(
  content: Record<string, unknown>
): MediaMixin[] {
  const mixins: MediaMixin[] = [];

  for (const extractor of [
    extractBodyMixin,
    extractFormattedBodyMixin,
    extractMediaURLMixin,
    extractThumbnailURLMixin,
    extractFileMixin,
    extractMentionsMixin,
  ]) {
    const mixin = extractor(content);
    if (mixin) {
      mixins.push(mixin);
    }
  }
  return mixins;
}

export type SafeMediaEvent = {
  room_id: StringRoomID;
  event_id: StringEventID;
  type: string;
  sender: StringUserID;
  media: MediaMixin[];
  sourceEvent: RoomEvent;
};

export function extractPrimaryContent(
  event: RoomEvent
): Record<string, unknown> {
  return isUndecodableEvent(event)
    ? (event[UnsafeContentKey] as Record<string, unknown>)
    : event.content;
}

export function extractNewContent(
  primaryContent: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (hasOwn(primaryContent, 'm.new_content')) {
    const newContent = primaryContent['m.new_content'];
    if (typeof newContent !== 'object' || newContent === null) {
      return undefined;
    }
    return newContent as Record<string, unknown>;
  }
  return undefined;
}

export function extractEventType(event: RoomEvent): string {
  if (isUndecodableEvent(event)) {
    return event.originalType;
  }
  return event.type;
}

export function extractSafeMediaEvent(event: RoomEvent): SafeMediaEvent {
  const primaryContent = extractPrimaryContent(event);
  const eventType = extractEventType(event);
  const newContent = extractNewContent(primaryContent);
  const mixins: MediaMixin[] = [];
  for (const content of [primaryContent, newContent]) {
    if (content) {
      mixins.push(...extractMixinsFromContent(content));
    }
  }
  return {
    room_id: event.room_id,
    event_id: event.event_id,
    type: eventType,
    sender: event.sender,
    media: mixins,
    sourceEvent: event,
  };
}
