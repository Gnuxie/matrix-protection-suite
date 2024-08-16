// Copyright (C) 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ProtectedRoomsConfig } from './ProtectedRoomsConfig';
import { ActionResult, Ok } from '../../Interface/Action';
import {
  StringRoomID,
  MatrixRoomID,
} from '@the-draupnir-project/matrix-basic-types';

export class AbstractProtectedRoomsConfig
  implements Omit<ProtectedRoomsConfig, 'addRoom' | 'removeRoom'>
{
  private readonly protectedRooms = new Map<StringRoomID, MatrixRoomID>();
  public constructor(rooms: MatrixRoomID[]) {
    rooms.forEach((room) =>
      this.protectedRooms.set(room.toRoomIDOrAlias(), room)
    );
  }
  public getProtectedRooms(): MatrixRoomID[] {
    return [...this.protectedRooms.values()];
  }

  isProtectedRoom(roomID: StringRoomID): boolean {
    return this.protectedRooms.has(roomID);
  }
  getProtectedRoom(roomID: StringRoomID): MatrixRoomID | undefined {
    return this.protectedRooms.get(roomID);
  }
  protected addRoom(room: MatrixRoomID): void {
    this.protectedRooms.set(room.toRoomIDOrAlias(), room);
  }
  protected removeRoom(room: MatrixRoomID): void {
    this.protectedRooms.delete(room.toRoomIDOrAlias());
  }
}

export class FakeProtectedRoomsConfig
  extends AbstractProtectedRoomsConfig
  implements ProtectedRoomsConfig
{
  public constructor(rooms: MatrixRoomID[]) {
    super(rooms);
  }
  public async addRoom(room: MatrixRoomID): Promise<ActionResult<void>> {
    super.addRoom(room);
    return Ok(undefined);
  }
  public async removeRoom(room: MatrixRoomID): Promise<ActionResult<void>> {
    super.removeRoom(room);
    return Ok(undefined);
  }
}
