// SPDX-FileCopyrightText: 2023 Gnuxie <Gnuxie@protonmail.com>
// SPDX-FileCopyrightText: 2018 - 2022 Travis Ralston
//
// SPDX-License-Identifier: MIT
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from matrix-bot-sdk
// https://github.com/turt2live/matrix-bot-sdk
// </text>

import { ActionError, ActionResult, Ok } from '../Interface/Action';
import {
  StringEventID,
  StringRoomAlias,
  StringRoomID,
  StringUserID,
  isStringEventID,
  isStringRoomAlias,
  isStringRoomID,
  isStringUserID,
} from './StringlyTypedMatrix';

/**
 * The parts of a permalink.
 * @see Permalinks
 * @category Utilities
 */
export interface PermalinkParts {
  /**
   * The roomID that the Permalink references.
   */
  roomID?: StringRoomID;

  /**
   * The roomAlias that the Permalink references.
   */
  roomAlias?: StringRoomAlias;

  /**
   * The user ID the permalink references. May be undefined.
   */
  userID?: StringUserID;

  /**
   * The event ID the permalink references. May be undefined.
   */
  eventID?: StringEventID;

  /**
   * The servers the permalink is routed through.
   */
  viaServers: string[];
}

/**
 * Functions for handling permalinks
 * @category Utilities
 */
export class Permalinks {
  private constructor() {
    // nothing to do.
  }

  private static encodeViaArgs(servers: string[]): string {
    if (servers.length === 0) return '';

    return `?via=${servers.join('&via=')}`;
  }

  /**
   * Creates a room permalink.
   * @param {string} roomIDOrAlias The room ID or alias to create a permalink for.
   * @param {string[]} viaServers The servers to route the permalink through.
   * @returns {string} A room permalink.
   */
  public static forRoom(
    roomIDOrAlias: StringRoomID | StringRoomAlias,
    viaServers: string[] = []
  ): string {
    return `https://matrix.to/#/${encodeURIComponent(
      roomIDOrAlias
    )}${Permalinks.encodeViaArgs(viaServers)}`;
  }

  /**
   * Creates a user permalink.
   * @param {string} userId The user ID to create a permalink for.
   * @returns {string} A user permalink.
   */
  public static forUser(userId: StringUserID): string {
    return `https://matrix.to/#/${encodeURIComponent(userId)}`;
  }

  /**
   * Creates an event permalink.
   * @param {string} roomIDOrAlias The room ID or alias to create a permalink in.
   * @param {string} eventID The event ID to reference in the permalink.
   * @param {string[]} viaServers The servers to route the permalink through.
   * @returns {string} An event permalink.
   */
  public static forEvent(
    roomIDOrAlias: StringRoomID | StringRoomAlias,
    eventID: StringEventID,
    viaServers: string[] = []
  ): string {
    return `https://matrix.to/#/${encodeURIComponent(
      roomIDOrAlias
    )}/${encodeURIComponent(eventID)}${Permalinks.encodeViaArgs(viaServers)}`;
  }

  /**
   * Parses a permalink URL into usable parts.
   * @param {string} matrixTo The matrix.to URL to parse.
   * @returns {PermalinkParts} The parts of the permalink.
   */
  public static parseUrl(matrixTo: string): ActionResult<PermalinkParts> {
    const matrixToRegexp =
      /^https:\/\/matrix\.to\/#\/(?<entity>[^/?]+)\/?(?<eventId>[^?]+)?(?<query>\?[^]*)?$/;

    const url = matrixToRegexp.exec(matrixTo)?.groups;
    if (!url) {
      return ActionError.Result(`Not a valid matrix.to URL: ${matrixTo}`);
    }
    const viaServers = new URLSearchParams(url.query).getAll('via');
    const eventID = url.eventId && decodeURIComponent(url.eventId);
    if (eventID !== undefined && !isStringEventID(eventID)) {
      return ActionError.Result(`Invalid EventID in matrix.to URL ${eventID}`);
    }
    if (url.entity === undefined) {
      return ActionError.Result(
        `Invalid Entity in matrix.to URL ${url.entity}`
      );
    }
    const entity = decodeURIComponent(url.entity);
    if (entity[0] === '@') {
      if (!isStringUserID(entity)) {
        return ActionError.Result(
          `Invalid User ID in matrix.to URL: ${entity}`
        );
      }
      return Ok({
        userID: entity,
        viaServers: [],
      });
    } else if (entity[0] === '!') {
      if (!isStringRoomID(entity)) {
        return ActionError.Result(`Invalid RoomID in matrix.to URL ${entity}`);
      }
      return Ok({
        roomID: entity,
        ...(eventID === undefined ? { eventID } : {}),
        viaServers,
      });
    } else if (entity[0] === '#') {
      if (!isStringRoomAlias(entity)) {
        return ActionError.Result(
          `Invalid RoomAlias in matrix.to URL ${entity}`
        );
      }
      return Ok({
        roomAlias: entity,
        ...(eventID === undefined ? { eventID } : {}),
        viaServers,
      });
    } else {
      return ActionError.Result(`Unexpected entity in matrix.to URL ${entity}`);
    }
  }
}
