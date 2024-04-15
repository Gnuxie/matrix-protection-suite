// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { randomUUID } from 'crypto';
import { PolicyRuleEvent, PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { Recommendation } from '../PolicyList/PolicyRule';
import { Value } from '../Interface/Value';
import { isError } from '../Interface/Action';
import {
  MatrixRoomID,
  MatrixRoomReference,
} from '../MatrixTypes/MatrixRoomReference';
import {
  StringEventID,
  StringRoomID,
  StringUserID,
  isStringEventID,
  isStringRoomID,
  isStringUserID,
} from '../MatrixTypes/StringlyTypedMatrix';
import { buildPolicyEvent } from '../PolicyList/PolicyRuleEventBuilder';

export function randomRawEvent(sender: string, room_id: string): unknown {
  const rawEventJSON = {
    room_id,
    sender,
    event_id: `$${randomUUID()}:example.com`,
    origin_server_ts: Date.now(),
    type: 'm.room.message',
    content: {
      body: `${randomUUID()}`,
      msgtype: 'm.text',
    },
  };
  return rawEventJSON;
}

export function makePolicyRuleUserEvent({
  sender = randomUserID(),
  room_id = `!${randomUUID()}:example.com` as StringRoomID,
  reason = '<no reason supplied>',
  entity = randomUserID(),
  recommendation = Recommendation.Ban,
  state_key,
  copyFrom,
  remove,
}: {
  sender?: StringUserID;
  room_id?: StringRoomID;
  reason?: string;
  entity?: string;
  recommendation?: Recommendation;
  state_key?: string;
  copyFrom?: PolicyRuleEvent;
  remove?: PolicyRuleEvent;
}): PolicyRuleEvent {
  const description = buildPolicyEvent({
    state_key,
    type: PolicyRuleType.User,
    content: {
      entity,
      recommendation,
      reason,
    },
    copyFrom,
    remove,
  });
  const rawEventJSON = {
    room_id,
    event_id: randomEventID(),
    origin_server_ts: Date.now(),
    state_key: description.state_key,
    type: description.type,
    sender,
    content: description.content ?? {},
  };
  const decodeResult = Value.Decode(PolicyRuleEvent, rawEventJSON);
  if (isError(decodeResult)) {
    const errors = [...Value.Errors(PolicyRuleEvent, rawEventJSON)];
    throw new TypeError(
      `Something is wrong with the event generator [${errors.toString()}]`
    );
  } else {
    return decodeResult.ok;
  }
}

export function randomPolicyRuleEvent(
  sender: StringUserID,
  room_id: StringRoomID
): PolicyRuleEvent {
  return makePolicyRuleUserEvent({
    sender,
    room_id,
  });
}

export function randomRoomID(viaServers: string[]): MatrixRoomID {
  const roomID = `!${randomUUID()}:example.com`;
  if (!isStringRoomID(roomID)) {
    throw new TypeError(`RoomID generator is wrong`);
  }
  return MatrixRoomReference.fromRoomID(roomID, viaServers);
}

export function randomUserID(): StringUserID {
  const userID = `@${randomUUID()}:example.com`;
  if (!isStringUserID(userID)) {
    throw new TypeError(`UserID generator is wrong`);
  }
  return userID;
}

export function randomEventID(): StringEventID {
  const eventID = `$${randomUUID()}:example.com`;
  if (!isStringEventID(eventID)) {
    throw new TypeError(`EventID generator is wrong`);
  }
  return eventID;
}
