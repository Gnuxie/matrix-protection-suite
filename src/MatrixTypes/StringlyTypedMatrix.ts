/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

const secret = Symbol('matrix-user-id');
export type MatrixUserID = string & { [secret]: true };

export function isMatrixUserID(string: string): string is MatrixUserID {
  return /^@[\S^:]*:\S*$/.test(string);
}

export function serverName(userID: MatrixUserID): string {
  const match = /^@[\S^:]*:(\S)*$/.exec(userID)?.at(1);
  if (match === undefined) {
    throw new TypeError('Somehow a MatrixUserID was created that is invalid.');
  }
  return match;
}
