/**
 * Copyright (C) 2022 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { StaticDecode, Type } from '@sinclair/typebox';
import { RoomAlias } from './MatrixEntity';
import { Permalinks } from './Permalinks';
import {
  StringRoomAlias,
  StringRoomID,
  isStringRoomAlias,
  isStringRoomID,
} from './StringlyTypedMatrix';

/**
 * A function that can be used by the reference to join a room.
 */
export type JoinRoom = (
  roomIdOrAlias: string,
  viaServers?: string[]
) => Promise<StringRoomID>;
/**
 * A function that can be used by the reference to resolve an alias to a room id.
 */
export type ResolveRoom = (roomIdOrAlias: string) => Promise<StringRoomID>;

export type MatrixRoomReference = MatrixRoomID | MatrixRoomAlias;

// we disable this warning because it's not relevant, we're not making a module
// we're trying to add generic functions to a type.
// Comes at a cost that anyone actually using this from JS and not TS is
// going to be confused.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MatrixRoomReference {
  export function fromAlias(alias: string): MatrixRoomReference {
    return new MatrixRoomAlias(alias);
  }

  export function fromRoomId(
    roomId: string,
    viaServers: string[] = []
  ): MatrixRoomID {
    return new MatrixRoomID(roomId, viaServers);
  }

  /**
   * Create a `MatrixRoomReference` from a room ID or a room alias.
   * @param roomIdOrAlias The room ID or the room alias.
   * @param viaServers If a room ID is being provided, then these server names
   * can be used to find the room.
   */
  export function fromRoomIdOrAlias(
    roomIdOrAlias: string,
    viaServers: string[] = []
  ): MatrixRoomReference {
    if (roomIdOrAlias.startsWith('!')) {
      return new MatrixRoomID(roomIdOrAlias, viaServers);
    } else {
      return new MatrixRoomAlias(roomIdOrAlias, viaServers);
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
    protected readonly reference: string,
    protected readonly viaServers: string[] = []
  ) {}

  public toPermalink(): string {
    return Permalinks.forRoom(this.reference, this.viaServers);
  }

  /**
   * Create a reference from a permalink.
   * @param permalink A permalink to a matrix room.
   * @returns A MatrixRoomReference.
   */
  public static fromPermalink(permalink: string): MatrixRoomReference {
    const parts = Permalinks.parseUrl(permalink);
    if (parts.roomIdOrAlias === undefined) {
      throw new TypeError(
        `There is no room id or alias in the permalink ${permalink}`
      );
    }
    return MatrixRoomReference.fromRoomIdOrAlias(
      parts.roomIdOrAlias,
      parts.viaServers
    );
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
  }): Promise<MatrixRoomID> {
    if (this instanceof MatrixRoomID) {
      return this;
    } else {
      const alias = new RoomAlias(this.reference);
      const roomId = await client.resolveRoom(this.reference);
      return new MatrixRoomID(roomId, [alias.domain]);
    }
  }

  /**
   * Join the room using the client provided.
   * @param client A matrix client that should join the room.
   * @returns A MatrixRoomReference with the room id of the room which was joined.
   */
  public async joinClient(client: {
    joinRoom: JoinRoom;
  }): Promise<MatrixRoomID> {
    if (this instanceof MatrixRoomID) {
      await client.joinRoom(this.reference, this.viaServers);
      return this;
    } else {
      const roomId = await client.joinRoom(this.reference);
      const alias = new RoomAlias(this.reference);
      // best we can do with the information we have.
      return new MatrixRoomID(roomId, [alias.domain]);
    }
  }

  /**
   * We don't include a `toRoomId` that uses `forceResolveAlias` as this would erase `viaServers`,
   * which will be necessary to use if our homeserver hasn't joined the room yet.
   * @returns A string representing a room id or alias.
   */
  public toRoomIdOrAlias(): string {
    return this.reference;
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

  public toRoomIdOrAlias(): StringRoomID {
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

  public toRoomIdOrAlias(): StringRoomAlias {
    return this.reference as StringRoomAlias;
  }
}

export const Permalink = Type.Transform(Type.String())
  .Decode((value) => AbstractMatrixRoomReference.fromPermalink(value))
  .Encode((value) => value.toPermalink());

export type Permalink = StaticDecode<typeof Permalink>;
