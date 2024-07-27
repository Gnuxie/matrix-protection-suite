// Copyright 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { randomRoomID } from '../TestUtilities/EventGeneration';
import {
  StringRoomAlias,
  StringUserID,
  isStringRoomAlias,
  isStringRoomID,
  isStringUserID,
  roomAliasLocalpart,
  serverName,
  userLocalpart,
} from './StringlyTypedMatrix';

test('isStringUserID', function () {
  expect(isStringUserID('@foo:localhost:9999')).toBe(true);
  expect(isStringUserID('@foo@mastodon.social')).toBe(false);
});

test('StringUserID serverName', function () {
  expect(serverName('@foo:localhost:9999' as StringUserID)).toBe(
    'localhost:9999'
  );
});

test('StringUserID localpart', function () {
  expect(userLocalpart('@foo:localhost:9999' as StringUserID)).toBe('foo');
});

test('StringRoomID', function () {
  expect(isStringRoomID(randomRoomID([]).toRoomIDOrAlias())).toBe(true);
  expect(isStringRoomID('@foo:localhost:9999')).toBe(false);
});

test('StringRoomAlias', function () {
  expect(isStringRoomAlias('#foo:example.com')).toBe(true);
  expect(isStringRoomAlias('!foo:example.com')).toBe(false);
});

test('StringRoomAlias roomAliasLocalpart', function () {
  expect(roomAliasLocalpart('#foo:example.com' as StringRoomAlias)).toBe('foo');
});
