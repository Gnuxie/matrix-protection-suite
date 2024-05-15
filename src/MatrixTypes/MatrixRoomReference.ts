// Copyright (C) 2022 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { StaticDecode, Type } from '@sinclair/typebox';
import { RoomAlias } from './MatrixEntity';
import { Permalinks } from './Permalinks';
import {
  StringEventID,
  StringRoomAlias,
  StringRoomID,
  isStringRoomAlias,
  isStringRoomID,
} from './StringlyTypedMatrix';
import { ActionError, ActionResult, Ok, isError } from '../Interface/Action';

/**
 * A function that can be used by the reference to join a room.
 */
export type JoinRoom = (
  roomIDOrAlias: StringRoomID | StringRoomAlias,
  viaServers?: string[]
) => Promise<ActionResult<StringRoomID>>;
/**
 * A function that can be used by the reference to resolve an alias to a room id.
 */
export type ResolveRoom = (
  roomIDOrAlias: StringRoomID | StringRoomAlias
) => Promise<ActionResult<StringRoomID>>;

export type MatrixRoomReference = MatrixRoomID | MatrixRoomAlias;

// we disable this warning because it's not relevant, we're not making a module
// we're trying to add generic functions to a type.
// Comes at a cost that anyone actually using this from JS and not TS is
// going to be confused.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MatrixRoomReference {
  export function fromAlias(alias: StringRoomAlias): MatrixRoomReference {
    return new MatrixRoomAlias(alias);
  }

  export function fromRoomID(
    roomId: StringRoomID,
    viaServers: string[] = []
  ): MatrixRoomID {
    return new MatrixRoomID(roomId, viaServers);
  }

  /**
   * Create a `MatrixRoomReference` from a room ID or a room alias.
   * @param roomIDOrAlias The room ID or the room alias.
   * @param viaServers If a room ID is being provided, then these server names
   * can be used to find the room.
   */
  export function fromRoomIDOrAlias(
    roomIDOrAlias: StringRoomID | StringRoomAlias,
    viaServers: string[] = []
  ): MatrixRoomReference {
    if (roomIDOrAlias.startsWith('!')) {
      return new MatrixRoomID(roomIDOrAlias, viaServers);
    } else {
      return new MatrixRoomAlias(roomIDOrAlias, viaServers);
    }
  }

  export function fromPermalink(
    link: string
  ): ActionResult<MatrixRoomReference> {
    const partsResult = Permalinks.parseUrl(link);
    if (isError(partsResult)) {
      return partsResult;
    }
    const parts = partsResult.ok;
    if (parts.roomID !== undefined) {
      return Ok(new MatrixRoomID(parts.roomID, parts.viaServers));
    } else if (parts.roomAlias !== undefined) {
      return Ok(new MatrixRoomAlias(parts.roomAlias, parts.viaServers));
    } else {
      return ActionError.Result(
        `There isn't a reference to a room in the URL: ${link}`
      );
    }
  }

  /**
   * Try parse a roomID, roomAlias or a permalink.
   */
  export function fromString(
    string: string
  ): ActionResult<MatrixRoomReference> {
    if (isStringRoomID(string)) {
      return Ok(MatrixRoomReference.fromRoomID(string));
    } else if (isStringRoomAlias(string)) {
      return Ok(MatrixRoomReference.fromRoomIDOrAlias(string));
    } else {
      return MatrixRoomReference.fromPermalink(string);
    }
  }
}
/**
 * This is a universal reference for a matrix room.
 * This is really useful because there are at least 3 ways of referring to a Matrix room,
 * and some of them require extra steps to be useful in certain contexts (aliases, permalinks).
 */
abstract class AbstractMatrixRoomReference {
  protected constructor(
    protected readonly reference: StringRoomID | StringRoomAlias,
    protected readonly viaServers: string[] = []
  ) {}

  public toPermalink(): string {
    return Permalinks.forRoom(this.reference, this.viaServers);
  }

  /**
   * Resolves the reference if necessary (ie it is a room alias) and return a new `MatrixRoomReference`.
   * Maybe in the future this should return a subclass that can only be a RoomID, that will be useful for the config
   * problems we're having...
   * @param client A client that we can use to resolve the room alias.
   * @returns A new MatrixRoomReference that contains the room id.
   */
  public async resolve(client: {
    resolveRoom: ResolveRoom;
  }): Promise<ActionResult<MatrixRoomID>> {
    if (this instanceof MatrixRoomID) {
      return Ok(this);
    } else {
      const alias = new RoomAlias(this.reference);
      const roomID = await client.resolveRoom(this.reference);
      if (isError(roomID)) {
        return roomID;
      }
      return Ok(new MatrixRoomID(roomID.ok, [alias.domain]));
    }
  }

