// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { RoomBanner } from './RoomBanner';
import { RoomCreator } from './RoomCreator';
import { RoomEventRedacter } from './RoomEventRedacter';
import { RoomEventRelationsGetter } from './RoomEventRelationsGetter';
import { RoomInviter } from './RoomInviter';
import { RoomJoiner } from './RoomJoiner';
import { RoomKicker } from './RoomKicker';
import { RoomMessageSender } from './RoomMessageSender';
import { RoomResolver } from './RoomResolver';
import { RoomStateEventSender } from './RoomStateEventSender';
import { RoomUnbanner } from './RoomUnbanner';

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
  toRoomBanner(): RoomBanner;
  toRoomCreator(): RoomCreator;
  toRoomEventRedacter(): RoomEventRedacter;
  toRoomEventRelationsGetter(): RoomEventRelationsGetter;
  toRoomInviter(): RoomInviter;
  toRoomJoiner(): RoomJoiner;
  toRoomKicker(): RoomKicker;
  toRoomResolver(): RoomResolver;
  // TODO: Ideally we'd accept allowed state types here, so we can easily attenuate
  // which types can be sent.
  toRoomStateEventSender(): RoomStateEventSender;
  toRoomUnbanner(): RoomUnbanner;
  toRoomMessageSender(): RoomMessageSender;
}
