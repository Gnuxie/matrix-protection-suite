// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Type } from '@sinclair/typebox';

const UserIDSecret = Symbol('StringUserID');
export type StringUserID = string & { [UserIDSecret]: true };

export const StringUserID = Type.Transform(
  Type.String({
    description:
      'Contains the fully-qualified ID of the user who sent this event.',
  })
)
  .Decode((value) => {
    if (isStringUserID(value)) {
      return value;
    } else {
      throw new TypeError(`Couldnt' decode ${value} as an StringUserID`);
    }
  })
  .Encode((value) => value);

export function isStringUserID(string: string): string is StringUserID {
  return /^@[\S^:]*:\S*$/.test(string);
}

export function serverName(userID: StringUserID): string {
  const match = /^@[\S^:]*:(\S)*$/.exec(userID)?.at(1);
  if (match === undefined) {
    throw new TypeError('Somehow a MatrixUserID was created that is invalid.');
  }
  return match;
}

export function userLocalpart(userID: StringUserID): string {
  const match = /^@([\S^:]*):\S*$/.exec(userID)?.at(1);
  if (match === undefined) {
    throw new TypeError('Somehow a MatrixUserID was created that is invalid.');
  }
  return match;
}

const StringRoomIDSecret = Symbol('StringRoomID');
export type StringRoomID = string & { [StringRoomIDSecret]: true };

export const StringRoomID = Type.Transform(
  Type.String({
    description: 'The ID of the room associated with this event.',
  })
)
  .Decode((value) => {
    if (isStringRoomID(value)) {
      return value;
    } else {
      throw new TypeError(`Couldn't decode ${value} as a StringRoomID`);
    }
  })
  .Encode((value) => value);

export function isStringRoomID(string: string): string is StringRoomID {
  return /^![^:]*:(\S)*/.test(string);
}

const StringRoomAliasSecret = Symbol('StringRoomAlias');
export type StringRoomAlias = string & { [StringRoomAliasSecret]: true };

export const StringRoomAlias = Type.Transform(
  Type.String({
    description: 'An alias for the room.',
  })
)
  .Decode((value) => {
    if (isStringRoomAlias(value)) {
      return value;
    } else {
      throw new TypeError(`Couldn't decode ${value} as StringRoomAlias`);
    }
  })
  .Encode((value) => value);

export function isStringRoomAlias(string: string): string is StringRoomAlias {
  return /^#[^:]*:(\S)*/.test(string);
}

export function roomAliasLocalpart(alias: StringRoomAlias): string {
  const match = /^#([\S^:]*):\S*$/.exec(alias)?.at(1);
  if (match === undefined) {
    throw new TypeError(
      'Somehow a StringRoomAlias was created that is invalid.'
    );
  }
  return match;
}

const StringEventIDSecret = Symbol('StringEventID');
export type StringEventID = string & { [StringEventIDSecret]: true };

export function isStringEventID(string: string): string is StringEventID {
  return string.startsWith('$');
}

export const StringEventID = Type.Transform(
  Type.String({
    description: 'The globally unique event identifier.',
  })
)
  .Decode((value) => {
    if (isStringEventID(value)) {
      return value;
    } else {
      throw new TypeError(`Couldn't decode ${value} as a StringEventID`);
    }
  })
  .Encode((value) => value);
