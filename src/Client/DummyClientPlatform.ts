// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Ok } from '../Interface/Action';
import {
  MatrixRoomAlias,
  MatrixRoomReference,
} from '../MatrixTypes/MatrixRoomReference';
import {
  StringRoomAlias,
  StringRoomID,
  isStringRoomID,
} from '../MatrixTypes/StringlyTypedMatrix';
import { RoomJoiner } from './RoomJoiner';

export async function resolveRoomFake(roomID: MatrixRoomReference | string) {
  if (typeof roomID === 'string') {
    if (!isStringRoomID(roomID)) {
      throw new TypeError(`Fake can't deal with aliases.`);
    } else {
      return Ok(MatrixRoomReference.fromRoomID(roomID));
    }
  } else if (roomID instanceof MatrixRoomAlias) {
    throw new TypeError(`Fake can't deal with aliases.`);
  } else {
    return Ok(roomID);
  }
}

export const DummyRoomJoiner: RoomJoiner = Object.freeze({
  async joinRoom(room: MatrixRoomReference | StringRoomAlias | StringRoomID) {
    return await resolveRoomFake(room);
  },
  resolveRoom: resolveRoomFake,
});
