// SPDX-FileCopyrightText: 2023 Gnuxie <Gnuxie@protonmail.com>
// SPDX-FileCopyrightText: 2018 - 2022 Travis Ralston
//
// SPDX-License-Identifier: MIT
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from matrix-bot-sdk
// https://github.com/turt2live/matrix-bot-sdk
// </text>

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
    if (parts[0] === undefined) {
      throw new TypeError(`This code fatally is wrong`);
    }
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
