/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import {
  PolicyRuleEvent,
  PolicyRuleType,
} from '../../MatrixTypes/PolicyEvents';
import { Value } from '../../Interface/Value';
import { randomUUID } from 'crypto';
import { Recommendation } from '../../PolicyList/PolicyRule';
import { isError } from '../../Interface/Action';
import { isStringRoomID } from '../../MatrixTypes/StringlyTypedMatrix';
import {
  MatrixRoomID,
  MatrixRoomReference,
} from '../../MatrixTypes/MatrixRoomReference';

export function randomRawEvent(sender: string, room_id: string): unknown {
  const rawEventJSON = {
    room_id,
    sender,
    event_id: `$${randomUUID()}:example.com`,
    origin_server_ts: Date.now(),
    type: 'm.room.message',
    content: {
      body: `${randomUUID}`,
      type: 'm.text',
    },
  };
  return rawEventJSON;
}

export function randomPolicyRuleEvent(
  sender: string,
  room_id: string
): PolicyRuleEvent {
  const rawEventJSON = {
    room_id,
    event_id: `$${randomUUID()}:example.com`,
    origin_server_ts: Date.now(),
    state_key: randomUUID(),
    type: PolicyRuleType.User,
    sender,
    content: {
      entity: `@${randomUUID()}:example.com`,
      recommendation: Recommendation.Ban,
      reason: `${randomUUID}`,
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

export function randomRoomID(viaServers: string[]): MatrixRoomID {
  const roomID = `!${randomUUID()}:example.com`;
  if (!isStringRoomID(roomID)) {
    throw new TypeError(`RoomID generator is wrong`);
  }
  return MatrixRoomReference.fromRoomID(roomID, viaServers);
}
