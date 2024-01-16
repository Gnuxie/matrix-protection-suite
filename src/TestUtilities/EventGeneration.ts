/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

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
  StringRoomID,
  StringUserID,
  isStringRoomID,
} from '../MatrixTypes/StringlyTypedMatrix';

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
  sender = `@${randomUUID()}example.com` as StringUserID,
  room_id = `!${randomUUID}:example.com` as StringRoomID,
  reason = '<no reason supplied>',
  entity = `@${randomUUID()}:example.com`,
  recommendation = Recommendation.Ban,
}: {
  sender?: StringUserID;
  room_id?: StringRoomID;
  reason?: string;
  entity?: string;
  recommendation?: Recommendation;
}): PolicyRuleEvent {
  const rawEventJSON = {
    room_id,
    event_id: `$${randomUUID()}:example.com`,
    origin_server_ts: Date.now(),
    state_key: randomUUID(),
    type: PolicyRuleType.User,
    sender,
    content: {
      entity,
      recommendation,
      reason,
    },
  };
  const decodeResult = Value.Decode(PolicyRuleEvent, rawEventJSON);
  if (isError(decodeResult)) {
    const errors = Value.Errors(PolicyRuleEvent, rawEventJSON);
    throw new TypeError(
      `Something is wrong with the event generator ${errors}`
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
