// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { isError, isOk } from '../Interface/Action';
import { DecodeException } from '../Interface/Value';
import { randomRawEvent, randomRoomID } from '../TestUtilities/EventGeneration';
import { DefaultEventDecoder } from './EventDecoder';

test('Raw events are parsed correctly', function () {
  const room = randomRoomID(['example.org']);
  const nRules = 25;
  const rawEvents = [...Array(nRules)].map((_) =>
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
  expect(decodeResult.error.errors.length).toBe(1);
});