  /**
   * Join the room using the client provided.
   * @param client A matrix client that should join the room.
   * @returns A MatrixRoomReference with the room id of the room which was joined.
   */
  public async joinClient(client: {
    joinRoom: JoinRoom;
  }): Promise<ActionResult<StringRoomID>> {
    return await client.joinRoom(this.toRoomIDOrAlias());
  }

  /**
   * We don't include a `toRoomId` that uses `forceResolveAlias` as this would erase `viaServers`,
   * which will be necessary to use if our homeserver hasn't joined the room yet.
   * @returns A string representing a room id or alias.
   */
  public toRoomIDOrAlias(): StringRoomID | StringRoomAlias {
    return this.reference;
  }

  public getViaServers(): string[] {
    // don't want them mutating the viaServers in this reference.
    return [...this.viaServers];
  }
}

/**
 * A concrete `MatrixRoomReference` that represents only a room ID.
 * @see {@link MatrixRoomReference}.
 */
export class MatrixRoomID extends AbstractMatrixRoomReference {
  public constructor(reference: string, viaServers: string[] = []) {
    if (!isStringRoomID(reference)) {
      throw new TypeError(`invalid reference for roomID ${reference}`);
    }
    super(reference, viaServers);
  }

  public toRoomIDOrAlias(): StringRoomID {
    return this.reference as StringRoomID;
  }
}

/**
 * A concrete `MatrixRoomReference` the represents only a room alias.
 * @see {@link MatrixRoomReference}.
 */
export class MatrixRoomAlias extends AbstractMatrixRoomReference {
  public constructor(reference: string, viaServers: string[] = []) {
    if (!isStringRoomAlias(reference)) {
      throw new TypeError(`invalid reference for RoomAlias ${reference}`);
    }
    super(reference, viaServers);
  }

  public toRoomIDOrAlias(): StringRoomAlias {
    return this.reference as StringRoomAlias;
  }
}

export const Permalink = Type.Transform(Type.String())
  .Decode((value) => {
    const permalinkResult = MatrixRoomReference.fromPermalink(value);
    if (isError(permalinkResult)) {
      throw new TypeError(permalinkResult.error.message);
    } else {
      return permalinkResult.ok;
    }
  })
  .Encode((value) => value.toPermalink());

export type Permalink = StaticDecode<typeof Permalink>;

export type MatrixEventReference = MatrixEventViaRoomID | MatrixEventViaAlias;

// we disable this warning because it's not relevant, we're not making a module
// we're trying to add generic functions to a type.
// Comes at a cost that anyone actually using this from JS and not TS is
// going to be confused.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MatrixEventReference {
  export function fromPermalink(
    link: string
  ): ActionResult<MatrixEventReference> {
    const partsResult = Permalinks.parseUrl(link);
    if (isError(partsResult)) {
      return partsResult;
    }
    const parts = partsResult.ok;
    if (parts.roomID !== undefined && parts.eventID !== undefined) {
      return Ok(
        new MatrixEventViaRoomID(
          new MatrixRoomID(parts.roomID, parts.viaServers),
          parts.eventID
        )
      );
    } else if (parts.roomAlias !== undefined && parts.eventID !== undefined) {
      return Ok(
        new MatrixEventViaAlias(
          new MatrixRoomAlias(parts.roomAlias, parts.viaServers),
          parts.eventID
        )
      );
    } else {
      return ActionError.Result(
        `There isn't a reference to an event in the URL: ${link}`
      );
    }
  }
}

export class MatrixEventViaRoomID {
  public constructor(
    public readonly room: MatrixRoomID,
    public readonly eventID: StringEventID
  ) {
    // nothing to do.
  }

  public get reference() {
    return this.room;
  }
}

export class MatrixEventViaAlias {
  public constructor(
    public readonly alias: MatrixRoomAlias,
    public readonly eventID: StringEventID
  ) {
    // nothing to do.
  }

  public get reference() {
    return this.alias;
  }
}
