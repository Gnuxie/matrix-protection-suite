/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019, 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 *
 * However, this file is modified and the modifications in this file
 * are NOT distributed, contributed, committed, or licensed under the Apache License.
 */

import { Static, Type } from '@sinclair/typebox';
import {
  PersistentData,
  RawSchemedData,
  SCHEMA_VERSION_KEY,
} from '../Interface/PersistentData';
import {
  MatrixRoomAlias,
  MatrixRoomID,
  Permalink,
  ResolveRoom,
} from '../MatrixTypes/MatrixRoomReference';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { ActionResult, Ok, isError } from '../Interface/Action';
import { Value } from '../Interface/Value';
import { StringRoomID } from '../MatrixTypes/StringlyTypedMatrix';

export type MjolnirProtectedRoomsEvent = Static<
  typeof MjolnirProtectedRoomsEvent
>;
export const MjolnirProtectedRoomsEvent = Type.Object({
  rooms: Type.Array(Permalink),
});

export const CMjolnirProtectedRoomsEvent = TypeCompiler.Compile(
  MjolnirProtectedRoomsEvent
);

export function isMjolnirProtectedRoomsEvent(
  value: unknown
): value is MjolnirProtectedRoomsEvent {
  return CMjolnirProtectedRoomsEvent.Check(value);
}

export type ProtectedRoomsConfigEvent = Static<
  typeof ProtectedRoomsConfigEvent
>;

const ProtectedRoomDescriptor = Type.Object({
  reference: Permalink,
});

export const ProtectedRoomsConfigEvent = Type.Object({
  rooms: Type.Array(ProtectedRoomDescriptor),
  spaces: Type.Array(ProtectedRoomDescriptor),
});

export const CProtectedRoomsConfigEvent = TypeCompiler.Compile(
  ProtectedRoomsConfigEvent
);

export function isProtectedRoomsConfigEvent(
  value: unknown
): value is ProtectedRoomsConfigEvent {
  return CProtectedRoomsConfigEvent.Check(value);
}

export interface ProtectedRoomsConfig {
  readonly allRooms: MatrixRoomID[];
  addRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  removeRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  addSpace(room: MatrixRoomID): Promise<ActionResult<void>>;
  removeSpace(room: MatrixRoomID): Promise<ActionResult<void>>;
}

export abstract class AbstractProtectedRoomsConfig
  extends PersistentData<ProtectedRoomsConfigEvent & RawSchemedData>
  implements ProtectedRoomsConfig
{
  protected readonly explicitlyProtectedRooms = new Map<
    StringRoomID,
    MatrixRoomID
  >();
  protected async handleDataChange(
    client: { resolveRoom: ResolveRoom },
    rawData: ProtectedRoomsConfigEvent
  ): Promise<void> {
    const decodedDataResult = Value.Decode(ProtectedRoomsConfigEvent, rawData);
    if (isError(decodedDataResult)) {
      throw new TypeError('Somehow we have stored invalid data');
    }
    this.explicitlyProtectedRooms.clear();
    for (const { reference } of decodedDataResult.ok.rooms) {
      const room =
        reference instanceof MatrixRoomAlias
          ? await reference.resolve(client)
          : reference;
      this.explicitlyProtectedRooms.set(room.toRoomIdOrAlias(), room);
    }
  }
  public get allRooms(): MatrixRoomID[] {
    return [...this.explicitlyProtectedRooms.values()];
  }
  public async addRoom(room: MatrixRoomID): Promise<ActionResult<void>> {
    return await this.storePersistentData({
      rooms: [
        ...[...this.explicitlyProtectedRooms.values()].map((room) => {
          return { reference: room.toPermalink() };
        }),
        { reference: room.toPermalink() },
      ],
      spaces: [],
      [SCHEMA_VERSION_KEY]: 1,
    });
  }
  public async removeRoom(room: MatrixRoomID): Promise<ActionResult<void>> {
    return await this.storePersistentData({
      rooms: [...this.explicitlyProtectedRooms.values()]
        .filter((roomID) => roomID.toRoomIdOrAlias() !== room.toRoomIdOrAlias())
        .map((room) => {
          return { reference: room.toPermalink() };
        }),
      spaces: [],
      [SCHEMA_VERSION_KEY]: 1,
    });
  }
  addSpace(_room: MatrixRoomID): Promise<ActionResult<void>> {
    throw new Error('Method not implemented.');
  }
  removeSpace(_room: MatrixRoomID): Promise<ActionResult<void>> {
    throw new Error('Method not implemented.');
  }
  protected readonly isAllowedToInferNoVersionAsZero = true;
  protected readonly upgradeSchema = [
    async (
      mjolnirData: RawSchemedData
    ): Promise<ProtectedRoomsConfigEvent & RawSchemedData> => {
      if (!isMjolnirProtectedRoomsEvent(mjolnirData)) {
        throw TypeError('Mjolnir data is corrupted');
      }
      return {
        rooms: mjolnirData.rooms.map((room) => {
          return { reference: room };
        }),
        spaces: [],
        [SCHEMA_VERSION_KEY]: 1,
      };
    },
  ];
  protected readonly downgradeSchema = [
    async (
      protectedRoomsConfigEvent: RawSchemedData
    ): Promise<MjolnirProtectedRoomsEvent & RawSchemedData> => {
      if (!isProtectedRoomsConfigEvent(protectedRoomsConfigEvent)) {
        throw new TypeError('protected rooms config data is corrupted');
      }
      return {
        rooms: protectedRoomsConfigEvent.rooms.map(
          (roomConfig) => roomConfig.reference
        ),
        [SCHEMA_VERSION_KEY]: 0,
      };
    },
  ];

  public async createFirstData(): Promise<
    ActionResult<ProtectedRoomsConfigEvent & RawSchemedData>
  > {
    const data = {
      rooms: [],
      spaces: [],
      [SCHEMA_VERSION_KEY]: 1,
    };
    const result = await this.storePersistentData(data);
    if (isError(result)) {
      return result;
    }
    return Ok(data);
  }
}
