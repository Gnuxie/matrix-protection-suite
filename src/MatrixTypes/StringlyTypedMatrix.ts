// Copyright 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2024 Haydn Paterson (sinclair) <haydn.developer@gmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { FormatRegistry, Type } from '@sinclair/typebox';

const StringUserIDRegex = /^@(?<localpart>[^\s:]*):(?<serverName>\S*)$/;

const UserIDSecret = Symbol('StringUserID');
export type StringUserID = string & { [UserIDSecret]: true };

FormatRegistry.Set('StringUserID', isStringUserID);

export const StringUserID = Type.Unsafe<StringUserID>(
  Type.String({ format: 'StringUserID' })
);

export function isStringUserID(string: string): string is StringUserID {
  return StringUserIDRegex.test(string);
}

export function serverName(userID: StringUserID): string {
  const match = StringUserIDRegex.exec(userID)?.groups?.serverName;
  if (match === undefined) {
    throw new TypeError('Somehow a StringUserID was created that is invalid.');
  }
  return match;
}

export function userLocalpart(userID: StringUserID): string {
  const match = StringUserIDRegex.exec(userID)?.groups?.localpart;
  if (match === undefined) {
    throw new TypeError('Somehow a StringUserID was created that is invalid.');
  }
  return match;
}

const StringRoomIDRegex = /^![^:]*:\S*/;

const StringRoomIDSecret = Symbol('StringRoomID');
export type StringRoomID = string & { [StringRoomIDSecret]: true };

FormatRegistry.Set('StringRoomID', isStringRoomID);

export const StringRoomID = Type.Unsafe<StringRoomID>(
  Type.String({ format: 'StringRoomID' })
);

export function isStringRoomID(string: string): string is StringRoomID {
  return StringRoomIDRegex.test(string);
}

const StringRoomAliasRegex = /^#(?<roomAliasLocalpart>[^\s:]*):\S*$/;

const StringRoomAliasSecret = Symbol('StringRoomAlias');
export type StringRoomAlias = string & { [StringRoomAliasSecret]: true };

FormatRegistry.Set('StringRoomAlias', isStringRoomAlias);

export const StringRoomAlias = Type.Unsafe<StringRoomAlias>(
  Type.String({ format: 'StringRoomAlias' })
);

export function isStringRoomAlias(string: string): string is StringRoomAlias {
  return StringRoomAliasRegex.test(string);
}

export function roomAliasLocalpart(alias: StringRoomAlias): string {
  const match = StringRoomAliasRegex.exec(alias)?.groups?.roomAliasLocalpart;
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

FormatRegistry.Set('StringEventID', isStringEventID);

export const StringEventID = Type.Unsafe<StringEventID>(
  Type.String({ format: 'StringEventID' })
);
