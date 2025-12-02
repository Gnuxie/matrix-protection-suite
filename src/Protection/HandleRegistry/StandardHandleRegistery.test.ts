// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0

import { Ok } from '@gnuxie/typescript-result';
import { StandardLifetime } from '../../Interface/Lifetime';
import { HandleRegistry, HandleRegistrySemantics } from './HandleRegistry';
import { StandardHandleRegistry } from './StandardHandleRegistry';

it('HandleRegistrySemantics are implemented for the standard instance', async () => {
  await using lifetime = new StandardLifetime<HandleRegistry>();
  await HandleRegistrySemantics.check(async () => {
    return Ok(new StandardHandleRegistry({}, lifetime));
  });
});
