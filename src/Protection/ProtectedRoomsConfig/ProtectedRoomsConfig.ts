// Copyright 2019 2022 The Matrix.org Foundation C.I.C.
// Copyright 2022 - 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { ActionResult, Ok, isError } from '../../Interface/Action';
import { MatrixAccountData } from '../../Interface/PersistentMatrixData';
import { MjolnirProtectedRoomsEvent } from './MjolnirProtectedRoomsEvent';
import AwaitLock from 'await-lock';
import {
  LoggableConfig,
  LoggableConfigTracker,
} from '../../Interface/LoggableConfig';
import { RoomResolver } from '../../Client/RoomResolver';
import { Logger } from '../../Logging/Logger';
import {
  MatrixRoomID,
  StringRoomID,
} from '@the-draupnir-project/matrix-basic-types';

const log = new Logger('MjolnirProtectedroomsCofnig');

export interface ProtectedRoomsConfig {
  addRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  removeRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  getProtectedRooms(): MatrixRoomID[];
}

export class MjolnirProtectedRoomsConfig
  implements ProtectedRoomsConfig, LoggableConfig
{
  private readonly writeLock = new AwaitLock();
  private constructor(
    private readonly store: MatrixAccountData<MjolnirProtectedRoomsEvent>,
    private readonly protectedRooms: Map<StringRoomID, MatrixRoomID>,
    /**
     * We use this so that we can keep track of the raw data for logging purposes.
     */
    private rawData: MjolnirProtectedRoomsEvent | undefined,
    loggableConfigTracker: LoggableConfigTracker
  ) {
    loggableConfigTracker.addLoggableConfig(this);
  }
  public static async createFromStore(
    store: MatrixAccountData<MjolnirProtectedRoomsEvent>,
    resolver: RoomResolver,
    loggableConfigTracker: LoggableConfigTracker
  ): Promise<ActionResult<ProtectedRoomsConfig>> {
    const data = await store.requestAccountData();
    if (isError(data)) {
      return data.elaborate(
        `Failed to load ProtectedRoomsConfig when creating ProtectedRoomsConfig`
      );
    }
    const protectedRooms = new Map<StringRoomID, MatrixRoomID>();
    for (const ref of data.ok?.rooms ?? []) {
      const resolvedRef = await resolver.resolveRoom(ref);
      if (isError(resolvedRef)) {
        log.info(`Current config`, data.ok);
        return resolvedRef;
      }
      protectedRooms.set(resolvedRef.ok.toRoomIDOrAlias(), resolvedRef.ok);
    }
    return Ok(
      new MjolnirProtectedRoomsConfig(
        store,
        protectedRooms,
        data.ok,
        loggableConfigTracker
      )
    );
  }

  public getProtectedRooms(): MatrixRoomID[] {
    return [...this.protectedRooms.values()];
  }
  public logCurrentConfig(): void {
    log.info('Current config', this.rawData);
  }
  public async addRoom(room: MatrixRoomID): Promise<ActionResult<void>> {
    await this.writeLock.acquireAsync();
    try {
      const data = {
        rooms: [...this.protectedRooms.keys(), room.toRoomIDOrAlias()],
      };
      const result = await this.store.storeAccountData(data);
      if (isError(result)) {
        return result.elaborate(
          `Failed to add ${room.toPermalink()} to protected rooms set.`
        );
      }
      this.protectedRooms.set(room.toRoomIDOrAlias(), room);
      this.rawData = data;
      return Ok(undefined);
    } finally {
      this.writeLock.release();
    }
  }
  public async removeRoom(room: MatrixRoomID): Promise<ActionResult<void>> {
    await this.writeLock.acquireAsync();
    try {
      const data = {
        rooms: this.getProtectedRooms()
          .map((ref) => ref.toRoomIDOrAlias())
          .filter((roomID) => roomID !== room.toRoomIDOrAlias()),
      };
      const result = await this.store.storeAccountData(data);
      if (isError(result)) {
        return result.elaborate(
          `Failed to remove ${room.toPermalink()} to protected rooms set.`
        );
      }
      this.protectedRooms.delete(room.toRoomIDOrAlias());
      this.rawData = data;
      return Ok(undefined);
    } finally {
      this.writeLock.release();
    }
  }
}
