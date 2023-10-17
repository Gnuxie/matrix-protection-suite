/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { Type } from '@sinclair/typebox';

const secret = Symbol('matrix-user-id');
export type StringUserID = string & { [secret]: true };

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
      throw new TypeError(`Couldnt' decode ${value} as an mxid`);
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
