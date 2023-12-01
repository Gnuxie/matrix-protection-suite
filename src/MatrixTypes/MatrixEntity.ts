/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file incorperates work from matrix-bot-sdk
 * https://github.com/turt2live/matrix-bot-sdk
 * which included the following license notice:
MIT License

Copyright (c) 2018 - 2022 Travis Ralston

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import { StringUserID, isStringUserID } from './StringlyTypedMatrix';

/**
 * Represents a Matrix entity
 * @category Utilities
 */
class MatrixEntity {
  private entityLocalpart: string;
  private entityDomain: string;

  /**
   * Creates a new Matrix entity
   * @param {string} fullId The full ID of the entity
   */
  constructor(protected fullId: string) {
    if (!fullId) throw new Error('No entity ID provided');
    if (fullId.length < 2) throw new Error('ID too short');
    const parts = fullId.split(/:/g);
    this.entityLocalpart = parts[0].substring(1);
    this.entityDomain = parts.splice(1).join(':');
  }

  /**
   * The localpart for the entity
   */
  public get localpart(): string {
    return this.entityLocalpart;
  }

  /**
   * The domain for the entity
   */
  public get domain(): string {
    return this.entityDomain;
  }

  // override
  public toString(): string {
    return this.fullId;
  }
}

/**
 * Represents a Matrix user ID
 * @category Utilities
 */
export class UserID extends MatrixEntity {
  constructor(userId: string) {
    super(userId);
    if (!isStringUserID(userId)) {
      throw new Error('Not a valid user ID');
    }
  }

  public toString(): StringUserID {
    return this.fullId as StringUserID;
  }
}

/**
 * Represents a Matrix room alias
 * @category Utilities
 */
export class RoomAlias extends MatrixEntity {
  constructor(alias: string) {
    super(alias);
    if (!alias.startsWith('#')) {
      throw new Error('Not a valid room alias');
    }
  }
}
