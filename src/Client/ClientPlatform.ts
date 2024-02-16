// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { RoomCreator } from './RoomCreator';
import { RoomJoiner } from './RoomJoiner';
import { RoomResolver } from './RoomResolver';

/**
 * A `ClientPlatform` has all the capabilities associated with a client.
 * This might end up forming a tree in the future, where you go down to
 * narrow to attenuate furhter.
 * Very little should accept the entire client platform as an argument,
 * only the individual capabilities. An example situations where this would
 * be acceptable is a bot plugin platform itself that needs to setup lots
 * of dependencies.
 */
export interface ClientPlatform {
  toRoomCreator(): RoomCreator;
  toRoomJoiner(): RoomJoiner;
  toRoomResolver(): RoomResolver;
}
