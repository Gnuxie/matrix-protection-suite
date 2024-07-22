// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: MIT

import { isError } from '../Interface/Action';
import { MatrixRoomReference } from './MatrixRoomReference';

it('Parses a MatrixRoomID', function () {
  const url = 'https://matrix.to/#/!foo:example.com?via=example.com';
  const parseResult = MatrixRoomReference.fromPermalink(url);
  if (isError(parseResult)) {
    throw new TypeError(`Stuff is broken mare`);
  }
  expect(parseResult.ok.toRoomIDOrAlias()).toBe('!foo:example.com');
});
