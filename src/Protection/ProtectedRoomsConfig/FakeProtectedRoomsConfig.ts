/**
 * Copyright (C) 2023-2024 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import EventEmitter from 'events';
import { ProtectedRoomsConfig } from './ProtectedRoomsConfig';
import { StringRoomID } from '../../MatrixTypes/StringlyTypedMatrix';
import { MatrixRoomID } from '../../MatrixTypes/MatrixRoomReference';
import { ActionResult, Ok } from '../../Interface/Action';
import { ChangeType } from '../../PolicyList/PolicyRuleChange';

export class AbstractProtectedRoomsConfig
  extends EventEmitter
  implements
    Omit<
      ProtectedRoomsConfig,
      'addRoom' | 'removeRoom' | 'on' | 'off' | 'emit'
    >
{
  private readonly protectedRooms = new Map<StringRoomID, MatrixRoomID>();
  public constructor(rooms: MatrixRoomID[]) {
    super();
    rooms.forEach((room) =>
      this.protectedRooms.set(room.toRoomIDOrAlias(), room)
    );
  }
  public get allRooms(): MatrixRoomID[] {
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
    this.emit('change', room, ChangeType.Added);
  }
  protected removeRoom(room: MatrixRoomID): void {
    this.protectedRooms.delete(room.toRoomIDOrAlias());
    this.emit('change', room, ChangeType.Removed);
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
