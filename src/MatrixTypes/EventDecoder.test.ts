// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { isError, isOk } from '../Interface/Action';
import { DecodeException, Value } from '../Interface/Value';
import { randomRawEvent, randomRoomID } from '../TestUtilities/EventGeneration';
import { DefaultEventDecoder } from './EventDecoder';
import { PolicyRuleEvent } from './PolicyEvents';

test('Raw events are parsed correctly', function () {
  const room = randomRoomID(['example.org']);
  const nRules = 25;
  const rawEvents = [...(Array(nRules) as unknown[])].map((_) =>
    randomRawEvent('@test:example.com', room.toRoomIDOrAlias())
  );
  const parsedEventsResult = rawEvents.map(
    DefaultEventDecoder.decodeEvent.bind(DefaultEventDecoder)
  );
  expect(parsedEventsResult.every((result) => isOk(result))).toBe(true);
});

test('Parsing error information is genuinly useful', function () {
  const eventWithoutID = randomRawEvent(
    '@test:example.com',
    '!test:example.com'
  );
  if (typeof eventWithoutID !== 'object' || eventWithoutID === null) {
    throw new TypeError('Test was not setup correctly');
  }
  if ('event_id' in eventWithoutID) {
    eventWithoutID.event_id = undefined;
  }
  const decodeResult = DefaultEventDecoder.decodeEvent(eventWithoutID);
  expect(isError(decodeResult)).toBe(true);
  if (isOk(decodeResult)) {
    throw new TypeError('The decode result should be an error at this point');
  }
  expect(decodeResult.error).toBeInstanceOf(DecodeException);
  if (!(decodeResult.error instanceof DecodeException)) {
    throw new TypeError(
      'The decode result should be decode exception at this point'
    );
  }
  // We get a duplicate from the Intersect schema
  // https://github.com/sinclairzx81/typebox/issues/825#issuecomment-2070638733
  expect(decodeResult.error.errors.length).toBe(2);
});

test('Policy List event with leftover reason', function () {
  const rawEvent = {
    content: {
      reason: 'not a scammer, no idea what he was thinking',
    },
    origin_server_ts: 1693351663899,
    room_id: '!QzNmKfDhzCQFDqmUhl:matrix.org',
    sender: '@anti-scam:matrix.org',
    state_key: 'rule:@stoere:projectsegfau.lt',
    type: 'm.policy.rule.user',
    unsigned: {
      replaces_state: '$oyUATFoZDKOF6csFDXBWAkv38-VCLuMw3UTwVcNT6D0',
      age: 20453623176,
    },
    event_id: '$1bcs953wT9lf_aXNEjxPOS9I94GvZvWs-TdXJTxDn6w',
    user_id: '@anti-scam:matrix.org',
    age: 20453623176,
    replaces_state: '$oyUATFoZDKOF6csFDXBWAkv38-VCLuMw3UTwVcNT6D0',
  };
  const result = Value.Decode(PolicyRuleEvent, rawEvent);
  expect(result.isOkay).toBeFalsy();
});
